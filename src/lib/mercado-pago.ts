// Sistema de Pagamentos Mercado Pago - PRODUÇÃO SIMPLIFICADA
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
  // CREDENCIAIS DE PRODUÇÃO
  private static readonly ACCESS_TOKEN = 'APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050'
  private static readonly API_URL = 'https://api.mercadopago.com'
  private static readonly WEBHOOK_URL = 'https://rengkrhtidgfaycutnqn.supabase.co/functions/v1/mercado-pago-webhook'

  // Criar pagamento PIX - VERSÃO SIMPLIFICADA
  static async createPixPayment(request: CreatePaymentRequest): Promise<PaymentData> {
    console.log('💳 [PRODUÇÃO] Criando pagamento PIX:', request)

    try {
      // Payload mínimo e funcional
      const paymentPayload = {
        transaction_amount: 2.02,
        description: 'TEX - Acesso ao contato',
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@tex.app'
        },
        notification_url: this.WEBHOOK_URL
      }

      console.log('📦 Enviando para Mercado Pago...')

      const response = await fetch(`${this.API_URL}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentPayload)
      })

      const responseData = await response.json()
      console.log('📥 Resposta MP:', responseData)

      if (!response.ok) {
        console.error('❌ Erro MP:', responseData)
        throw new Error(`Erro do Mercado Pago: ${responseData.message || 'Erro desconhecido'}`)
      }

      // Extrair dados do QR Code
      const qrCodeBase64 = responseData.point_of_interaction?.transaction_data?.qr_code_base64
      const qrCode = responseData.point_of_interaction?.transaction_data?.qr_code

      if (!qrCode) {
        throw new Error('QR Code não foi gerado pelo Mercado Pago')
      }

      console.log('✅ Pagamento criado:', responseData.id)

      // Salvar no banco (sem bloquear se der erro)
      this.saveTransactionAsync(request, responseData.id.toString(), responseData.status)

      return {
        id: responseData.id.toString(),
        status: responseData.status,
        qr_code_base64: qrCodeBase64 || '',
        qr_code: qrCode,
        ticket_url: responseData.point_of_interaction?.transaction_data?.ticket_url || ''
      }

    } catch (error) {
      console.error('❌ Erro ao criar pagamento:', error)
      throw new Error(`Falha no pagamento: ${error.message}`)
    }
  }

  // Salvar transação de forma assíncrona (não bloqueia)
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
      console.log('🔍 Verificando status:', paymentId)

      const response = await fetch(`${this.API_URL}/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('❌ Erro ao consultar status:', response.status)
        return 'pending'
      }

      const paymentData = await response.json()
      console.log('📊 Status atual:', paymentData.status)

      return paymentData.status
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