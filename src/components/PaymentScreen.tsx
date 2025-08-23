import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

interface PaymentData {
  id: string
  status: string
  qr_code_base64: string
  qr_code: string
  ticket_url: string
  expires_at?: string
}

interface PaymentScreenProps {
  prestadorId: string
  prestadorNome: string
  prestadorWhatsApp: string
  clienteId: string
  onBack: () => void
  onSuccess: () => void
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({
  prestadorId,
  prestadorNome,
  prestadorWhatsApp,
  clienteId,
  onBack,
  onSuccess
}) => {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createPayment()
  }, [])

  const createPayment = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('💳 Criando pagamento PIX...')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cliente_id: clienteId,
          prestador_id: prestadorId,
          amount: 2.02
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Pagamento criado:', data)

      setPaymentData(data)
      toast.success('PIX gerado com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao criar pagamento:', error)
      setError(`Erro ao gerar PIX: ${error.message}`)
      toast.error('Erro ao gerar PIX')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!paymentData) return

    try {
      setChecking(true)
      console.log('🔍 Verificando status do pagamento...')

      // Verificar no banco de dados primeiro
      const { data: transacao } = await supabase
        .from('transacoes')
        .select('status')
        .eq('mp_payment_id', paymentData.id)
        .single()

      if (transacao?.status === 'approved') {
        console.log('✅ Pagamento aprovado no banco!')
        toast.success('Pagamento confirmado!')
        onSuccess()
        return
      }

      // Se não encontrou no banco ou não está aprovado, verificar na API
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentData.id}`, {
        headers: {
          'Authorization': 'Bearer APP_USR-4728982243585143-081621-b2dc4884ccf718292015c3b9990e924e-2544542050'
        }
      })

      if (response.ok) {
        const mpData = await response.json()
        console.log('📊 Status na API:', mpData.status)

        if (mpData.status === 'approved') {
          toast.success('Pagamento confirmado!')
          onSuccess()
        } else if (mpData.status === 'pending') {
          toast.error('Pagamento ainda não foi efetuado. Aguarde alguns instantes após o pagamento.')
        } else if (mpData.status === 'rejected') {
          toast.error('Pagamento foi rejeitado. Tente novamente.')
        } else if (mpData.status === 'cancelled') {
          toast.error('Pagamento foi cancelado.')
        } else {
          toast.error(`Status do pagamento: ${mpData.status}`)
        }
      } else {
        toast.error('Pagamento ainda não foi efetuado. Aguarde alguns instantes após o pagamento.')
      }
    } catch (error) {
      console.error('❌ Erro ao verificar pagamento:', error)
      toast.error('Pagamento ainda não foi efetuado. Aguarde alguns instantes após o pagamento.')
    } finally {
      setChecking(false)
    }
  }

  const copyPixCode = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code)
      toast.success('Código PIX copiado!')
    }
  }

  if (loading) {
    return (
      <div className="payment-container">
        <div className="payment-header">
          <h2>Gerando PIX...</h2>
          <p>Aguarde enquanto preparamos seu pagamento</p>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: 'var(--cyan)' }}></i>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="payment-container">
        <div className="payment-error">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Erro no Pagamento</h3>
          <p>{error}</p>
          <button className="back-btn" onClick={onBack}>
            <i className="fas fa-arrow-left"></i>
            Voltar
          </button>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="payment-container">
        <div className="payment-error">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Erro no Pagamento</h3>
          <p>Não foi possível gerar o PIX</p>
          <button className="back-btn" onClick={onBack}>
            <i className="fas fa-arrow-left"></i>
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-container">
      <div className="payment-header">
        <h2>Pagamento PIX</h2>
        <p>Para acessar o contato de <strong>{prestadorNome}</strong></p>
      </div>

      <div className="payment-info">
        <div className="payment-amount">
          <span className="amount-label">Valor:</span>
          <span className="amount-value">R$ 2,02</span>
        </div>
        <p className="payment-description">
          Taxa para acesso ao WhatsApp do profissional
        </p>
      </div>

      {paymentData.qr_code_base64 && (
        <div className="qr-code-section">
          <h3>Escaneie o QR Code</h3>
          <div className="qr-code-container">
            <img 
              src={`data:image/png;base64,${paymentData.qr_code_base64}`}
              alt="QR Code PIX"
              className="qr-code-image"
            />
          </div>
        </div>
      )}

      <div className="pix-copy-section">
        <h3>Ou copie o código PIX</h3>
        <div className="pix-code-container">
          <input
            type="text"
            value={paymentData.qr_code}
            readOnly
            className="pix-code-input"
          />
          <button onClick={copyPixCode} className="copy-btn">
            <i className="fas fa-copy"></i>
            Copiar
          </button>
        </div>
        <p className="pix-instructions">
          Cole este código no seu app do banco para pagar via PIX
        </p>
      </div>

      <div className="payment-actions">
        <button 
          className="payment-check-btn"
          onClick={checkPaymentStatus}
          disabled={checking}
        >
          {checking ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Verificando...
            </>
          ) : (
            <>
              <i className="fas fa-check-circle"></i>
              Já Paguei
            </>
          )}
        </button>

        <button className="payment-cancel-btn" onClick={onBack}>
          <i className="fas fa-times"></i>
          Cancelar
        </button>
      </div>

      <div className="payment-help">
        <h4>Como pagar:</h4>
        <ol>
          <li>Abra o app do seu banco</li>
          <li>Escolha a opção PIX</li>
          <li>Escaneie o QR Code ou cole o código</li>
          <li>Confirme o pagamento de R$ 2,02</li>
          <li>Clique em "Já Paguei" após confirmar</li>
        </ol>
      </div>
    </div>
  )
}

export default PaymentScreen