import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GerarPagamentoRequest {
  cliente_id: string
  prestador_id: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar API Key
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== Deno.env.get('API_KEY')) {
      return new Response(
        JSON.stringify({ error: 'API Key inválida' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { cliente_id, prestador_id }: GerarPagamentoRequest = await req.json()

    if (!cliente_id || !prestador_id) {
      return new Response(
        JSON.stringify({ error: 'cliente_id e prestador_id são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Inicializar Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar se cliente e prestador existem
    const { data: cliente, error: clienteError } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('id', cliente_id)
      .single()

    if (clienteError || !cliente) {
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { data: prestador, error: prestadorError } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp')
      .eq('id', prestador_id)
      .single()

    if (prestadorError || !prestador) {
      return new Response(
        JSON.stringify({ error: 'Prestador não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Criar pagamento no Mercado Pago
    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) {
      throw new Error('Token de acesso do Mercado Pago não configurado')
    }

    const paymentData = {
      transaction_amount: 2.02,
      description: `Contato com ${prestador.nome} via TEX`,
      payment_method_id: 'pix',
      payer: {
        email: 'cliente@tex.com',
        first_name: cliente.nome.split(' ')[0],
        last_name: cliente.nome.split(' ').slice(1).join(' ') || 'Cliente',
        identification: {
          type: 'CPF',
          number: '11111111111'
        }
      },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/pagamento-webhook`,
      external_reference: `${cliente_id}-${prestador_id}-${Date.now()}`
    }

    console.log('Criando pagamento no Mercado Pago:', paymentData)

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(paymentData)
    })

    const mpResult = await mpResponse.json()
    console.log('Resposta do Mercado Pago:', mpResult)

    if (!mpResponse.ok) {
      console.error('Erro do Mercado Pago:', mpResult)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar pagamento no Mercado Pago',
          details: mpResult 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Salvar transação no banco
    const { data: transacao, error: transacaoError } = await supabase
      .from('transacoes')
      .insert({
        cliente_id,
        prestador_id,
        mp_payment_id: mpResult.id.toString(),
        status: 'pending'
      })
      .select()
      .single()

    if (transacaoError) {
      console.error('Erro ao salvar transação:', transacaoError)
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar transação' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Retornar dados do pagamento
    const response = {
      success: true,
      payment_id: mpResult.id,
      qr_code: mpResult.point_of_interaction?.transaction_data?.qr_code || null,
      qr_code_base64: mpResult.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      ticket_url: mpResult.point_of_interaction?.transaction_data?.ticket_url || null,
      amount: 2.02,
      status: mpResult.status,
      transacao_id: transacao.id,
      prestador: {
        nome: prestador.nome,
        whatsapp: prestador.whatsapp
      }
    }

    console.log('Pagamento criado com sucesso:', response)

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na função gerar pagamento:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})