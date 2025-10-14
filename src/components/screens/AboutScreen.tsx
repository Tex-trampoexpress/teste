import React from 'react'

interface AboutScreenProps {
  renderBackButton: () => React.ReactNode
}

const AboutScreen: React.FC<AboutScreenProps> = ({ renderBackButton }) => {
  return (
    <div className="content-container">
      {renderBackButton()}
      <h1 className="page-title">
        <i className="fas fa-info-circle"></i>
        Sobre o TEX
      </h1>

      <div className="about-content">
        <div className="content-section">
          <p className="intro-text">
            O <strong>TEX (TrampoExpress)</strong> é a plataforma que conecta profissionais qualificados
            a pessoas que precisam de serviços de qualidade, de forma rápida e segura.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <i className="fas fa-search"></i>
              <h3>Busca Inteligente</h3>
              <p>Encontre profissionais por localização, especialidade ou avaliação</p>
            </div>

            <div className="feature-card">
              <i className="fas fa-map-marker-alt"></i>
              <h3>Proximidade</h3>
              <p>Localize profissionais próximos a você com precisão GPS</p>
            </div>

            <div className="feature-card">
              <i className="fab fa-whatsapp"></i>
              <h3>Contato Direto</h3>
              <p>Comunicação direta via WhatsApp, sem intermediários</p>
            </div>

            <div className="feature-card">
              <i className="fas fa-shield-alt"></i>
              <h3>Segurança</h3>
              <p>Perfis verificados e sistema seguro de contatos</p>
            </div>
          </div>

          <div className="warning-box">
            <i className="fas fa-exclamation-triangle"></i>
            <p>
              <strong>Importante:</strong> O TEX é uma plataforma de conexão.
              Não nos responsabilizamos pela qualidade dos serviços prestados.
              Sempre verifique referências e negocie diretamente com o profissional.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutScreen
