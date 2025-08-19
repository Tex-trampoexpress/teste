// Sistema de Pagamentos Mercado Pago - PRODUÇÃO
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
  // CREDENCIAIS DE PRODUÇÃO - Mercado Pago
  private static readonly ACCESS_TOKEN = 'APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050'
  private static readonly API_URL = 'https://api.mercadopago.com'
  private static readonly WEBHOOK_URL = 'https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/mercado-pago-webhook'

  // Criar pagamento PIX - PRODUÇÃO
  static async createPixPayment(request: CreatePaymentRequest): Promise<PaymentData> {
    try {
      console.log('💳 [PRODUÇÃO] Criando pagamento PIX:', request)

      // Validações obrigatórias
      if (!request.cliente_id || !request.prestador_id || !request.amount) {
        throw new Error('Dados obrigatórios faltando para criar pagamento')
      }

      if (request.amount < 0.01) {
        throw new Error('Valor mínimo é R$ 0,01')
      }

      // Payload para Mercado Pago - PRODUÇÃO
      const paymentPayload = {
        transaction_amount: Number(request.amount.toFixed(2)),
        description: `TEX - Acesso ao contato do prestador`,
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@tex.app',
          first_name: 'Cliente',
          last_name: 'TEX'
        },
        notification_url: this.WEBHOOK_URL,
        external_reference: `tex-${request.cliente_id}-${request.prestador_id}-${Date.now()}`,
        expires: true,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      }

      console.log('📦 [PRODUÇÃO] Enviando para Mercado Pago:', paymentPayload)

      // Fazer requisição para Mercado Pago
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
      console.log('📥 [PRODUÇÃO] Resposta MP:', response.status, responseText)

      if (!response.ok) {
        console.error('❌ [PRODUÇÃO] Erro do Mercado Pago:', response.status, responseText)
        
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

      let paymentData
      try {
        paymentData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ [PRODUÇÃO] Erro ao fazer parse:', parseError)
        throw new Error('Resposta inválida do Mercado Pago')
      }
      
      console.log('✅ [PRODUÇÃO] Pagamento criado:', paymentData.id)

      // Verificar se QR Code foi gerado
      const qrCodeBase64 = paymentData.point_of_interaction?.transaction_data?.qr_code_base64
      const qrCode = paymentData.point_of_interaction?.transaction_data?.qr_code
      
      if (!qrCode) {
        console.error('⚠️ [PRODUÇÃO] QR Code não gerado pelo MP')
        throw new Error('QR Code PIX não foi gerado. Tente novamente.')
      }

      // Salvar transação no banco
      try {
        await this.saveTransaction({
          cliente_id: request.cliente_id,
          prestador_id: request.prestador_id,
          mp_payment_id: paymentData.id.toString(),
          status: paymentData.status,
          amount: request.amount
        })
        console.log('💾 [PRODUÇÃO] Transação salva no banco')
      } catch (dbError) {
        console.error('⚠️ [PRODUÇÃO] Erro ao salvar no banco:', dbError)
        // Não falhar o pagamento por erro de banco
      }

      return {
        id: paymentData.id.toString(),
        status: paymentData.status,
        qr_code_base64: qrCodeBase64 || '',
        qr_code: qrCode || '',
        ticket_url: paymentData.point_of_interaction?.transaction_data?.ticket_url || ''
      }
    } catch (error) {
      console.error('❌ [PRODUÇÃO] Erro ao criar pagamento:', error)
      
      // Mensagens de erro mais amigáveis
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.')
      }
      
      if (error.message.includes('401')) {
        throw new Error('Erro de autenticação com Mercado Pago. Contate o suporte.')
      }
      
      if (error.message.includes('400')) {
        throw new Error('Dados inválidos para pagamento. Tente novamente.')
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
      console.log('💾 [PRODUÇÃO] Salvando transação:', transaction.mp_payment_id)
      
      const { data, error } = await supabase
        .from('transacoes')
        .insert(transaction)
        .select()
        .single()

      if (error) {
        console.error('❌ [PRODUÇÃO] Erro ao salvar transação:', error)
        throw error
      }

      console.log('✅ [PRODUÇÃO] Transação salva:', data.id)
      return data
    } catch (error) {
      console.error('❌ [PRODUÇÃO] Erro ao salvar transação:', error)
      throw error
    }
  }

  // Verificar status do pagamento - PRODUÇÃO
  static async checkPaymentStatus(paymentId: string): Promise<string> {
    try {
      console.log('🔍 [PRODUÇÃO] Verificando status:', paymentId)

      // Primeiro verificar no banco local
      const { data: transaction, error } = await supabase
        .from('transacoes')
        .select('status, updated_at')
        .eq('mp_payment_id', paymentId)
        .single()

      if (error) {
        console.error('❌ [PRODUÇÃO] Erro ao buscar transação:', error)
        // Se não encontrar no banco, consultar diretamente no MP
        return this.checkPaymentStatusDirect(paymentId)
      }

      console.log('📊 [PRODUÇÃO] Status no banco:', transaction.status)
      
      // Se ainda está pendente, verificar no MP para atualizar
      if (transaction.status === 'pending') {
        return this.checkPaymentStatusDirect(paymentId)
      }
      
      return transaction.status
    } catch (error) {
      console.error('❌ [PRODUÇÃO] Erro ao verificar status:', error)
      return 'pending'
    }
  }

  // Verificar status diretamente no Mercado Pago - PRODUÇÃO
  private static async checkPaymentStatusDirect(paymentId: string): Promise<string> {
    try {
      console.log('🔍 [PRODUÇÃO] Consultando MP diretamente:', paymentId)

      const response = await fetch(`${this.API_URL}/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('❌ [PRODUÇÃO] Erro ao consultar MP:', response.status)
        return 'pending'
      }

      const paymentData = await response.json()
      console.log('📊 [PRODUÇÃO] Status do MP:', paymentData.status)

      // Atualizar status no banco se mudou
      if (paymentData.status !== 'pending') {
        try {
          await supabase
            .from('transacoes')
            .update({ 
              status: paymentData.status,
              updated_at: new Date().toISOString()
            })
            .eq('mp_payment_id', paymentId)
          console.log('✅ [PRODUÇÃO] Status atualizado no banco')
        } catch (updateError) {
          console.error('⚠️ [PRODUÇÃO] Erro ao atualizar status:', updateError)
        }
      }

      return paymentData.status
    } catch (error) {
      console.error('❌ [PRODUÇÃO] Erro na consulta direta:', error)
      return 'pending'
    }
  }

  // Verificar se pagamento foi aprovado - PRODUÇÃO
  static async isPaymentApproved(paymentId: string): Promise<boolean> {
    const status = await this.checkPaymentStatus(paymentId)
    console.log('✅ [PRODUÇÃO] Status final:', status)
    return status === 'approved'
  }

  // Cancelar pagamento - PRODUÇÃO
  static async cancelPayment(paymentId: string): Promise<void> {
    try {
      console.log('❌ [PRODUÇÃO] Cancelando pagamento:', paymentId)
      
      const response = await fetch(`${this.API_URL}/v1/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'cancelled'
        })
      })

      if (response.ok) {
        // Atualizar no banco
        await supabase
          .from('transacoes')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('mp_payment_id', paymentId)
        
        console.log('✅ [PRODUÇÃO] Pagamento cancelado')
      }
    } catch (error) {
      console.error('⚠️ [PRODUÇÃO] Erro ao cancelar:', error)
    }
  }

  // Obter detalhes do pagamento - PRODUÇÃO
  static async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.API_URL}/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Erro ao obter detalhes: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('❌ [PRODUÇÃO] Erro ao obter detalhes:', error)
      throw error
    }
  }
}