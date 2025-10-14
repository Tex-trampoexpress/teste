import React from 'react'
import PaymentScreen from '../PaymentScreen'

interface NavigationState {
  screen: string
  data?: any
}

interface PaymentScreenWrapperProps {
  navigationHistory: NavigationState[]
  goBack: () => void
  handlePaymentSuccess: () => void
}

const PaymentScreenWrapper: React.FC<PaymentScreenWrapperProps> = ({
  navigationHistory,
  goBack,
  handlePaymentSuccess
}) => {
  const paymentData = navigationHistory[navigationHistory.length - 1]?.data

  if (!paymentData) {
    return (
      <div className="payment-error">
        <h3>Erro nos dados de pagamento</h3>
        <button onClick={goBack}>Voltar</button>
      </div>
    )
  }

  return (
    <PaymentScreen
      prestadorId={paymentData.prestadorId}
      prestadorNome={paymentData.prestadorNome}
      prestadorWhatsApp={paymentData.prestadorWhatsApp}
      clienteId={paymentData.clienteId}
      onBack={goBack}
      onSuccess={handlePaymentSuccess}
    />
  )
}

export default PaymentScreenWrapper
