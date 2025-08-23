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
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050`
      }
    })

    if (!mpResponse.ok) {
      console.error('❌ [WEBHOOK] Erro ao buscar pagamento:', mpResponse.status)
      throw new Error(`Erro ao buscar pagamento: ${mpResponse.status}`)
    }

    const paymentData = await mpResponse.json()
    console.log('💰 [WEBHOOK] Status do Pagamento:', paymentData.status)
    console.log('📊 [WEBHOOK] Dados completos:', JSON.stringify(paymentData, null, 2))

    // Conectar ao Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Atualizar status da transação no banco
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transacoes')
      .upsert({ 
        mp_payment_id: paymentId,
        status: paymentData.status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'mp_payment_id'
      })
      .select()

    if (updateError) {
      console.error('❌ [WEBHOOK] Erro ao atualizar transação:', updateError)
      
      // Tentar criar transação se não existir
      console.log('⚠️ [WEBHOOK] Tentando criar transação...')
      
      const externalRef = paymentData.external_reference
      if (externalRef && externalRef.startsWith('tex_')) {
        const parts = externalRef.split('_')
        if (parts.length >= 3) {
          const { error: insertError } = await supabase
            .from('transacoes')
            .insert({
              cliente_id: parts[1],
              prestador_id: parts[2],
              mp_payment_id: paymentId,
              status: paymentData.status,
              amount: paymentData.transaction_amount || 2.02
            })
          
          if (insertError) {
            console.error('❌ [WEBHOOK] Erro ao criar transação:', insertError)
          } else {
            console.log('✅ [WEBHOOK] Transação criada via webhook')
          }
        }
      }
    } else {
      console.log('✅ [WEBHOOK] Transação upsert realizado:', updatedTransaction)
    }

    // Log do status para debug
    console.log(`📊 [WEBHOOK] Status final do pagamento: ${paymentData.status}`)
    
    if (paymentData.status === 'approved') {
      console.log('🎉 [WEBHOOK] Pagamento aprovado! Cliente pode acessar WhatsApp')
    } else {
      console.log(`⏳ [WEBHOOK] Pagamento ainda ${paymentData.status}`)
    }

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('❌ [WEBHOOK] Erro no webhook:', error)
    
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

console.log('🚀 [WEBHOOK] Webhook do Mercado Pago iniciado!')
console.log('📍 [WEBHOOK] URL: https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/mercado-pago-webhook')