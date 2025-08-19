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

      // Validar dados de entrada
      if (!request.cliente_id || !request.prestador_id || !request.amount) {
        throw new Error('Dados obrigatórios faltando para criar pagamento')
      }

      const paymentPayload = {
        transaction_amount: request.amount,
        description: `TEX - Conexão com prestador de serviço`,
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@tex.com',
          first_name: 'Cliente',
          last_name: 'TEX'
        },
        notification_url: 'https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/mercado-pago-webhook',
        external_reference: `${request.cliente_id}-${request.prestador_id}-${Date.now()}`
      }

      console.log('📦 Payload para Mercado Pago:', paymentPayload)

      // Verificar se as chaves estão configuradas
      if (!this.ACCESS_TOKEN) {
        throw new Error('Token de acesso do Mercado Pago não configurado')
      }

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
        
        let errorMessage = `Erro ${response.status}`
        try {
          const errorData = JSON.parse(responseText)
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.cause && errorData.cause.length > 0) {
            errorMessage = errorData.cause[0].description || errorMessage
          }
        } catch (e) {
          errorMessage = responseText || errorMessage
        }
        
        throw new Error(`Erro do Mercado Pago: ${errorMessage}`)
      }

      const paymentData = JSON.parse(responseText)
      console.log('✅ Pagamento criado:', paymentData)

      // Salvar transação no banco
      try {
        await this.saveTransaction({
          cliente_id: request.cliente_id,
          prestador_id: request.prestador_id,
          mp_payment_id: paymentData.id.toString(),
          status: paymentData.status,
          amount: request.amount
        })
      } catch (dbError) {
        console.error('⚠️ Erro ao salvar no banco (continuando):', dbError)
        // Não falhar o pagamento por erro de banco
      }

      // Verificar se os dados necessários estão presentes
      const qrCodeBase64 = paymentData.point_of_interaction?.transaction_data?.qr_code_base64
      const qrCode = paymentData.point_of_interaction?.transaction_data?.qr_code
      
      if (!qrCode) {
        console.warn('⚠️ QR Code não gerado pelo Mercado Pago')
      }

      return {
        id: paymentData.id.toString(),
        status: paymentData.status,
        qr_code_base64: qrCodeBase64 || '',
        qr_code: qrCode || '',
        ticket_url: paymentData.point_of_interaction?.transaction_data?.ticket_url || ''
      }
    } catch (error) {
      console.error('❌ Erro ao criar pagamento PIX:', error)
      
      // Se for erro de rede, dar uma mensagem mais amigável
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.')
      }
      
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
      console.log('💾 Salvando transação no banco:', transaction)
      
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