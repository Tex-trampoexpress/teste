import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ConfirmarPagamentoRequest {
  payment_id: string
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

    const { payment_id }: ConfirmarPagamentoRequest = await req.json()

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id é obrigatório' }),
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

    // Buscar transação no banco
    const { data: transacao, error: transacaoError } = await supabase
      .from('transacoes')
      .select(`
        *,
        cliente:usuarios!transacoes_cliente_id_fkey(id, nome),
        prestador:usuarios!transacoes_prestador_id_fkey(id, nome, whatsapp)
      `)
      .eq('mp_payment_id', payment_id)
      .single()

    if (transacaoError || !transacao) {
      return new Response(
        JSON.stringify({ error: 'Transação não encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Consultar status atualizado no Mercado Pago
    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) {
      throw new Error('Token de acesso do Mercado Pago não configurado')
    }

    console.log('Confirmando pagamento:', payment_id)

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const mpResult = await mpResponse.json()
    console.log('Status atual do pagamento:', mpResult)

    if (!mpResponse.ok) {
      console.error('Erro ao consultar Mercado Pago:', mpResult)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao consultar status no Mercado Pago',
          details: mpResult 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Atualizar status no banco
    const novoStatus = mpResult.status
    if (transacao.status !== novoStatus) {
      const { error: updateError } = await supabase
        .from('transacoes')
        .update({ status: novoStatus })
        .eq('id', transacao.id)

      if (updateError) {
        console.error('Erro ao atualizar status:', updateError)
      } else {
        console.log(`Status atualizado de ${transacao.status} para ${novoStatus}`)
      }
    }

    // Verificar se pagamento foi aprovado
    if (mpResult.status === 'approved') {
      // Limpar número do WhatsApp (remover caracteres especiais)
      const whatsappLimpo = transacao.prestador.whatsapp.replace(/\D/g, '')
      const whatsappUrl = `https://wa.me/55${whatsappLimpo}?text=Olá! Realizei o pagamento via TEX e gostaria de conversar sobre seus serviços.`

      const response = {
        success: true,
        status: 'approved',
        message: 'Pagamento aprovado! Redirecionando para WhatsApp...',
        whatsapp_url: whatsappUrl,
        prestador: {
          nome: transacao.prestador.nome,
          whatsapp: transacao.prestador.whatsapp
        },
        transacao: {
          id: transacao.id,
          amount: 2.02,
          date_approved: mpResult.date_approved
        }
      }

      console.log('Pagamento aprovado, redirecionando:', response)

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // Pagamento ainda não aprovado
      const statusMessages = {
        'pending': 'Pagamento pendente. Aguardando confirmação.',
        'in_process': 'Pagamento em processamento.',
        'rejected': 'Pagamento rejeitado.',
        'cancelled': 'Pagamento cancelado.',
        'refunded': 'Pagamento estornado.',
        'charged_back': 'Pagamento contestado.'
      }

      const response = {
        success: false,
        status: mpResult.status,
        message: statusMessages[mpResult.status] || 'Pagamento ainda não identificado',
        status_detail: mpResult.status_detail,
        transacao: {
          id: transacao.id,
          status: novoStatus,
          created_at: transacao.created_at
        }
      }

      console.log('Pagamento não aprovado:', response)

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Erro na função confirmar pagamento:', error)
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