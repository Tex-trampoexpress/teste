import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Função para validar assinatura do webhook
async function validateWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Erro ao validar assinatura:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obter corpo da requisição
    const body = await req.text()
    console.log('Webhook recebido:', body)

    // Validar assinatura do webhook
    const signature = req.headers.get('x-signature')
    const webhookSecret = Deno.env.get('MP_WEBHOOK_SECRET')
    
    if (!signature || !webhookSecret) {
      console.error('Assinatura ou secret não fornecidos')
      return new Response(
        JSON.stringify({ error: 'Assinatura inválida' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extrair apenas o hash da assinatura (formato: ts=timestamp,v1=hash)
    const signatureParts = signature.split(',')
    let hash = ''
    for (const part of signatureParts) {
      if (part.startsWith('v1=')) {
        hash = part.substring(3)
        break
      }
    }

    if (!hash) {
      console.error('Hash não encontrado na assinatura')
      return new Response(
        JSON.stringify({ error: 'Formato de assinatura inválido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar assinatura
    const isValidSignature = await validateWebhookSignature(body, hash, webhookSecret)
    if (!isValidSignature) {
      console.error('Assinatura inválida')
      return new Response(
        JSON.stringify({ error: 'Assinatura inválida' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Assinatura validada com sucesso')

    // Parse do JSON
    const webhookData = JSON.parse(body)
    console.log('Dados do webhook:', webhookData)

    // Verificar se é uma notificação de pagamento
    if (webhookData.type !== 'payment') {
      console.log('Webhook não é de pagamento, ignorando')
      return new Response(
        JSON.stringify({ message: 'Webhook processado (não é pagamento)' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const paymentId = webhookData.data?.id
    if (!paymentId) {
      console.error('ID do pagamento não encontrado no webhook')
      return new Response(
        JSON.stringify({ error: 'ID do pagamento não encontrado' }),
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
      .select('*')
      .eq('mp_payment_id', paymentId.toString())
      .single()

    if (transacaoError || !transacao) {
      console.error('Transação não encontrada:', paymentId)
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

    console.log('Consultando pagamento no MP:', paymentId)

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const mpResult = await mpResponse.json()
    console.log('Status do pagamento no MP:', mpResult)

    if (!mpResponse.ok) {
      console.error('Erro ao consultar Mercado Pago:', mpResult)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao consultar pagamento no Mercado Pago',
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
        .update({ 
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', transacao.id)

      if (updateError) {
        console.error('Erro ao atualizar status:', updateError)
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar status da transação' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`Status atualizado de ${transacao.status} para ${novoStatus}`)
    }

    // Log do evento processado
    console.log(`Webhook processado com sucesso - Payment ID: ${paymentId}, Status: ${novoStatus}`)

    return new Response(
      JSON.stringify({ 
        message: 'Webhook processado com sucesso',
        payment_id: paymentId,
        old_status: transacao.status,
        new_status: novoStatus
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro no webhook:', error)
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