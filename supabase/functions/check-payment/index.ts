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
    console.log('🔍 Verificando status de pagamento...')
    
    const { payment_id } = await req.json()
    console.log('💳 Payment ID:', payment_id)

    if (!payment_id) {
      throw new Error('Payment ID é obrigatório')
    }

    // Conectar ao Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Verificar no banco primeiro
    console.log('📊 Verificando no banco...')
    const { data: transaction, error: dbError } = await supabase
      .from('transacoes')
      .select('*')
      .eq('mp_payment_id', payment_id)
      .single()

    if (!dbError && transaction?.status === 'approved') {
      console.log('✅ Pagamento já aprovado no banco')
      return new Response(
        JSON.stringify({ 
          status: 'approved',
          source: 'database',
          transaction 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 2. Verificar na API do Mercado Pago
    console.log('🔍 Consultando API Mercado Pago...')
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        'Authorization': `Bearer APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050`,
        'Content-Type': 'application/json'
      }
    })

    if (!mpResponse.ok) {
      throw new Error(`Erro MP API: ${mpResponse.status}`)
    }

    const paymentData = await mpResponse.json()
    console.log('💰 Status MP:', paymentData.status)

    // 3. Atualizar banco se necessário
    if (paymentData.status === 'approved' && (!transaction || transaction.status !== 'approved')) {
      console.log('💾 Atualizando status no banco...')
      
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
            await supabase.from('transacoes').insert({
              cliente_id: parts[1],
              prestador_id: parts[2],
              mp_payment_id: payment_id,
              status: paymentData.status,
              amount: paymentData.transaction_amount || 2.02
            })
            console.log('✅ Transação criada')
          }
        }
      } else {
        // Atualizar existente
        await supabase
          .from('transacoes')
          .update(updateData)
          .eq('mp_payment_id', payment_id)
        console.log('✅ Transação atualizada')
      }
    }

    return new Response(
      JSON.stringify({ 
        status: paymentData.status,
        source: 'mercado_pago',
        payment_data: paymentData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Erro na verificação:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro na verificação',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

console.log('🚀 Edge Function check-payment iniciada!')