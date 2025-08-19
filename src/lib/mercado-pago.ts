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
  private static readonly PROXY_URL = 'https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/create-pix-payment'

  // Criar pagamento PIX
  static async createPixPayment(request: CreatePaymentRequest): Promise<PaymentData> {
    try {
      console.log('💳 Criando pagamento PIX:', request)
      console.log('🔗 URL do proxy:', this.PROXY_URL)

      // Validar dados de entrada
      if (!request.cliente_id || !request.prestador_id || !request.amount) {
        throw new Error('Dados obrigatórios faltando para criar pagamento')
      }

      console.log('📤 Fazendo requisição para o proxy...')
      
      // Usar proxy do Supabase para evitar CORS
      const response = await fetch(this.PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(request)
      })

      console.log('📡 Status da resposta:', response.status)
      console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()))
      
      const responseText = await response.text()
      console.log('📥 Resposta do proxy:', responseText)

      if (!response.ok) {
        console.error('❌ Erro do proxy:', response.status, responseText)
        
        let errorMessage = `Erro HTTP ${response.status}`
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (e) {
          errorMessage = responseText.substring(0, 100) || errorMessage
        }
        
        throw new Error(`Erro no pagamento: ${errorMessage}`)
      }

      console.log('📋 Tentando fazer parse da resposta...')
      const paymentData = JSON.parse(responseText)
      console.log('✅ Pagamento criado:', paymentData)

      // Verificar se o QR Code foi gerado
      if (!paymentData.qr_code) {
        console.warn('⚠️ QR Code não foi gerado')
        console.warn('📋 Dados recebidos:', paymentData)
      }

      return paymentData
    } catch (error) {
      console.error('❌ Erro ao criar pagamento PIX:', error)
      
      // Se for erro de rede, dar uma mensagem mais amigável
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.')
      }
      
      // Se for erro de parsing JSON
      if (error instanceof SyntaxError) {
        throw new Error('Erro na resposta do servidor. Tente novamente.')
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