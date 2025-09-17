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

    // 1. Verificar no banco primeiro (mais confiável)
    console.log('📊 [CHECK-PAYMENT] Verificando no banco de dados...')
    const { data: transaction, error: dbError } = await supabase
      .from('transacoes')
      .select('*')
      .eq('mp_payment_id', payment_id)
      .single()

    if (!dbError && transaction) {
      console.log('📋 [CHECK-PAYMENT] Transação encontrada no banco:', transaction.status)
      
      if (transaction.status === 'approved') {
        console.log('✅ [CHECK-PAYMENT] Pagamento aprovado no banco!')
        return new Response(
          JSON.stringify({ 
            status: 'approved',
            approved: true,
            source: 'database',
            transaction: transaction,
            message: 'Pagamento confirmado! Redirecionando para WhatsApp...'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        console.log('⏳ [CHECK-PAYMENT] Pagamento ainda não aprovado no banco:', transaction.status)
        // Não retornar ainda, vamos verificar na API também
        console.log('🔄 [CHECK-PAYMENT] Verificando também na API do MP...')
      }
    } else {
      console.log('⚠️ [CHECK-PAYMENT] Transação não encontrada no banco, consultando API...')
    }

    // 2. Se não encontrou no banco, verificar na API do Mercado Pago
    console.log('🔍 [CHECK-PAYMENT] Consultando API Mercado Pago...')
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        'Authorization': `Bearer APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050`,
        'Content-Type': 'application/json'
      }
    })

    if (!mpResponse.ok) {
      console.error('❌ [CHECK-PAYMENT] Erro MP API:', mpResponse.status, mpResponse.statusText)
      
      // Se temos dados do banco mas API falhou, usar dados do banco
      if (transaction) {
        return new Response(
          JSON.stringify({ 
            status: transaction.status,
            approved: transaction.status === 'approved',
            source: 'database_fallback',
            message: transaction.status === 'approved' 
              ? 'Pagamento confirmado! Redirecionando para WhatsApp...'
              : 'Pagamento ainda não confirmado. Aguarde alguns segundos e tente novamente.'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          status: 'error',
          approved: false,
          source: 'api_error',
          message: 'Erro ao consultar status. Aguarde alguns segundos e tente novamente.'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const paymentData = await mpResponse.json()
    console.log('💰 [CHECK-PAYMENT] Status na API:', paymentData.status)
    console.log('📊 [CHECK-PAYMENT] Dados completos da API:', JSON.stringify(paymentData, null, 2))

    // 3. Atualizar/criar transação no banco com dados da API
    if (paymentData.status === 'approved') {
      console.log('💾 [CHECK-PAYMENT] Salvando aprovação no banco...')
      
      const externalRef = paymentData.external_reference
      if (externalRef && externalRef.startsWith('tex_')) {
        const parts = externalRef.split('_')
        if (parts.length >= 3) {
          const { error: upsertError } = await supabase
            .from('transacoes')
            .upsert({
              cliente_id: parts[1],
              prestador_id: parts[2],
              mp_payment_id: payment_id,
              status: paymentData.status,
              amount: paymentData.transaction_amount || 2.02,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'mp_payment_id'
            })
          
          if (upsertError) {
            console.error('❌ [CHECK-PAYMENT] Erro ao salvar no banco:', upsertError)
          } else {
            console.log('✅ [CHECK-PAYMENT] Transação salva/atualizada no banco')
          }
        }
      }
    }

    // 4. Retornar resposta baseada no status da API
    const isApproved = paymentData.status === 'approved'
    
    return new Response(
      JSON.stringify({ 
        status: paymentData.status,
        approved: isApproved,
        source: 'mercado_pago_api',
        payment_data: {
          id: paymentData.id,
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          transaction_amount: paymentData.transaction_amount,
          date_created: paymentData.date_created,
          date_approved: paymentData.date_approved
        },
        message: isApproved 
          ? 'Pagamento confirmado! Redirecionando para WhatsApp...'
          : `Pagamento ainda não confirmado (${paymentData.status}). Aguarde alguns segundos e tente novamente.`
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
        status: 'error',
        approved: false,
        source: 'internal_error',
        message: 'Erro na verificação. Aguarde alguns segundos e tente novamente.',
        error: error.message
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

console.log('🚀 [CHECK-PAYMENT] Edge Function check-payment iniciada!')