// Cliente para integração com Mercado Pago
import { supabase } from './supabase'

export interface PagamentoRequest {
  cliente_id: string
  prestador_id: string
}

export interface PagamentoResponse {
  success: boolean
  payment_id: string
  qr_code?: string
  qr_code_base64?: string
  ticket_url?: string
  amount: number
  status: string
  transacao_id: string
  prestador: {
    nome: string
    whatsapp: string
  }
}

export interface StatusPagamentoResponse {
  success: boolean
  payment_id: string
  status: string
  status_detail?: string
  amount: number
  date_created?: string
  date_approved?: string
  transacao: {
    id: string
    status: string
    created_at: string
    cliente: {
      id: string
      nome: string
    }
    prestador: {
      id: string
      nome: string
      whatsapp: string
    }
  }
}

export interface ConfirmarPagamentoResponse {
  success: boolean
  status: string
  message: string
  whatsapp_url?: string
  prestador?: {
    nome: string
    whatsapp: string
  }
  transacao?: {
    id: string
    amount: number
    date_approved?: string
  }
}

export class MercadoPagoService {
  private static readonly API_KEY = 'your_api_key_here' // Substitua pela sua API key
  private static readonly BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

  private static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.API_KEY
    }
  }

  // Gerar pagamento PIX
  static async gerarPagamento(dados: PagamentoRequest): Promise<PagamentoResponse> {
    try {
      console.log('🔄 Gerando pagamento PIX:', dados)

      const response = await fetch(`${this.BASE_URL}/pagamento-gerar`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(dados)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Erro ao gerar pagamento:', result)
        throw new Error(result.error || 'Erro ao gerar pagamento')
      }

      console.log('✅ Pagamento gerado com sucesso:', result)
      return result
    } catch (error) {
      console.error('❌ Erro na geração do pagamento:', error)
      throw error
    }
  }

  // Consultar status do pagamento
  static async consultarStatus(payment_id: string): Promise<StatusPagamentoResponse> {
    try {
      console.log('🔍 Consultando status do pagamento:', payment_id)

      const response = await fetch(`${this.BASE_URL}/pagamento-status`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ payment_id })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Erro ao consultar status:', result)
        throw new Error(result.error || 'Erro ao consultar status')
      }

      console.log('✅ Status consultado:', result)
      return result
    } catch (error) {
      console.error('❌ Erro na consulta de status:', error)
      throw error
    }
  }

  // Confirmar pagamento e obter link do WhatsApp
  static async confirmarPagamento(payment_id: string): Promise<ConfirmarPagamentoResponse> {
    try {
      console.log('✅ Confirmando pagamento:', payment_id)

      const response = await fetch(`${this.BASE_URL}/pagamento-confirmar`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ payment_id })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Erro ao confirmar pagamento:', result)
        throw new Error(result.error || 'Erro ao confirmar pagamento')
      }

      console.log('✅ Pagamento confirmado:', result)
      return result
    } catch (error) {
      console.error('❌ Erro na confirmação do pagamento:', error)
      throw error
    }
  }

  // Polling para verificar status do pagamento
  static async aguardarPagamento(
    payment_id: string, 
    callback: (status: StatusPagamentoResponse) => void,
    maxTentativas: number = 60, // 5 minutos (60 * 5s)
    intervalo: number = 5000 // 5 segundos
  ): Promise<void> {
    let tentativas = 0

    const verificar = async () => {
      try {
        const status = await this.consultarStatus(payment_id)
        callback(status)

        // Se aprovado ou rejeitado, parar o polling
        if (status.status === 'approved' || status.status === 'rejected' || status.status === 'cancelled') {
          console.log(`🏁 Polling finalizado - Status: ${status.status}`)
          return
        }

        // Continuar verificando se ainda há tentativas
        tentativas++
        if (tentativas < maxTentativas) {
          setTimeout(verificar, intervalo)
        } else {
          console.log('⏰ Timeout do polling - máximo de tentativas atingido')
        }
      } catch (error) {
        console.error('❌ Erro no polling:', error)
        tentativas++
        if (tentativas < maxTentativas) {
          setTimeout(verificar, intervalo)
        }
      }
    }

    // Iniciar verificação
    verificar()
  }

  // Obter estatísticas de transações do usuário
  static async obterEstatisticas(user_id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_transacao_stats', { user_id })

      if (error) {
        console.error('❌ Erro ao obter estatísticas:', error)
        throw error
      }

      return data?.[0] || {
        total_como_cliente: 0,
        total_como_prestador: 0,
        valor_total_pago: 0,
        valor_total_recebido: 0,
        transacoes_aprovadas_cliente: 0,
        transacoes_aprovadas_prestador: 0
      }
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error)
      throw error
    }
  }

  // Listar transações do usuário
  static async listarTransacoes(user_id: string, tipo: 'cliente' | 'prestador' | 'todas' = 'todas'): Promise<any[]> {
    try {
      let query = supabase
        .from('transacoes')
        .select(`
          *,
          cliente:usuarios!transacoes_cliente_id_fkey(id, nome),
          prestador:usuarios!transacoes_prestador_id_fkey(id, nome, whatsapp)
        `)
        .order('created_at', { ascending: false })

      if (tipo === 'cliente') {
        query = query.eq('cliente_id', user_id)
      } else if (tipo === 'prestador') {
        query = query.eq('prestador_id', user_id)
      } else {
        query = query.or(`cliente_id.eq.${user_id},prestador_id.eq.${user_id}`)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Erro ao listar transações:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('❌ Erro ao listar transações:', error)
      throw error
    }
  }
}