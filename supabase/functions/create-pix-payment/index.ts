import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreatePaymentRequest {
  cliente_id: string
  prestador_id: string
  amount: number
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
    console.log('💳 Criando pagamento PIX via proxy...')
    
    const requestData: CreatePaymentRequest = await req.json()
    console.log('📦 Dados recebidos:', requestData)

    // Validar dados
    if (!requestData.cliente_id || !requestData.prestador_id || !requestData.amount) {
      throw new Error('Dados obrigatórios faltando')
    }

    // Preparar payload para Mercado Pago
    const paymentPayload = {
      transaction_amount: requestData.amount,
      description: `TEX - Conexão com prestador de serviço`,
      payment_method_id: 'pix',
      payer: {
        email: 'cliente@tex.com',
        first_name: 'Cliente',
        last_name: 'TEX'
      },
      notification_url: 'https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/mercado-pago-webhook',
      external_reference: `${requestData.cliente_id}-${requestData.prestador_id}-${Date.now()}`
    }

    console.log('📤 Enviando para Mercado Pago:', paymentPayload)

    // Fazer requisição para Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050',
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(paymentPayload)
    })

    const responseText = await mpResponse.text()
    console.log('📥 Resposta do Mercado Pago:', responseText)

    if (!mpResponse.ok) {
      console.error('❌ Erro do Mercado Pago:', mpResponse.status, responseText)
      throw new Error(`Erro do Mercado Pago: ${mpResponse.status}`)
    }

    const paymentData = JSON.parse(responseText)
    console.log('✅ Pagamento criado:', paymentData.id)

    // Salvar no banco de dados
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabase
      .from('transacoes')
      .insert({
        cliente_id: requestData.cliente_id,
        prestador_id: requestData.prestador_id,
        mp_payment_id: paymentData.id.toString(),
        status: paymentData.status,
        amount: requestData.amount
      })

    if (dbError) {
      console.error('⚠️ Erro ao salvar no banco:', dbError)
      // Não falhar o pagamento por erro de banco
    }

    // Preparar resposta
    const response = {
      id: paymentData.id.toString(),
      status: paymentData.status,
      qr_code_base64: paymentData.point_of_interaction?.transaction_data?.qr_code_base64 || '',
      qr_code: paymentData.point_of_interaction?.transaction_data?.qr_code || '',
      ticket_url: paymentData.point_of_interaction?.transaction_data?.ticket_url || ''
    }

    console.log('🎉 Resposta preparada:', response)

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ Erro no proxy:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
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

console.log('🚀 Proxy de pagamento PIX iniciado!')