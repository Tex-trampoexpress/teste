import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface MercadoPagoWebhook {
  id: number
  live_mode: boolean
  type: string
  date_created: string
  application_id: number
  user_id: number
  version: number
  api_version: string
  action: string
  data: {
    id: string
  }
}

serve(async (req) => {
  console.log(`🔔 [WEBHOOK] ${req.method} ${req.url}`)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Handle GET requests (for testing)
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'active',
        message: 'Webhook do Mercado Pago está funcionando',
        timestamp: new Date().toISOString(),
        url: 'https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/mercado-pago-webhook'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    console.log('🔔 [WEBHOOK] Webhook do Mercado Pago recebido')
    
    // Parse webhook payload
    const webhook: MercadoPagoWebhook = await req.json()
    console.log('📦 [WEBHOOK] Payload:', JSON.stringify(webhook, null, 2))

    // Verificar se é notificação de pagamento
    if (webhook.type !== 'payment') {
      console.log('ℹ️ [WEBHOOK] Tipo de notificação ignorado:', webhook.type)
      return new Response('OK - Ignored', { 
        status: 200, 
        headers: corsHeaders 
      })
    }

    const paymentId = webhook.data.id
    console.log('💳 [WEBHOOK] ID do Pagamento:', paymentId)

    // Buscar detalhes do pagamento no Mercado Pago
    console.log('🔍 [WEBHOOK] Consultando API do Mercado Pago...')
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050`,
        'Content-Type': 'application/json'
      }
    })

    if (!mpResponse.ok) {
      console.error('❌ [WEBHOOK] Erro ao buscar pagamento:', mpResponse.status, mpResponse.statusText)
      throw new Error(`Erro ao buscar pagamento: ${mpResponse.status}`)
    }

    const paymentData = await mpResponse.json()
    console.log('💰 [WEBHOOK] Status do Pagamento:', paymentData.status)
    console.log('📊 [WEBHOOK] External Reference:', paymentData.external_reference)

    // Conectar ao Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar se transação já existe
    const { data: existingTransaction, error: selectError } = await supabase
      .from('transacoes')
      .select('*')
      .eq('mp_payment_id', paymentId)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ [WEBHOOK] Erro ao buscar transação:', selectError)
    }

    if (existingTransaction) {
      // Atualizar transação existente
      console.log('🔄 [WEBHOOK] Atualizando transação existente...')
      const { data: updatedTransaction, error: updateError } = await supabase
        .from('transacoes')
        .update({ 
          status: paymentData.status,
          updated_at: new Date().toISOString()
        })
        .eq('mp_payment_id', paymentId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ [WEBHOOK] Erro ao atualizar transação:', updateError)
      } else {
        console.log('✅ [WEBHOOK] Transação atualizada:', updatedTransaction)
      }
    } else {
      // Criar nova transação baseada no external_reference
      console.log('➕ [WEBHOOK] Criando nova transação...')
      const externalRef = paymentData.external_reference
      
      if (externalRef && externalRef.startsWith('tex_')) {
        const parts = externalRef.split('_')
        if (parts.length >= 3) {
          const { data: newTransaction, error: insertError } = await supabase
            .from('transacoes')
            .insert({
              cliente_id: parts[1],
              prestador_id: parts[2],
              mp_payment_id: paymentId,
              status: paymentData.status,
              amount: paymentData.transaction_amount || 2.02
            })
            .select()
            .single()
          
          if (insertError) {
            console.error('❌ [WEBHOOK] Erro ao criar transação:', insertError)
          } else {
            console.log('✅ [WEBHOOK] Nova transação criada:', newTransaction)
          }
        } else {
          console.error('❌ [WEBHOOK] External reference inválido:', externalRef)
        }
      } else {
        console.error('❌ [WEBHOOK] External reference não encontrado ou inválido')
      }
    }

    // Log do status para debug
    console.log(`📊 [WEBHOOK] Status final do pagamento: ${paymentData.status}`)
    
    if (paymentData.status === 'approved') {
      console.log('🎉 [WEBHOOK] PAGAMENTO APROVADO! Cliente pode acessar WhatsApp')
    } else if (paymentData.status === 'pending') {
      console.log('⏳ [WEBHOOK] Pagamento ainda pendente')
    } else if (paymentData.status === 'rejected') {
      console.log('❌ [WEBHOOK] Pagamento rejeitado')
    } else {
      console.log(`❓ [WEBHOOK] Status desconhecido: ${paymentData.status}`)
    }

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Webhook processado com sucesso',
        payment_id: paymentId,
        payment_status: paymentData.status,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ [WEBHOOK] Erro no webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: 'Erro interno no webhook',
        error: error.message,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

console.log('🚀 [WEBHOOK] Webhook do Mercado Pago iniciado!')
console.log('📍 [WEBHOOK] URL: https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/mercado-pago-webhook')