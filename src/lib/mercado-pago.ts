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

      // Usar Edge Function para evitar CORS
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment-status`
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment_id: paymentId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Erro ao consultar status:', errorData)
        return 'pending'
      }

      const result = await response.json()
      console.log('📊 Status atual:', result.status)

      return result.status
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error)
      return 'pending'
    }
  }

  // Verificar se pagamento foi aprovado
  static async isPaymentApproved(paymentId: string): Promise<boolean> {
    const status = await this.checkPaymentStatus(paymentId)
    return status === 'approved'
  }
}