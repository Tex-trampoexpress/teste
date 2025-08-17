import React, { useState, useEffect } from 'react'
import { MercadoPagoService, type PagamentoResponse, type StatusPagamentoResponse } from '../lib/mercadopago'
import toast from 'react-hot-toast'

interface PagamentoPixProps {
  prestadorId: string
  prestadorNome: string
  prestadorWhatsapp: string
  clienteId: string
  onClose: () => void
  onSuccess: (whatsappUrl: string) => void
}

const PagamentoPix: React.FC<PagamentoPixProps> = ({
  prestadorId,
  prestadorNome,
  prestadorWhatsapp,
  clienteId,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const [pagamento, setPagamento] = useState<PagamentoResponse | null>(null)
  const [status, setStatus] = useState<StatusPagamentoResponse | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [tempoRestante, setTempoRestante] = useState(300) // 5 minutos

  useEffect(() => {
    gerarPagamento()
  }, [])

  useEffect(() => {
    if (pagamento) {
      // Iniciar polling para verificar status
      MercadoPagoService.aguardarPagamento(
        pagamento.payment_id,
        (novoStatus) => {
          setStatus(novoStatus)
          if (novoStatus.status === 'approved') {
            handlePagamentoAprovado()
          }
        }
      )

      // Timer de 5 minutos
      const timer = setInterval(() => {
        setTempoRestante(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            toast.error('Tempo limite para pagamento expirado')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [pagamento])

  const gerarPagamento = async () => {
    try {
      setLoading(true)
      toast.loading('Gerando pagamento PIX...')

      const resultado = await MercadoPagoService.gerarPagamento({
        cliente_id: clienteId,
        prestador_id: prestadorId
      })

      setPagamento(resultado)
      toast.dismiss()
      toast.success('PIX gerado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar pagamento:', error)
      toast.dismiss()
      toast.error('Erro ao gerar PIX. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handlePagamentoAprovado = async () => {
    try {
      if (!pagamento) return

      toast.loading('Confirmando pagamento...')

      const confirmacao = await MercadoPagoService.confirmarPagamento(pagamento.payment_id)

      toast.dismiss()

      if (confirmacao.success && confirmacao.whatsapp_url) {
        toast.success('Pagamento aprovado! Redirecionando...')
        onSuccess(confirmacao.whatsapp_url)
      } else {
        toast.error(confirmacao.message || 'Erro na confirmação')
      }
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error)
      toast.dismiss()
      toast.error('Erro ao confirmar pagamento')
    }
  }

  const copiarPix = async () => {
    if (!pagamento?.qr_code) return

    try {
      await navigator.clipboard.writeText(pagamento.qr_code)
      setCopiado(true)
      toast.success('PIX copiado!')
      setTimeout(() => setCopiado(false), 3000)
    } catch (error) {
      toast.error('Erro ao copiar PIX')
    }
  }

  const formatarTempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60)
    const segs = segundos % 60
    return `${minutos}:${segs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50'
      case 'pending': return '#FF9800'
      case 'in_process': return '#2196F3'
      case 'rejected': return '#f44336'
      default: return '#9E9E9E'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado'
      case 'pending': return 'Pendente'
      case 'in_process': return 'Processando'
      case 'rejected': return 'Rejeitado'
      case 'cancelled': return 'Cancelado'
      default: return 'Aguardando'
    }
  }

  if (loading) {
    return (
      <div className="pagamento-pix-overlay">
        <div className="pagamento-pix-modal">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3>Gerando PIX...</h3>
            <p>Aguarde enquanto preparamos seu pagamento</p>
          </div>
        </div>
      </div>
    )
  }

  if (!pagamento) {
    return (
      <div className="pagamento-pix-overlay">
        <div className="pagamento-pix-modal">
          <div className="error-content">
            <i className="fas fa-exclamation-triangle"></i>
            <h3>Erro ao gerar PIX</h3>
            <p>Não foi possível gerar o pagamento. Tente novamente.</p>
            <button onClick={onClose} className="btn-secondary">
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pagamento-pix-overlay">
      <div className="pagamento-pix-modal">
        {/* Header */}
        <div className="pix-header">
          <div className="pix-title">
            <i className="fas fa-qrcode"></i>
            <h3>Pagamento PIX</h3>
          </div>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Prestador Info */}
        <div className="prestador-info">
          <h4>Contato com {prestadorNome}</h4>
          <p>Valor: <strong>R$ 2,02</strong></p>
        </div>

        {/* Timer */}
        <div className="timer-container">
          <div className="timer">
            <i className="fas fa-clock"></i>
            <span>Tempo restante: {formatarTempo(tempoRestante)}</span>
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className="status-container">
            <div 
              className="status-badge"
              style={{ backgroundColor: getStatusColor(status.status) }}
            >
              <i className="fas fa-info-circle"></i>
              Status: {getStatusText(status.status)}
            </div>
          </div>
        )}

        {/* QR Code */}
        <div className="qr-code-container">
          {pagamento.qr_code_base64 ? (
            <div className="qr-code">
              <img 
                src={`data:image/png;base64,${pagamento.qr_code_base64}`}
                alt="QR Code PIX"
              />
            </div>
          ) : (
            <div className="qr-code-placeholder">
              <i className="fas fa-qrcode"></i>
              <p>QR Code não disponível</p>
            </div>
          )}
        </div>

        {/* PIX Code */}
        {pagamento.qr_code && (
          <div className="pix-code-container">
            <label>Código PIX (Copia e Cola):</label>
            <div className="pix-code">
              <input 
                type="text" 
                value={pagamento.qr_code} 
                readOnly 
                className="pix-input"
              />
              <button 
                onClick={copiarPix}
                className={`copy-btn ${copiado ? 'copied' : ''}`}
              >
                <i className={`fas ${copiado ? 'fa-check' : 'fa-copy'}`}></i>
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="instructions">
          <h4>Como pagar:</h4>
          <ol>
            <li>Abra o app do seu banco</li>
            <li>Escolha a opção PIX</li>
            <li>Escaneie o QR Code ou cole o código</li>
            <li>Confirme o pagamento de R$ 2,02</li>
            <li>Aguarde a confirmação automática</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="pix-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          {status?.status === 'approved' && (
            <button 
              onClick={handlePagamentoAprovado}
              className="btn-primary"
            >
              <i className="fab fa-whatsapp"></i>
              Ir para WhatsApp
            </button>
          )}
        </div>

        <style jsx>{`
          .pagamento-pix-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 1rem;
          }

          .pagamento-pix-modal {
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 2rem;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            backdrop-filter: blur(20px);
          }

          .pix-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .pix-title {
            display: flex;
            align-items: center;
            gap: 0.8rem;
          }

          .pix-title i {
            color: #00FFFF;
            font-size: 1.5rem;
          }

          .pix-title h3 {
            margin: 0;
            background: linear-gradient(135deg, #FFD700, #00FFFF);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .close-btn {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            font-size: 1.2rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: all 0.3s ease;
          }

          .close-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
          }

          .prestador-info {
            text-align: center;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
          }

          .prestador-info h4 {
            margin: 0 0 0.5rem 0;
            color: white;
          }

          .prestador-info p {
            margin: 0;
            color: rgba(255, 255, 255, 0.8);
          }

          .timer-container {
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .timer {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(255, 152, 0, 0.1);
            color: #FF9800;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            border: 1px solid rgba(255, 152, 0, 0.3);
          }

          .status-container {
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: 600;
          }

          .qr-code-container {
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .qr-code {
            display: inline-block;
            padding: 1rem;
            background: white;
            border-radius: 12px;
          }

          .qr-code img {
            width: 200px;
            height: 200px;
            display: block;
          }

          .qr-code-placeholder {
            padding: 2rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            color: rgba(255, 255, 255, 0.5);
          }

          .qr-code-placeholder i {
            font-size: 3rem;
            margin-bottom: 1rem;
          }

          .pix-code-container {
            margin-bottom: 1.5rem;
          }

          .pix-code-container label {
            display: block;
            margin-bottom: 0.5rem;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
          }

          .pix-code {
            display: flex;
            gap: 0.5rem;
          }

          .pix-input {
            flex: 1;
            padding: 0.8rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            font-size: 0.8rem;
            font-family: monospace;
          }

          .copy-btn {
            background: #00FFFF;
            color: #000;
            border: none;
            padding: 0.8rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.3rem;
            white-space: nowrap;
          }

          .copy-btn:hover {
            background: #00E6E6;
          }

          .copy-btn.copied {
            background: #4CAF50;
            color: white;
          }

          .instructions {
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
          }

          .instructions h4 {
            margin: 0 0 0.8rem 0;
            color: white;
          }

          .instructions ol {
            margin: 0;
            padding-left: 1.2rem;
            color: rgba(255, 255, 255, 0.8);
          }

          .instructions li {
            margin-bottom: 0.3rem;
            font-size: 0.9rem;
          }

          .pix-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .btn-primary, .btn-secondary {
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .btn-primary {
            background: #25D366;
            color: white;
          }

          .btn-primary:hover {
            background: #128C7E;
          }

          .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.2);
          }

          .loading-content, .error-content {
            text-align: center;
            padding: 2rem;
          }

          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid #00FFFF;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }

          .error-content i {
            font-size: 3rem;
            color: #f44336;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @media (max-width: 768px) {
            .pagamento-pix-modal {
              padding: 1.5rem;
              margin: 0.5rem;
            }

            .qr-code img {
              width: 150px;
              height: 150px;
            }

            .pix-code {
              flex-direction: column;
            }

            .pix-actions {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

export default PagamentoPix