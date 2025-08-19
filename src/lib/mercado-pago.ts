import { supabase } from './supabase'

export interface PaymentData {
  id: string
  status: string
  qr_code_base64: string
  qr_code: string
  ticket_url: string
}

export interface CreatePaymentRequest {
  cliente_id: string
  prestador_id: string
  amount: number
}

export class MercadoPagoService {
  private static readonly ACCESS_TOKEN = 'APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050'
  private static readonly PUBLIC_KEY = 'APP_USR-c5e81aaf-7a2a-4452-93ab-2a16dd420bc5'
  private static readonly API_URL = 'https://api.mercadopago.com'

  // Criar pagamento PIX
  static async createPixPayment(request: CreatePaymentRequest): Promise<PaymentData> {
    try {
      console.log('💳 Criando pagamento PIX:', request)

      const paymentPayload = {
        transaction_amount: request.amount,
        description: `TEX - Conexão com prestador de serviço`,
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@tex.com',
          first_name: 'Cliente',
          last_name: 'TEX'
        },
        notification_url: `${window.location.origin}/api/mercado-pago-webhook`,
        external_reference: `${request.cliente_id}-${request.prestador_id}-${Date.now()}`
      }

      console.log('📦 Payload para Mercado Pago:', paymentPayload)

      const response = await fetch(`${this.API_URL}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(paymentPayload)
      })

      const responseText = await response.text()
      console.log('📥 Resposta do Mercado Pago:', responseText)

      if (!response.ok) {
        console.error('❌ Erro do Mercado Pago:', response.status, responseText)
        throw new Error(`Erro ao criar pagamento: ${response.status} - ${responseText}`)
      }

      const paymentData = JSON.parse(responseText)
      console.log('✅ Pagamento criado:', paymentData)

      // Salvar transação no banco
      await this.saveTransaction({
        cliente_id: request.cliente_id,
        prestador_id: request.prestador_id,
        mp_payment_id: paymentData.id.toString(),
        status: paymentData.status,
        amount: request.amount
      })

      return {
        id: paymentData.id.toString(),
        status: paymentData.status,
        qr_code_base64: paymentData.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        qr_code: paymentData.point_of_interaction?.transaction_data?.qr_code || '',
        ticket_url: paymentData.point_of_interaction?.transaction_data?.ticket_url || ''
      }
    } catch (error) {
      console.error('❌ Erro ao criar pagamento PIX:', error)
      throw error
    }
  }

  // Salvar transação no banco
  private static async saveTransaction(transaction: {
    cliente_id: string
    prestador_id: string
    mp_payment_id: string
    status: string
    amount: number
  }) {
    try {
      const { data, error } = await supabase
        .from('transacoes')
        .insert(transaction)
        .select()
        .single()

      if (error) {
        console.error('❌ Erro ao salvar transação:', error)
        throw error
      }

      console.log('✅ Transação salva:', data)
      return data
    } catch (error) {
      console.error('❌ Erro ao salvar transação:', error)
      throw error
    }
  }

  // Verificar status do pagamento
  static async checkPaymentStatus(paymentId: string): Promise<string> {
    try {
      console.log('🔍 Verificando status do pagamento:', paymentId)

      // Primeiro verificar no banco local
      const { data: transaction, error } = await supabase
        .from('transacoes')
        .select('status')
        .eq('mp_payment_id', paymentId)
        .single()

      if (error) {
        console.error('❌ Erro ao buscar transação:', error)
        throw error
      }

      console.log('📊 Status atual:', transaction.status)
      return transaction.status
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error)
      throw error
    }
  }

  // Verificar se pagamento foi aprovado
  static async isPaymentApproved(paymentId: string): Promise<boolean> {
    const status = await this.checkPaymentStatus(paymentId)
    return status === 'approved'
  }
}