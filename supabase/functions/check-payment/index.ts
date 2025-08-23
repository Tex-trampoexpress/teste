import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    console.log('🔍 [CHECK-PAYMENT] Verificando status de pagamento...')
    
    const { payment_id } = await req.json()
    console.log('💳 [CHECK-PAYMENT] Payment ID:', payment_id)

    if (!payment_id) {
      throw new Error('Payment ID é obrigatório')
    }

    // Conectar ao Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Verificar no banco primeiro
    console.log('📊 [CHECK-PAYMENT] Verificando no banco...')
    const { data: transaction, error: dbError } = await supabase
      .from('transacoes')
      .select('*')
      .eq('mp_payment_id', payment_id)
      .single()

    if (!dbError && transaction?.status === 'approved') {
      console.log('✅ [CHECK-PAYMENT] Pagamento já aprovado no banco')
      return new Response(
        JSON.stringify({ 
          status: 'approved',
          source: 'database',
          transaction,
          message: 'Pagamento confirmado no banco de dados'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 2. Verificar na API do Mercado Pago
    console.log('🔍 [CHECK-PAYMENT] Consultando API Mercado Pago...')
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        'Authorization': `Bearer APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050`,
        'Content-Type': 'application/json'
      }
    })

    if (!mpResponse.ok) {
      console.error('❌ [CHECK-PAYMENT] Erro MP API:', mpResponse.status)
      
      // Se não conseguir acessar a API, retornar status do banco
      return new Response(
        JSON.stringify({ 
          status: transaction?.status || 'pending',
          source: 'database_fallback',
          message: 'API indisponível, consultando banco de dados'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const paymentData = await mpResponse.json()
    console.log('💰 [CHECK-PAYMENT] Status MP:', paymentData.status)
    console.log('📊 [CHECK-PAYMENT] Dados completos:', JSON.stringify(paymentData, null, 2))

    // 3. Atualizar banco se necessário
    if (paymentData.status === 'approved' && (!transaction || transaction.status !== 'approved')) {
      console.log('💾 [CHECK-PAYMENT] Atualizando status no banco...')
      
      const updateData = {
        status: paymentData.status,
        updated_at: new Date().toISOString()
      }

      if (!transaction) {
        // Criar nova transação se não existir
        const externalRef = paymentData.external_reference
        if (externalRef && externalRef.startsWith('tex_')) {
          const parts = externalRef.split('_')
          if (parts.length >= 3) {
            const { error: insertError } = await supabase.from('transacoes').insert({
              cliente_id: parts[1],
              prestador_id: parts[2],
              mp_payment_id: payment_id,
              status: paymentData.status,
              amount: paymentData.transaction_amount || 2.02
            })
            
            if (insertError) {
              console.error('❌ [CHECK-PAYMENT] Erro ao criar transação:', insertError)
            } else {
              console.log('✅ [CHECK-PAYMENT] Transação criada')
            }
          }
        }
      } else {
        // Atualizar existente
        const { error: updateError } = await supabase
          .from('transacoes')
          .update(updateData)
          .eq('mp_payment_id', payment_id)
          
        if (updateError) {
          console.error('❌ [CHECK-PAYMENT] Erro ao atualizar transação:', updateError)
        } else {
          console.log('✅ [CHECK-PAYMENT] Transação atualizada')
        }
      }
    }

    // 4. Retornar resposta final
    const finalStatus = paymentData.status
    console.log('📤 [CHECK-PAYMENT] Retornando status final:', finalStatus)

    return new Response(
      JSON.stringify({ 
        status: finalStatus,
        source: 'mercado_pago',
        payment_data: {
          id: paymentData.id,
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          transaction_amount: paymentData.transaction_amount,
          date_created: paymentData.date_created,
          date_approved: paymentData.date_approved
        },
        message: `Status atual: ${finalStatus}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ [CHECK-PAYMENT] Erro na verificação:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro na verificação',
        message: error.message,
        status: 'error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

console.log('🚀 [CHECK-PAYMENT] Edge Function check-payment iniciada!')