import React from 'react'

interface HomeScreenProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onSearchEnter: () => void
  navigateTo: (screen: string) => void
  locationStatus: 'idle' | 'requesting' | 'granted' | 'denied'
  requestLocation: () => void
  renderProfileHeader: () => React.ReactNode
}

const SearchInput = ({ value, onChange, onEnter, placeholder }: {
  value: string
  onChange: (value: string) => void
  onEnter: () => void
  placeholder: string
}) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onEnter()
        }
      }}
      autoComplete="off"
    />
  )
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearchEnter,
  navigateTo,
  locationStatus,
  requestLocation,
  renderProfileHeader
}) => {
  return (
    <div className="hero-container">
      <header className="hero-header">
        <div className="tex-logo-container-inside">
          <div className="tex-logo-text-inside">TEX</div>
        </div>
        <p className="hero-tagline">Do trampo ao encontro</p>
        <p className="hero-brand">TrampoExpress</p>
      </header>

      <main className="hero-main">
        <div className="cta-section">
          <button
            className="explore-btn-large primary"
            onClick={() => navigateTo('feed')}
          >
            <i className="fas fa-search"></i>
            Explorar Profissionais Próximos
          </button>
          <p className="explore-subtitle">Encontre prestadores de serviço perto de você agora!</p>
        </div>

        <div className="actions-section">
          <div className="location-toggle">
            {locationStatus === 'idle' && (
              <button className="toggle-btn-medium" onClick={requestLocation}>
                <i className="fas fa-globe"></i>
                <span>Ativar Localização</span>
                <div className="toggle-indicator off"></div>
              </button>
            )}
            {locationStatus === 'requesting' && (
              <button className="toggle-btn-medium loading" disabled>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Obtendo localização...</span>
                <div className="toggle-indicator loading"></div>
              </button>
            )}
            {locationStatus === 'granted' && (
              <div className="toggle-btn-medium active">
                <i className="fas fa-globe"></i>
                <span>Localização Ativada</span>
                <div className="toggle-indicator on"></div>
              </div>
            )}
          </div>

          {renderProfileHeader()}
        </div>
      </main>

      <footer className="hero-footer">
        <nav className="hero-footer-nav">
          <button onClick={() => navigateTo('about')}>Sobre</button>
          <span className="footer-separator">•</span>
          <button onClick={() => navigateTo('terms')}>Termos</button>
          <span className="footer-separator">•</span>
          <a href="https://wa.me/5548996357648?text=Olá,%20preciso%20de%20suporte%20com%20o%20TrampoExpress" target="_blank" rel="noopener noreferrer">Suporte</a>
        </nav>
        <div className="hero-copyright">
          © 2025 TrampoExpress
        </div>
      </footer>
    </div>
  )
}

export default HomeScreen
