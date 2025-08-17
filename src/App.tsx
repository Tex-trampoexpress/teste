import React, { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { DatabaseService, type Usuario } from './lib/database'
import PWAInstallPrompt from './components/PWAInstallPrompt'

// Navigation history management
const navigationHistory: string[] = []

function App() {
  // State management
  const [currentScreen, setCurrentScreen] = useState('home')
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [proximityEnabled, setProximityEnabled] = useState(false)
  const [proximityRadius, setProximityRadius] = useState(10)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Form states
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [profileData, setProfileData] = useState({
    nome: '',
    descricao: '',
    tags: [] as string[],
    foto_url: '',
    localizacao: '',
    status: 'available' as 'available' | 'busy',
    latitude: null as number | null,
    longitude: null as number | null
  })

  // Navigation functions
  const navigateTo = (screen: string) => {
    if (currentScreen !== screen) {
      navigationHistory.push(currentScreen)
      setCurrentScreen(screen)
    }
  }

  const goBack = () => {
    if (navigationHistory.length > 0) {
      const previousScreen = navigationHistory.pop()
      if (previousScreen) {
        setCurrentScreen(previousScreen)
      }
    } else {
      setCurrentScreen('home')
    }
  }

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      goBack()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Load user data on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('tex-user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setIsLoggedIn(true)
        if (user.perfil_completo) {
          loadUsuarios()
        }
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error)
        localStorage.removeItem('tex-user')
      }
    }
  }, [])

  // WhatsApp login
  const handleWhatsAppLogin = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Digite seu número do WhatsApp')
      return
    }

    setLoading(true)
    try {
      const cleanNumber = whatsappNumber.replace(/\D/g, '')
      if (cleanNumber.length < 10) {
        toast.error('Número de WhatsApp inválido')
        return
      }

      const formattedNumber = `+55${cleanNumber}`
      const existingUser = await DatabaseService.getUsuarioByWhatsApp(formattedNumber)

      if (existingUser) {
        setCurrentUser(existingUser)
        setIsLoggedIn(true)
        localStorage.setItem('tex-user', JSON.stringify(existingUser))
        
        if (existingUser.perfil_completo) {
          toast.success(`Bem-vindo de volta, ${existingUser.nome}!`)
          navigateTo('feed')
          loadUsuarios()
        } else {
          toast.success('Complete seu perfil para continuar')
          setProfileData({
            nome: existingUser.nome || '',
            descricao: existingUser.descricao || '',
            tags: existingUser.tags || [],
            foto_url: existingUser.foto_url || '',
            localizacao: existingUser.localizacao || '',
            status: existingUser.status || 'available',
            latitude: existingUser.latitude,
            longitude: existingUser.longitude
          })
          navigateTo('profile-setup')
        }
      } else {
        // New user - create basic profile
        const newUserId = crypto.randomUUID()
        setCurrentUser({
          id: newUserId,
          nome: '',
          whatsapp: formattedNumber,
          descricao: '',
          tags: [],
          foto_url: '',
          localizacao: '',
          status: 'available',
          latitude: null,
          longitude: null,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          ultimo_acesso: new Date().toISOString(),
          perfil_completo: false,
          verificado: false
        })
        setIsLoggedIn(true)
        setProfileData({
          nome: '',
          descricao: '',
          tags: [],
          foto_url: '',
          localizacao: '',
          status: 'available',
          latitude: null,
          longitude: null
        })
        toast.success('Vamos criar seu perfil!')
        navigateTo('profile-setup')
      }
    } catch (error) {
      console.error('Erro no login:', error)
      toast.error('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Load users
  const loadUsuarios = async () => {
    setLoading(true)
    try {
      let users: Usuario[] = []

      if (proximityEnabled && userLocation) {
        users = await DatabaseService.getUsersByProximity(
          userLocation.lat,
          userLocation.lng,
          proximityRadius
        )
      } else {
        users = await DatabaseService.getUsuarios({
          search: searchTerm,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          status: 'available',
          limit: 50
        })
      }

      setUsuarios(users)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar profissionais')
    } finally {
      setLoading(false)
    }
  }

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(location)
        setProximityEnabled(true)
        toast.success('Localização obtida!')
        loadUsuarios()
        setLoading(false)
      },
      (error) => {
        console.error('Erro ao obter localização:', error)
        toast.error('Erro ao obter localização')
        setLoading(false)
      }
    )
  }

  // Save profile
  const handleSaveProfile = async () => {
    if (!profileData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    if (!profileData.descricao.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }
    if (profileData.tags.length === 0) {
      toast.error('Adicione pelo menos uma especialidade')
      return
    }

    if (!currentUser) return

    setLoading(true)
    try {
      let savedUser: Usuario

      if (currentUser.perfil_completo) {
        // Update existing profile
        savedUser = await DatabaseService.updateUsuario(currentUser.id, profileData)
        toast.success('Perfil atualizado com sucesso!')
      } else {
        // Create new profile
        savedUser = await DatabaseService.createUsuario({
          id: currentUser.id,
          nome: profileData.nome,
          whatsapp: currentUser.whatsapp,
          descricao: profileData.descricao,
          tags: profileData.tags,
          foto_url: profileData.foto_url || undefined,
          localizacao: profileData.localizacao || undefined,
          status: profileData.status,
          latitude: profileData.latitude || undefined,
          longitude: profileData.longitude || undefined
        })
        toast.success('Perfil criado com sucesso!')
      }

      setCurrentUser(savedUser)
      localStorage.setItem('tex-user', JSON.stringify(savedUser))
      
      if (savedUser.perfil_completo) {
        navigateTo('feed')
        loadUsuarios()
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Logout
  const handleLogout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    localStorage.removeItem('tex-user')
    setCurrentScreen('home')
    toast.success('Logout realizado com sucesso')
  }

  // Contact via WhatsApp
  const handleContact = (user: Usuario) => {
    const message = `Olá! Vi seu perfil no TEX e gostaria de conversar sobre seus serviços.`
    const whatsappUrl = `https://wa.me/55${user.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  // Add tag
  const addTag = (tag: string) => {
    if (tag.trim() && !profileData.tags.includes(tag.trim())) {
      setProfileData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Filter by tag
  const filterByTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag))
    } else {
      setSelectedTags(prev => [...prev, tag])
    }
  }

  // Clear search
  const clearSearch = () => {
    setSearchTerm('')
    setSelectedTags([])
    setProximityEnabled(false)
    loadUsuarios()
  }

  return (
    <div className="App">
      <Toaster position="top-center" />
      <PWAInstallPrompt />

      {/* Profile Header Button */}
      {isLoggedIn && currentUser && (
        <>
          <button 
            className="profile-header-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            {currentUser.foto_url ? (
              <img src={currentUser.foto_url} alt={currentUser.nome} />
            ) : null}
            <i className="fas fa-user"></i>
          </button>

          {showProfileMenu && (
            <>
              <div 
                className="profile-menu-overlay"
                onClick={() => setShowProfileMenu(false)}
              ></div>
              <div className="profile-menu">
                <div className="profile-menu-content">
                  <div className="profile-menu-header">
                    <div className="profile-menu-avatar">
                      {currentUser.foto_url ? (
                        <img src={currentUser.foto_url} alt={currentUser.nome} />
                      ) : (
                        <i className="fas fa-user"></i>
                      )}
                    </div>
                    <div className="profile-menu-info">
                      <h4>{currentUser.nome || 'Usuário'}</h4>
                      <p>{currentUser.whatsapp}</p>
                    </div>
                  </div>
                  <div className="profile-menu-actions">
                    <button 
                      className="profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false)
                        navigateTo('my-profile')
                      }}
                    >
                      <i className="fas fa-user"></i>
                      Meu Perfil
                    </button>
                    <button 
                      className="profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false)
                        navigateTo('feed')
                      }}
                    >
                      <i className="fas fa-search"></i>
                      Explorar
                    </button>
                    <div className="profile-menu-divider"></div>
                    <button 
                      className="profile-menu-item logout"
                      onClick={() => {
                        setShowProfileMenu(false)
                        handleLogout()
                      }}
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Back Button */}
      {currentScreen !== 'home' && (
        <div className="back-button-container">
          <button className="back-button" onClick={goBack}>
            <i className="fas fa-arrow-left"></i>
            Voltar
          </button>
        </div>
      )}

      {/* Home Screen */}
      <div className={`screen ${currentScreen === 'home' ? 'active' : ''}`}>
        <div className="hero-container">
          <div className="tex-logo-container-inside">
            <div className="tex-logo-text-inside">TEX</div>
          </div>
          
          <h1>
            Do trampo
            <span>ao encontro</span>
          </h1>

          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar profissionais, serviços ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <button 
              className="explore-btn"
              onClick={() => {
                navigateTo('feed')
                loadUsuarios()
              }}
            >
              Explorar Profissionais
            </button>
          </div>

          {!isLoggedIn && (
            <button 
              className="whatsapp-login-btn"
              onClick={() => navigateTo('verify')}
            >
              <i className="fab fa-whatsapp"></i>
              Entrar com WhatsApp
            </button>
          )}

          <div className="location-status">
            {!userLocation ? (
              <button 
                className="location-enable-btn"
                onClick={getUserLocation}
                disabled={loading}
              >
                <i className="fas fa-map-marker-alt"></i>
                {loading ? 'Obtendo localização...' : 'Ativar localização'}
              </button>
            ) : (
              <p className="location-gps-status">
                <i className="fas fa-check-circle"></i>
                Localização ativada
              </p>
            )}
          </div>

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
      </div>

      {/* Verify Screen */}
      <div className={`screen ${currentScreen === 'verify' ? 'active' : ''}`}>
        <div className="form-container">
          <h2>Entrar no TEX</h2>
          <p>Digite seu número do WhatsApp para entrar ou criar sua conta</p>
          
          <div className="phone-input">
            <span className="country-code">+55</span>
            <input
              type="tel"
              placeholder="11999887766"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              maxLength={11}
            />
          </div>

          <div className="info-box">
            <i className="fab fa-whatsapp"></i>
            <p>Usamos o WhatsApp apenas para identificação. Não enviamos mensagens automáticas.</p>
          </div>

          <button 
            className="verify-btn"
            onClick={handleWhatsAppLogin}
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Continuar'}
          </button>
        </div>
      </div>

      {/* Profile Setup Screen */}
      <div className={`screen ${currentScreen === 'profile-setup' ? 'active' : ''}`}>
        <div className="form-container">
          <h2>{currentUser?.perfil_completo ? 'Editar Perfil' : 'Criar Perfil'}</h2>
          <p>Complete suas informações profissionais</p>

          <div className="profile-setup">
            <div className="photo-upload">
              <div className="photo-preview">
                {profileData.foto_url ? (
                  <img src={profileData.foto_url} alt="Foto do perfil" />
                ) : (
                  <i className="fas fa-camera"></i>
                )}
              </div>
              <label htmlFor="photo-input">
                {profileData.foto_url ? 'Alterar Foto' : 'Adicionar Foto'}
              </label>
              <input
                id="photo-input"
                type="url"
                placeholder="URL da foto"
                value={profileData.foto_url}
                onChange={(e) => setProfileData(prev => ({ ...prev, foto_url: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Nome Completo *</label>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={profileData.nome}
                onChange={(e) => setProfileData(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Descrição Profissional *</label>
              <textarea
                placeholder="Descreva seus serviços e experiência..."
                value={profileData.descricao}
                onChange={(e) => setProfileData(prev => ({ ...prev, descricao: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Especialidades *</label>
              <div className="tags-input">
                <input
                  type="text"
                  placeholder="Digite uma especialidade e pressione Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <div className="tags-container">
                  {profileData.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                      <i 
                        className="fas fa-times"
                        onClick={() => removeTag(tag)}
                      ></i>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Localização</label>
              <input
                type="text"
                placeholder="Cidade, Estado"
                value={profileData.localizacao}
                onChange={(e) => setProfileData(prev => ({ ...prev, localizacao: e.target.value }))}
              />
              
              <div className="location-gps-option">
                {!profileData.latitude ? (
                  <button 
                    type="button"
                    className="location-gps-btn"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setProfileData(prev => ({
                              ...prev,
                              latitude: position.coords.latitude,
                              longitude: position.coords.longitude
                            }))
                            toast.success('Localização GPS obtida!')
                          },
                          (error) => {
                            console.error('Erro GPS:', error)
                            toast.error('Erro ao obter localização GPS')
                          }
                        )
                      }
                    }}
                  >
                    <i className="fas fa-crosshairs"></i>
                    Usar GPS
                  </button>
                ) : (
                  <p className="location-gps-status">
                    <i className="fas fa-check-circle"></i>
                    Localização GPS ativada
                  </p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Status de Disponibilidade</label>
              <div className="status-toggle">
                <button
                  type="button"
                  className={`status-btn ${profileData.status === 'available' ? 'active' : ''}`}
                  onClick={() => setProfileData(prev => ({ ...prev, status: 'available' }))}
                >
                  <span className="dot available"></span>
                  Disponível
                </button>
                <button
                  type="button"
                  className={`status-btn ${profileData.status === 'busy' ? 'active' : ''}`}
                  onClick={() => setProfileData(prev => ({ ...prev, status: 'busy' }))}
                >
                  <span className="dot busy"></span>
                  Ocupado
                </button>
              </div>
            </div>

            <div className="whatsapp-preview">
              <h4>Prévia do Contato</h4>
              <div className="contact-preview">
                <i className="fab fa-whatsapp"></i>
                {currentUser?.whatsapp || '+55 11 99999-9999'}
              </div>
            </div>

            <button 
              className="save-profile-btn"
              onClick={handleSaveProfile}
              disabled={loading}
            >
              {loading ? 'Salvando...' : (currentUser?.perfil_completo ? 'Atualizar Perfil' : 'Criar Perfil')}
            </button>
          </div>
        </div>
      </div>

      {/* Feed Screen */}
      <div className={`screen ${currentScreen === 'feed' ? 'active' : ''}`}>
        <div className="feed">
          <div className="search-header">
            <div className="search-bar">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Buscar profissionais..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  if (e.target.value.trim()) {
                    loadUsuarios()
                  }
                }}
              />
              {searchTerm && (
                <button className="clear-search" onClick={clearSearch}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            <div className="proximity-filters">
              <div className="filter-row">
                <button
                  className={`proximity-toggle ${proximityEnabled ? 'active' : ''}`}
                  onClick={() => {
                    if (userLocation) {
                      setProximityEnabled(!proximityEnabled)
                      loadUsuarios()
                    } else {
                      getUserLocation()
                    }
                  }}
                  disabled={loading}
                >
                  <i className="fas fa-map-marker-alt"></i>
                  {proximityEnabled ? 'Busca por proximidade ativa' : 'Ativar busca por proximidade'}
                </button>

                {!userLocation && (
                  <button
                    className="enable-location-btn"
                    onClick={getUserLocation}
                    disabled={loading}
                  >
                    <i className="fas fa-crosshairs"></i>
                    {loading ? 'Obtendo...' : 'GPS'}
                  </button>
                )}
              </div>

              {proximityEnabled && userLocation && (
                <div className="radius-selector">
                  <label>Raio:</label>
                  <select
                    value={proximityRadius}
                    onChange={(e) => {
                      setProximityRadius(Number(e.target.value))
                      loadUsuarios()
                    }}
                  >
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={25}>25 km</option>
                    <option value={50}>50 km</option>
                    <option value={100}>100 km</option>
                  </select>
                </div>
              )}
            </div>

            <div className="search-results-info">
              {loading ? 'Carregando...' : `${usuarios.length} profissionais encontrados`}
            </div>
          </div>

          {usuarios.length === 0 && !loading ? (
            <div className="no-results">
              <i className="fas fa-search"></i>
              <h3>Nenhum profissional encontrado</h3>
              <p>Tente ajustar os filtros de busca ou expandir a área de pesquisa</p>
              <div className="no-results-actions">
                <button className="explore-all-btn" onClick={clearSearch}>
                  Ver Todos os Profissionais
                </button>
                <button className="back-home-btn" onClick={() => navigateTo('home')}>
                  <i className="fas fa-home"></i>
                  Voltar ao Início
                </button>
              </div>
            </div>
          ) : (
            <div className="profiles-grid">
              {usuarios.map((usuario) => (
                <div key={usuario.id} className="profile-card">
                  <div className="profile-header">
                    <div className="profile-pic">
                      {usuario.foto_url ? (
                        <img src={usuario.foto_url} alt={usuario.nome} />
                      ) : (
                        <i className="fas fa-user"></i>
                      )}
                    </div>
                    <div className="profile-info">
                      <div className="profile-name-distance">
                        <h2>{usuario.nome}</h2>
                        {usuario.distancia && (
                          <span className="distance-badge">
                            <i className="fas fa-map-marker-alt"></i>
                            {usuario.distancia.toFixed(1)} km
                          </span>
                        )}
                      </div>
                      <p className="description">{usuario.descricao}</p>
                      {usuario.localizacao && (
                        <p className="location">
                          <i className="fas fa-map-marker-alt"></i>
                          {usuario.localizacao}
                        </p>
                      )}
                      <span className={`status status-${usuario.status}`}>
                        {usuario.status === 'available' ? 'Disponível' : 'Ocupado'}
                      </span>
                    </div>
                  </div>

                  <div className="hashtags">
                    {usuario.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="tag-clickable"
                        onClick={() => filterByTag(tag)}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <button 
                    className="whatsapp-btn"
                    onClick={() => handleContact(usuario)}
                  >
                    <i className="fab fa-whatsapp"></i>
                    Entrar em Contato
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Profile Screen */}
      <div className={`screen ${currentScreen === 'my-profile' ? 'active' : ''}`}>
        <div className="my-profile-content">
          {currentUser ? (
            <>
              <div className="profile-card">
                <div className="profile-header">
                  <div className="profile-pic">
                    {currentUser.foto_url ? (
                      <img src={currentUser.foto_url} alt={currentUser.nome} />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>
                  <div className="profile-info">
                    <h2>{currentUser.nome}</h2>
                    <p className="description">{currentUser.descricao}</p>
                    {currentUser.localizacao && (
                      <p className="location">
                        <i className="fas fa-map-marker-alt"></i>
                        {currentUser.localizacao}
                      </p>
                    )}
                    
                    <div className="status-toggle-profile">
                      <button
                        className={`status-btn-profile ${currentUser.status === 'available' ? 'active' : ''}`}
                        onClick={async () => {
                          try {
                            const updatedUser = await DatabaseService.updateStatus(currentUser.id, 'available')
                            setCurrentUser(updatedUser)
                            localStorage.setItem('tex-user', JSON.stringify(updatedUser))
                            toast.success('Status atualizado para Disponível')
                          } catch (error) {
                            toast.error('Erro ao atualizar status')
                          }
                        }}
                      >
                        <span className="dot available"></span>
                        Disponível
                      </button>
                      <button
                        className={`status-btn-profile ${currentUser.status === 'busy' ? 'active' : ''}`}
                        onClick={async () => {
                          try {
                            const updatedUser = await DatabaseService.updateStatus(currentUser.id, 'busy')
                            setCurrentUser(updatedUser)
                            localStorage.setItem('tex-user', JSON.stringify(updatedUser))
                            toast.success('Status atualizado para Ocupado')
                          } catch (error) {
                            toast.error('Erro ao atualizar status')
                          }
                        }}
                      >
                        <span className="dot busy"></span>
                        Ocupado
                      </button>
                    </div>
                  </div>
                </div>

                <div className="hashtags">
                  {currentUser.tags.map((tag, index) => (
                    <span key={index}>#{tag}</span>
                  ))}
                </div>

                <div className="profile-stats">
                  <div className="stat">
                    <i className="fas fa-calendar-alt"></i>
                    <span>Membro desde {new Date(currentUser.criado_em).toLocaleDateString()}</span>
                  </div>
                  <div className="stat">
                    <i className="fas fa-clock"></i>
                    <span>Último acesso: {new Date(currentUser.ultimo_acesso).toLocaleDateString()}</span>
                  </div>
                  <div className="stat">
                    <i className="fas fa-check-circle"></i>
                    <span>Perfil {currentUser.perfil_completo ? 'completo' : 'incompleto'}</span>
                  </div>
                  {currentUser.verificado && (
                    <div className="stat">
                      <i className="fas fa-verified"></i>
                      <span>Perfil verificado</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-actions">
                <button 
                  className="edit-profile-btn"
                  onClick={() => {
                    setProfileData({
                      nome: currentUser.nome,
                      descricao: currentUser.descricao || '',
                      tags: currentUser.tags,
                      foto_url: currentUser.foto_url || '',
                      localizacao: currentUser.localizacao || '',
                      status: currentUser.status,
                      latitude: currentUser.latitude,
                      longitude: currentUser.longitude
                    })
                    navigateTo('profile-setup')
                  }}
                >
                  <i className="fas fa-edit"></i>
                  Editar Perfil
                </button>

                <button 
                  className="delete-profile-btn"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir seu perfil? Esta ação não pode ser desfeita.')) {
                      DatabaseService.deleteUsuario(currentUser.id)
                        .then(() => {
                          handleLogout()
                          toast.success('Perfil excluído com sucesso')
                        })
                        .catch(() => {
                          toast.error('Erro ao excluir perfil')
                        })
                    }
                  }}
                >
                  <i className="fas fa-trash"></i>
                  Excluir Perfil
                </button>
              </div>
            </>
          ) : (
            <div className="no-profile">
              <h3>Nenhum perfil encontrado</h3>
              <p>Faça login para ver seu perfil</p>
              <button 
                className="create-profile-btn"
                onClick={() => navigateTo('verify')}
              >
                Fazer Login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* About Screen */}
      <div className={`screen ${currentScreen === 'about' ? 'active' : ''}`}>
        <div className="content-container">
          <h1 className="page-title">
            <i className="fas fa-info-circle"></i>
            Sobre o TEX
          </h1>
          
          <div className="about-content">
            <div className="content-section">
              <p className="intro-text">
                O TEX (TrampoExpress) é a plataforma que conecta profissionais qualificados 
                a pessoas que precisam de serviços de qualidade, de forma rápida e segura.
              </p>

              <div className="features-grid">
                <div className="feature-card">
                  <i className="fas fa-search"></i>
                  <h3>Busca Inteligente</h3>
                  <p>Encontre profissionais por localização, especialidade ou proximidade usando GPS.</p>
                </div>

                <div className="feature-card">
                  <i className="fab fa-whatsapp"></i>
                  <h3>Contato Direto</h3>
                  <p>Comunicação direta via WhatsApp, sem intermediários ou taxas adicionais.</p>
                </div>

                <div className="feature-card">
                  <i className="fas fa-shield-alt"></i>
                  <h3>Segurança</h3>
                  <p>Perfis verificados e sistema seguro para proteger sua privacidade.</p>
                </div>

                <div className="feature-card">
                  <i className="fas fa-mobile-alt"></i>
                  <h3>Mobile First</h3>
                  <p>Aplicativo otimizado para celular, funciona offline e pode ser instalado.</p>
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
      </div>

      {/* Terms Screen */}
      <div className={`screen ${currentScreen === 'terms' ? 'active' : ''}`}>
        <div className="content-container">
          <h1 className="page-title">
            <i className="fas fa-file-contract"></i>
            Termos de Uso
          </h1>
          
          <div className="terms-content">
            <div className="terms-section">
              <h2>
                <i className="fas fa-handshake"></i>
                1. Aceitação dos Termos
              </h2>
              <p>
                Ao usar o TEX, você concorda com estes termos. Se não concordar, 
                não use nossos serviços.
              </p>
            </div>

            <div className="terms-section">
              <h2>
                <i className="fas fa-user-check"></i>
                2. Uso da Plataforma
              </h2>
              <p>O TEX conecta prestadores de serviços e clientes. Você se compromete a:</p>
              <ul>
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Usar a plataforma de forma legal e ética</li>
                <li>Respeitar outros usuários</li>
                <li>Não criar perfis falsos ou enganosos</li>
              </ul>
            </div>

            <div className="terms-section">
              <h2>
                <i className="fas fa-exclamation-circle"></i>
                3. Responsabilidades
              </h2>
              <p>O TEX <span className="highlight">NÃO se responsabiliza</span> por:</p>
              <ul>
                <li>Qualidade dos serviços prestados</li>
                <li>Disputas entre usuários</li>
                <li>Danos ou prejuízos decorrentes do uso</li>
                <li>Conteúdo publicado pelos usuários</li>
              </ul>
            </div>

            <div className="terms-section">
              <h2>
                <i className="fas fa-lock"></i>
                4. Privacidade e Dados
              </h2>
              <p>
                Coletamos apenas dados essenciais para o funcionamento da plataforma. 
                Seus dados não são vendidos a terceiros.
              </p>
            </div>

            <div className="terms-section coming-soon">
              <h2>
                <i className="fas fa-credit-card"></i>
                5. Pagamentos
                <span className="badge">Em Breve</span>
              </h2>
              <p>
                Futuramente, a plataforma poderá incluir sistema de pagamentos integrado 
                com taxas de serviço transparentes.
              </p>
            </div>

            <div className="terms-section">
              <h2>
                <i className="fas fa-edit"></i>
                6. Modificações
              </h2>
              <p>
                Podemos alterar estes termos a qualquer momento. Mudanças importantes 
                serão comunicadas aos usuários.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App