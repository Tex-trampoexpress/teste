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
    console.log('💳 [PRODUÇÃO] Criando pagamento PIX via Edge Function...')
    
    // Parse request body
    const requestData: CreatePaymentRequest = await req.json()
    console.log('📦 Dados recebidos:', requestData)

    // CREDENCIAIS DE PRODUÇÃO MERCADO PAGO
    const ACCESS_TOKEN = 'APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050'
    const WEBHOOK_URL = 'https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/mercado-pago-webhook'

    // Payload simplificado para Mercado Pago
    const paymentPayload = {
      transaction_amount: 2.02,
      description: 'TEX - Acesso ao contato do prestador',
      payment_method_id: 'pix',
      payer: {
        email: 'cliente@tex.app',
        first_name: 'Cliente',
        last_name: 'TEX'
      },
      notification_url: WEBHOOK_URL,
      external_reference: `tex_${requestData.cliente_id}_${requestData.prestador_id}_${Date.now()}`
    }

    console.log('📤 Enviando para Mercado Pago...')

    // Fazer requisição para Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(paymentPayload)
    })

    const responseData = await mpResponse.json()
    console.log('📥 Resposta MP:', responseData)

    if (!mpResponse.ok) {
      console.error('❌ Erro MP:', responseData)
      throw new Error(`Mercado Pago Error: ${responseData.message || 'Erro desconhecido'}`)
    }

    // Extrair dados do QR Code
    const qrCodeBase64 = responseData.point_of_interaction?.transaction_data?.qr_code_base64
    const qrCode = responseData.point_of_interaction?.transaction_data?.qr_code
    const ticketUrl = responseData.point_of_interaction?.transaction_data?.ticket_url

    if (!qrCode) {
      console.error('❌ QR Code não gerado:', responseData)
      throw new Error('QR Code não foi gerado pelo Mercado Pago')
    }

    console.log('✅ Pagamento criado com sucesso!')
    console.log('🔍 Payment ID:', responseData.id)
    console.log('🔍 Status:', responseData.status)
    console.log('🔍 QR Code gerado:', !!qrCode)

    // Resposta de sucesso
    const paymentData = {
      id: responseData.id.toString(),
      status: responseData.status,
      qr_code_base64: qrCodeBase64 || '',
      qr_code: qrCode,
      ticket_url: ticketUrl || '',
      expires_at: responseData.date_of_expiration || null
    }

    return new Response(
      JSON.stringify(paymentData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Falha ao criar pagamento',
        message: error.message,
        details: error.toString()
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

console.log('🚀 Edge Function create-payment iniciada!')