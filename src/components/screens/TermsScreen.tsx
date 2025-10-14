import React from 'react'

interface TermsScreenProps {
  renderBackButton: () => React.ReactNode
}

const TermsScreen: React.FC<TermsScreenProps> = ({ renderBackButton }) => {
  return (
    <div className="content-container">
      {renderBackButton()}
      <h1 className="page-title">
        <i className="fas fa-file-contract"></i>
        Termos de Uso
      </h1>

      <div className="terms-content">
        <div className="terms-section">
          <h2><i className="fas fa-handshake"></i> Aceitação dos Termos</h2>
          <p>
            Ao utilizar o TEX, você concorda com estes termos de uso.
            Se não concordar, não utilize nossos serviços.
          </p>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-user-check"></i> Uso da Plataforma</h2>
          <p>O TEX é uma plataforma de conexão entre profissionais e clientes. Você se compromete a:</p>
          <ul>
            <li>Fornecer informações verdadeiras e atualizadas</li>
            <li>Usar a plataforma de forma ética e legal</li>
            <li>Respeitar outros usuários</li>
            <li>Não usar para fins fraudulentos</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-exclamation-circle"></i> Responsabilidades</h2>
          <p>O TEX <strong>NÃO</strong> se responsabiliza por:</p>
          <ul>
            <li>Qualidade dos serviços prestados</li>
            <li>Disputas entre usuários</li>
            <li>Danos ou prejuízos decorrentes do uso</li>
            <li>Veracidade das informações dos usuários</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-lock"></i> Privacidade</h2>
          <p>
            Seus dados são protegidos conforme nossa política de privacidade.
            Coletamos apenas informações necessárias para o funcionamento da plataforma.
          </p>
        </div>

        <div className="terms-section coming-soon">
          <h2>
            <i className="fas fa-credit-card"></i>
            Sistema de Pagamentos
            <span className="badge">Em Breve</span>
          </h2>
          <p>
            Estamos desenvolvendo um sistema de pagamentos seguro para facilitar
            as transações entre profissionais e clientes. Em breve você poderá:
          </p>
          <ul>
            <li>Realizar pagamentos seguros pela plataforma</li>
            <li>Receber garantias nas transações</li>
            <li>Ter suporte especializado</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-edit"></i> Modificações</h2>
          <p>
            Podemos alterar estes termos a qualquer momento.
            Alterações importantes serão comunicadas aos usuários.
          </p>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-gavel"></i> Lei Aplicável</h2>
          <p>
            Estes termos são regidos pelas leis brasileiras.
            Foro da comarca de <span className="highlight">São Paulo/SP</span>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TermsScreen
