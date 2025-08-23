// Sistema de Pagamentos Mercado Pago - PRODUÇÃO VIA EDGE FUNCTION
import { supabase } from './supabase'

export interface PaymentData {
  id: string
  status: string
  qr_code_base64: string
  qr_code: string
  ticket_url: string
  expires_at?: string
}

export interface CreatePaymentRequest {
  cliente_id: string
  prestador_id: string
  amount: number
}

export class MercadoPagoService {
  // CREDENCIAIS DE PRODUÇÃO
  private static readonly ACCESS_TOKEN = 'APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050'
  private static readonly API_URL = 'https://api.mercadopago.com'

  // Criar pagamento PIX via Edge Function (resolve CORS)
  static async createPixPayment(request: CreatePaymentRequest): Promise<PaymentData> {
    console.log('💳 [PRODUÇÃO] Criando pagamento via Edge Function:', request)

    try {
      // Usar Edge Function para evitar CORS
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`
      
      console.log('📤 Enviando para Edge Function...')
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Erro da Edge Function:', errorData)
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const paymentData = await response.json()
      console.log('✅ Pagamento criado via Edge Function:', paymentData)

      // Salvar transação no banco (não bloqueia se der erro)
      this.saveTransactionAsync(request, paymentData.id, paymentData.status)

      return paymentData

    } catch (error) {
      console.error('❌ Erro ao criar pagamento:', error)
      throw new Error(`Falha no pagamento: ${error.message}`)
    }
  }

  // Salvar transação de forma assíncrona
  private static async saveTransactionAsync(request: CreatePaymentRequest, paymentId: string, status: string) {
    try {
      const { error } = await supabase.from('transacoes').insert({
        cliente_id: request.cliente_id,
        prestador_id: request.prestador_id,
        mp_payment_id: paymentId,
        status: status,
        amount: request.amount
      })
      
      if (error) {
        console.error('⚠️ Erro ao salvar transação:', error)
      } else {
        console.log('💾 Transação salva no banco')
      }
    } catch (error) {
      console.error('⚠️ Erro ao salvar transação (não crítico):', error)
    }
  }

  // Verificar status do pagamento
  static async checkPaymentStatus(paymentId: string): Promise<string> {
    try {
      console.log('🔍 Verificando status via API direta:', paymentId)

      const response = await fetch(`${this.API_URL}/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('❌ Erro ao consultar status na API:', response.status, response.statusText)
        
        if (response.status === 404) {
          console.log('⚠️ Pagamento não encontrado na API')
          return 'not_found'
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const paymentData = await response.json()
      console.log('📊 Status atual na API:', paymentData.status)
      console.log('🔍 Dados completos:', JSON.stringify(paymentData, null, 2))

      return paymentData.status
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error)
      // Em caso de erro, retornar 'error' para distinguir de 'pending'
      return 'error'
    }
  }

  // Verificar se pagamento foi aprovado
  static async isPaymentApproved(paymentId: string): Promise<boolean> {
    try {
      const status = await this.checkPaymentStatus(paymentId)
      console.log('🔍 Status verificado:', status)
      return status === 'approved'
    } catch (error) {
      console.error('❌ Erro ao verificar aprovação:', error)
      return false
    }
  }

  // Verificar status via banco de dados (mais confiável)
  static async checkPaymentStatusFromDB(paymentId: string): Promise<string> {
    try {
      console.log('🔍 Verificando status no banco:', paymentId)

      const { data, error } = await supabase
        .from('transacoes')
        .select('status')
        .eq('mp_payment_id', paymentId)
        .single()

      if (error) {
        console.error('❌ Erro ao consultar banco:', error)
        
        if (error.code === 'PGRST116') {
          console.log('⚠️ Transação não encontrada no banco')
          return 'not_found'
        }
        
        throw error
      }

      console.log('📊 Status no banco:', data.status)
      return data.status
    } catch (error) {
      console.error('❌ Erro ao verificar status no banco:', error)
      return 'error'
    }
  }

  // Verificar aprovação via banco (mais confiável que API)
  static async isPaymentApprovedFromDB(paymentId: string): Promise<boolean> {
    const status = await this.checkPaymentStatusFromDB(paymentId)
    return status === 'approved'
  }
}