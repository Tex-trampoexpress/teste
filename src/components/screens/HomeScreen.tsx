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
      <div className="tex-logo-container-inside">
        <div className="tex-logo-text-inside">TEX</div>
      </div>

      <h1>
        Do trampo
        <span>ao encontro</span>
      </h1>

      <div className="trampoexpress-subtitle">TrampoExpress</div>

      <div className="search-box">
        <SearchInput
          value={searchTerm}
          onChange={onSearchTermChange}
          onEnter={onSearchEnter}
          placeholder="Buscar profissionais, serviços ou localização..."
        />

        <button
          className="explore-btn"
          onClick={() => navigateTo('feed')}
        >
          <i className="fas fa-search"></i>
          Explorar Profissionais
        </button>
      </div>

      <div className="location-status">
        {locationStatus === 'idle' && (
          <button className="location-enable-btn" onClick={requestLocation}>
            <i className="fas fa-map-marker-alt"></i>
            Ativar Localização
          </button>
        )}
        {locationStatus === 'requesting' && (
          <button className="location-enable-btn" disabled>
            <i className="fas fa-spinner fa-spin"></i>
            Obtendo localização...
          </button>
        )}
        {locationStatus === 'granted' && (
          <p style={{ color: 'var(--cyan)', textAlign: 'center' }}>
            <i className="fas fa-check-circle"></i>
            Localização ativada
          </p>
        )}
      </div>

      {renderProfileHeader()}

      <div className="hero-footer-info">
        <nav className="hero-footer-nav">
          <button onClick={() => navigateTo('about')}>Sobre</button>
          <button onClick={() => navigateTo('terms')}>Termos</button>
          <a href="#" onClick={(e) => e.preventDefault()}>Contato</a>
        </nav>
        <div className="hero-copyright">
          © 2025 TrampoExpress. Conectando talentos.
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
