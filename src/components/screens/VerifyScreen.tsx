import React from 'react'

interface VerifyScreenProps {
  whatsappNumber: string
  onWhatsappChange: (value: string) => void
  handleWhatsAppVerification: () => void
  isVerifying: boolean
  renderBackButton: () => React.ReactNode
}

const TextInput = ({ value, onChange, placeholder, type = 'text', maxLength }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  maxLength?: number
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      autoComplete="off"
    />
  )
}

const VerifyScreen: React.FC<VerifyScreenProps> = ({
  whatsappNumber,
  onWhatsappChange,
  handleWhatsAppVerification,
  isVerifying,
  renderBackButton
}) => {
  return (
    <div className="form-container">
      {renderBackButton()}
      <h2>Entrar com WhatsApp</h2>
      <p>Digite seu número do WhatsApp para entrar ou criar sua conta</p>

      <div className="phone-input">
        <span className="country-code">+55</span>
        <TextInput
          type="tel"
          value={whatsappNumber}
          onChange={onWhatsappChange}
          placeholder="11999887766"
          maxLength={11}
        />
      </div>

      <div className="info-box">
        <i className="fab fa-whatsapp"></i>
        <p>Usamos o WhatsApp apenas para identificação. Não enviamos mensagens automáticas.</p>
      </div>

      <button
        className="verify-btn"
        onClick={handleWhatsAppVerification}
        disabled={isVerifying}
      >
        {isVerifying ? (
          <>
            <i className="fas fa-spinner fa-spin"></i>
            Verificando...
          </>
        ) : (
          <>
            <i className="fab fa-whatsapp"></i>
            Continuar
          </>
        )}
      </button>
    </div>
  )
}

export default VerifyScreen
