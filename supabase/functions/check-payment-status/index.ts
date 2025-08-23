import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CheckPaymentRequest {
  payment_id: string
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
    console.log('🔍 Verificando status do pagamento via Edge Function...')
    
    // Parse request body
    const requestData: CheckPaymentRequest = await req.json()
    const paymentId = requestData.payment_id
    
    console.log('💳 Payment ID:', paymentId)

    // CREDENCIAIS DE PRODUÇÃO MERCADO PAGO
    const ACCESS_TOKEN = 'APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050'

    console.log('📤 Consultando Mercado Pago...')

    // Fazer requisição para Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!mpResponse.ok) {
      console.error('❌ Erro MP:', mpResponse.status)
      throw new Error(`Mercado Pago Error: ${mpResponse.status}`)
    }

    const paymentData = await mpResponse.json()
    console.log('📥 Dados do pagamento:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail
    })

    // Resposta de sucesso
    const result = {
      id: paymentData.id.toString(),
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      transaction_amount: paymentData.transaction_amount,
      date_created: paymentData.date_created,
      date_approved: paymentData.date_approved
    }

    return new Response(
      JSON.stringify(result),
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
        error: 'Falha ao verificar pagamento',
        message: error.message,
        status: 'error'
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

console.log('🚀 Edge Function check-payment-status iniciada!')