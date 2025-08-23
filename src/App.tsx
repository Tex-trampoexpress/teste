import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    console.log('🔔 [WEBHOOK] Notificação do Mercado Pago recebida')
    console.log('📅 Timestamp:', new Date().toISOString())
    
    // Parse webhook payload
    const webhook: MercadoPagoWebhook = await req.json()
    console.log('📦 [WEBHOOK] Payload completo:', JSON.stringify(webhook, null, 2))

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
    console.log('🔍 [WEBHOOK] Consultando detalhes na API do MP...')
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050`
      }
    })

    if (!mpResponse.ok) {
      console.error('❌ [WEBHOOK] Erro ao consultar MP:', mpResponse.status)
      throw new Error(`Erro ao buscar pagamento no MP: ${mpResponse.status}`)
    }

    const paymentData = await mpResponse.json()
    console.log('💰 [WEBHOOK] Status do pagamento:', paymentData.status)
    console.log('💰 [WEBHOOK] Valor:', paymentData.transaction_amount)
    console.log('💰 [WEBHOOK] Método:', paymentData.payment_method_id)

    // Conectar ao Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('💾 [WEBHOOK] Atualizando status no banco...')

    // Atualizar status da transação no banco
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transacoes')
      .update({ 
        status: paymentData.status,
        updated_at: new Date().toISOString()
      })
      .eq('mp_payment_id', paymentId)
      .select()

    if (updateError) {
      console.error('❌ [WEBHOOK] Erro ao atualizar transação:', updateError)
      throw updateError
    }

    if (updatedTransaction && updatedTransaction.length > 0) {
      console.log('✅ [WEBHOOK] Transação atualizada com sucesso')
      console.log('📊 [WEBHOOK] Novo status:', updatedTransaction[0].status)
    } else {
      console.log('⚠️ [WEBHOOK] Nenhuma transação encontrada para atualizar')
    }

    // Log do status para debug
    console.log(`📊 [WEBHOOK] Status final: ${paymentData.status}`)
    
    if (paymentData.status === 'approved') {
      console.log('🎉 [WEBHOOK] PAGAMENTO APROVADO! Cliente liberado para WhatsApp')
    } else if (paymentData.status === 'pending') {
      console.log('⏳ [WEBHOOK] Pagamento ainda pendente')
    } else if (paymentData.status === 'rejected') {
      console.log('❌ [WEBHOOK] Pagamento rejeitado')
    } else {
    }

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('❌ Erro no webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
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

console.log('🚀 Webhook do Mercado Pago iniciado!')
console.log('📍 URL: https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/mercado-pago-webhook')