import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { DatabaseService, Usuario } from './lib/database'
import toast, { Toaster } from 'react-hot-toast'
import PWAInstallPrompt from './components/PWAInstallPrompt'

interface UserLocation {
  latitude: number
  longitude: number
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<string>('home')
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Estados para formulários
  const [phoneNumber, setPhoneNumber] = useState('')
  const [profileData, setProfileData] = useState({
    nome: '',
    descricao: '',
    tags: [] as string[],
    foto_url: '',
    localizacao: '',
    status: 'available' as 'available' | 'busy'
  })
  const [newTag, setNewTag] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<Usuario[]>([])
  const [proximityEnabled, setProximityEnabled] = useState(false)
  const [searchRadius, setSearchRadius] = useState(10)

  // Gerenciar histórico de navegação para botão voltar nativo
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['home'])

  // Detectar scroll para logo dinâmico
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Função para navegar entre telas
  const navigateToScreen = (screen: string) => {
    setNavigationHistory(prev => [...prev, screen])
    setCurrentScreen(screen)
    setShowProfileMenu(false)
    window.scrollTo(0, 0)
  }

  // Função para voltar (compatível com botão nativo)
  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1)
      setNavigationHistory(newHistory)
      setCurrentScreen(newHistory[newHistory.length - 1])
    } else {
      setCurrentScreen('home')
      setNavigationHistory(['home'])
    }
  }

  // Interceptar botão voltar nativo do celular
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault()
      goBack()
    }

    // Adicionar estado inicial ao histórico do navegador
    window.history.replaceState({ screen: 'home' }, '', window.location.pathname)

    // Escutar mudanças no histórico
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [navigationHistory])

  // Atualizar histórico do navegador quando mudar de tela
  useEffect(() => {
    if (currentScreen !== 'home') {
      window.history.pushState({ screen: currentScreen }, '', window.location.pathname)
    }
  }, [currentScreen])

  // Verificar usuário logado ao carregar
  useEffect(() => {
    checkLoggedUser()
    checkLocationPermission()
  }, [])

  const checkLoggedUser = async () => {
    const savedPhone = localStorage.getItem('tex_user_phone')
    if (savedPhone) {
      try {
        const user = await DatabaseService.getUsuarioByWhatsApp(savedPhone)
        if (user) {
          setCurrentUser(user)
          setProfileData({
            nome: user.nome,
            descricao: user.descricao || '',
            tags: user.tags || [],
            foto_url: user.foto_url || '',
            localizacao: user.localizacao || '',
            status: user.status
          })
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error)
      }
    }
  }

  const checkLocationPermission = async () => {
    if ('geolocation' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        setLocationPermission(permission.state)
        
        if (permission.state === 'granted') {
          getCurrentLocation()
        }
      } catch (error) {
        console.log('Permissão de localização não disponível')
      }
    }
  }

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
          setLocationPermission('granted')
          // Ativar busca por proximidade automaticamente quando localização for obtida
          setProximityEnabled(true)
        },
        (error) => {
          console.error('Erro ao obter localização:', error)
          setLocationPermission('denied')
        }
      )
    }
  }

  const handleWhatsAppLogin = () => {
    if (!phoneNumber.trim()) {
      toast.error('Digite seu número do WhatsApp')
      return
    }

    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+55${phoneNumber.replace(/\D/g, '')}`
    
    if (formattedPhone.length < 13) {
      toast.error('Número do WhatsApp inválido')
      return
    }

    setIsLoading(true)
    
    // Simular verificação (em produção, seria via API)
    setTimeout(async () => {
      try {
        const existingUser = await DatabaseService.getUsuarioByWhatsApp(formattedPhone)
        
        if (existingUser) {
          setCurrentUser(existingUser)
          setProfileData({
            nome: existingUser.nome,
            descricao: existingUser.descricao || '',
            tags: existingUser.tags || [],
            foto_url: existingUser.foto_url || '',
            localizacao: existingUser.localizacao || '',
            status: existingUser.status
          })
          localStorage.setItem('tex_user_phone', formattedPhone)
          toast.success('Login realizado com sucesso!')
          navigateToScreen('feed')
        } else {
          localStorage.setItem('tex_user_phone', formattedPhone)
          setPhoneNumber(formattedPhone)
          navigateToScreen('setup')
        }
      } catch (error) {
        toast.error('Erro ao fazer login')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }, 1500)
  }

  const handleSaveProfile = async () => {
    if (!profileData.nome.trim() || !profileData.descricao.trim() || profileData.tags.length === 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsLoading(true)
    
    try {
      const userData = {
        id: crypto.randomUUID(),
        nome: profileData.nome.trim(),
        whatsapp: phoneNumber,
        descricao: profileData.descricao.trim(),
        tags: profileData.tags,
        foto_url: profileData.foto_url || null,
        localizacao: profileData.localizacao.trim() || null,
        status: profileData.status,
        latitude: userLocation?.latitude || null,
        longitude: userLocation?.longitude || null
      }

      let savedUser: Usuario

      if (currentUser) {
        savedUser = await DatabaseService.updateUsuario(currentUser.id, userData)
      } else {
        savedUser = await DatabaseService.createUsuario(userData)
      }

      setCurrentUser(savedUser)
      toast.success('Perfil salvo com sucesso!')
      navigateToScreen('feed')
    } catch (error) {
      toast.error('Erro ao salvar perfil')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !profileData.tags.includes(newTag.trim().toLowerCase())) {
      setProfileData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSearch = async () => {
    setIsLoading(true)
    try {
      let results: Usuario[] = []
      
      if (proximityEnabled && userLocation) {
        results = await DatabaseService.getUsersByProximity(
          userLocation.latitude,
          userLocation.longitude,
          searchRadius
        )
        
        // Se tem termo de busca, filtrar os resultados por proximidade
        if (searchTerm.trim()) {
          results = results.filter(user => 
            user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
            user.localizacao?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }
      } else {
        results = await DatabaseService.getUsuarios({
          search: searchTerm,
          status: 'available',
          limit: 50
        })
      }
      
      setUsers(results)
    } catch (error) {
      toast.error('Erro na busca')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTagClick = async (tag: string) => {
    setSearchTerm(tag)
    try {
      const results = await DatabaseService.searchByTags([tag])
      setUsers(results)
    } catch (error) {
      toast.error('Erro na busca por tag')
      console.error(error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('tex_user_phone')
    setCurrentUser(null)
    setPhoneNumber('')
    setProfileData({
      nome: '',
      descricao: '',
      tags: [],
      foto_url: '',
      localizacao: '',
      status: 'available'
    })
    setShowProfileMenu(false)
    setCurrentScreen('home')
    setNavigationHistory(['home'])
    toast.success('Logout realizado com sucesso!')
  }

  const handleDeleteProfile = async () => {
    if (!currentUser) return
    
    if (confirm('Tem certeza que deseja excluir seu perfil? Esta ação não pode ser desfeita.')) {
      try {
        await DatabaseService.deleteUsuario(currentUser.id)
        handleLogout()
        toast.success('Perfil excluído com sucesso!')
      } catch (error) {
        toast.error('Erro ao excluir perfil')
        console.error(error)
      }
    }
  }

  // Carregar usuários ao entrar no feed
  useEffect(() => {
    if (currentScreen === 'feed') {
      handleSearch()
    }
  }, [currentScreen, proximityEnabled, userLocation])

  const renderHeader = () => {
    const shouldShowScrolled = isScrolled && currentScreen === 'home'
    
    return (
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: shouldShowScrolled ? 'rgba(0, 0, 0, 0.9)' : 'transparent',
        backdropFilter: shouldShowScrolled ? 'blur(15px)' : 'none',
        border: shouldShowScrolled ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.3s ease'
      }}>
        <div 
          className={`tex-logo-container ${shouldShowScrolled ? 'tex-logo-scrolled' : 'tex-logo-normal'}`}
          onClick={() => {
            setCurrentScreen('home')
            setNavigationHistory(['home'])
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="tex-logo-text">TEX</div>
        </div>

        {currentUser && (
          <div style={{ position: 'relative' }}>
            <button 
              className="profile-header-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {currentUser.foto_url ? (
                <img 
                  src={currentUser.foto_url} 
                  alt="Perfil" 
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </button>

            {showProfileMenu && (
              <>
                <div 
                  className="profile-menu-overlay"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="profile-menu">
                  <div className="profile-menu-content">
                    <div className="profile-menu-header">
                      <div className="profile-menu-avatar">
                        {currentUser.foto_url ? (
                          <img src={currentUser.foto_url} alt="Perfil" />
                        ) : (
                          <i className="fas fa-user"></i>
                        )}
                      </div>
                      <div className="profile-menu-info">
                        <h4>{currentUser.nome}</h4>
                        <p>{currentUser.whatsapp}</p>
                      </div>
                    </div>
                    
                    <div className="profile-menu-actions">
                      <button 
                        className="profile-menu-item"
                        onClick={() => navigateToScreen('profile')}
                      >
                        <i className="fas fa-user"></i>
                        Meu Perfil
                      </button>
                      
                      <button 
                        className="profile-menu-item"
                        onClick={() => navigateToScreen('edit')}
                      >
                        <i className="fas fa-edit"></i>
                        Editar Perfil
                      </button>
                      
                      <div className="profile-menu-divider"></div>
                      
                      <button 
                        className="profile-menu-item"
                        onClick={() => navigateToScreen('about')}
                      >
                        <i className="fas fa-info-circle"></i>
                        Sobre o TEX
                      </button>
                      
                      <button 
                        className="profile-menu-item"
                        onClick={() => navigateToScreen('terms')}
                      >
                        <i className="fas fa-file-contract"></i>
                        Termos de Uso
                      </button>
                      
                      <div className="profile-menu-divider"></div>
                      
                      <button 
                        className="profile-menu-item logout"
                        onClick={handleLogout}
                      >
                        <i className="fas fa-sign-out-alt"></i>
                        Sair
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </header>
    )
  }

  const renderBackButton = () => {
    if (currentScreen === 'home') return null
    
    return (
      <div className="back-button-container">
        <button className="back-button" onClick={goBack}>
          <i className="fas fa-arrow-left"></i>
          Voltar
        </button>
      </div>
    )
  }

  const renderHomeScreen = () => (
    <div className="screen active">
      <div className="hero-container">
        <h1>
          Do trampo ao encontro
          <span>TEX</span>
        </h1>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="O que você está procurando?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && currentUser) {
                navigateToScreen('feed')
              }
            }}
          />
          
          {currentUser ? (
            <button 
              className="explore-btn"
              onClick={() => navigateToScreen('feed')}
              disabled={isLoading}
            >
              {isLoading ? 'Carregando...' : 'Explorar Profissionais'}
            </button>
          ) : (
            <button 
              className="whatsapp-login-btn"
              onClick={() => navigateToScreen('login')}
            >
              <i className="fab fa-whatsapp"></i>
              Entrar com WhatsApp
            </button>
          )}
        </div>

        {locationPermission === 'prompt' && (
          <div className="location-status">
            <button 
              className="location-enable-btn"
              onClick={getCurrentLocation}
            >
              <i className="fas fa-map-marker-alt"></i>
              Ativar Localização para Busca Próxima
            </button>
          </div>
        )}

        {locationPermission === 'granted' && userLocation && (
          <div className="location-status">
            <div style={{ 
              color: 'var(--cyan)', 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'center'
            }}>
              <i className="fas fa-map-marker-alt"></i>
              Localização ativada - Busca por proximidade disponível
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderLoginScreen = () => (
    <div className="screen active">
      {renderBackButton()}
      <div className="form-container">
        <h2>Entrar no TEX</h2>
        <p>Digite seu número do WhatsApp para continuar</p>
        
        <div className="info-box">
          <i className="fab fa-whatsapp"></i>
          <p>Usamos o WhatsApp para facilitar o contato direto entre profissionais e clientes. Seu número será usado apenas para isso.</p>
        </div>
        
        <div className="phone-input">
          <div className="country-code">+55</div>
          <input
            type="tel"
            placeholder="11999887766"
            value={phoneNumber.replace('+55', '')}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
            maxLength={11}
          />
        </div>
        
        <button 
          className="verify-btn"
          onClick={handleWhatsAppLogin}
          disabled={isLoading || phoneNumber.length < 10}
        >
          {isLoading ? 'Verificando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )

  const renderSetupScreen = () => (
    <div className="screen active">
      {renderBackButton()}
      <div className="form-container">
        <h2>Criar Perfil</h2>
        <p>Complete seu perfil para começar a usar o TEX</p>
        
        <div className="profile-setup">
          <div className="photo-upload">
            <div className="photo-preview">
              {profileData.foto_url ? (
                <img src={profileData.foto_url} alt="Preview" />
              ) : (
                <i className="fas fa-camera"></i>
              )}
            </div>
            <input
              id="photo-input"
              type="url"
              placeholder="URL da foto (opcional)"
              value={profileData.foto_url}
              onChange={(e) => setProfileData(prev => ({ ...prev, foto_url: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label>Nome Completo *</label>
            <input
              type="text"
              value={profileData.nome}
              onChange={(e) => setProfileData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Seu nome completo"
            />
          </div>
          
          <div className="form-group">
            <label>Descrição do Serviço *</label>
            <textarea
              value={profileData.descricao}
              onChange={(e) => setProfileData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva seus serviços e experiência"
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label>Localização</label>
            <input
              type="text"
              value={profileData.localizacao}
              onChange={(e) => setProfileData(prev => ({ ...prev, localizacao: e.target.value }))}
              placeholder="Cidade, Estado"
            />
          </div>
          
          <div className="form-group">
            <label>Tags de Serviço *</label>
            <div className="tags-input">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ex: eletricista, design, programação"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <button 
                  type="button"
                  onClick={handleAddTag}
                  style={{
                    background: 'var(--gradient)',
                    color: 'var(--black)',
                    border: 'none',
                    padding: '0.8rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Adicionar
                </button>
              </div>
              <div className="tags-container">
                {profileData.tags.map((tag, index) => (
                  <div key={index} className="tag">
                    {tag}
                    <i 
                      className="fas fa-times"
                      onClick={() => handleRemoveTag(tag)}
                    ></i>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>Status</label>
            <div className="status-toggle">
              <button
                type="button"
                className={`status-btn ${profileData.status === 'available' ? 'active' : ''}`}
                onClick={() => setProfileData(prev => ({ ...prev, status: 'available' }))}
              >
                <div className="dot available"></div>
                Disponível
              </button>
              <button
                type="button"
                className={`status-btn ${profileData.status === 'busy' ? 'active' : ''}`}
                onClick={() => setProfileData(prev => ({ ...prev, status: 'busy' }))}
              >
                <div className="dot busy"></div>
                Ocupado
              </button>
            </div>
          </div>
          
          <div className="whatsapp-preview">
            <h4>Como aparecerá no WhatsApp:</h4>
            <div className="contact-preview">
              <i className="fab fa-whatsapp"></i>
              {phoneNumber}
            </div>
          </div>
          
          <button 
            className="save-profile-btn"
            onClick={handleSaveProfile}
            disabled={isLoading}
          >
            {isLoading ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderFeedScreen = () => (
    <div className="screen active">
      {renderBackButton()}
      <div className="feed">
        <div className="search-header">
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar profissionais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => {
                  setSearchTerm('')
                  handleSearch()
                }}
              >
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
                  } else {
                    getCurrentLocation()
                  }
                }}
                disabled={!userLocation && locationPermission === 'denied'}
              >
                <i className="fas fa-map-marker-alt"></i>
                {proximityEnabled ? 'Busca por Proximidade (Ativa)' : 'Ativar Busca por Proximidade'}
              </button>
              
              {!userLocation && locationPermission !== 'denied' && (
                <button
                  className="enable-location-btn"
                  onClick={getCurrentLocation}
                >
                  <i className="fas fa-location-arrow"></i>
                  Ativar Localização
                </button>
              )}
            </div>
            
            {proximityEnabled && userLocation && (
              <div className="radius-selector">
                <label>Raio de busca:</label>
                <select 
                  value={searchRadius} 
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
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
        </div>

        {users.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="search-results-info">
              {proximityEnabled ? 
                `${users.length} profissionais encontrados próximos a você` :
                `${users.length} profissionais encontrados`
              }
            </div>
            
            {users.map((user) => (
              <div key={user.id} className="profile-card">
                <div className="profile-header">
                  <div className="profile-pic">
                    {user.foto_url ? (
                      <img src={user.foto_url} alt={user.nome} />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}>
                        <i className="fas fa-user"></i>
                      </div>
                    )}
                  </div>
                  <div className="profile-info">
                    <div className="profile-name-distance">
                      <h2>{user.nome}</h2>
                      {user.distancia && (
                        <div className="distance-badge">
                          <i className="fas fa-map-marker-alt"></i>
                          {user.distancia}km
                        </div>
                      )}
                    </div>
                    <div className="description">{user.descricao}</div>
                    <span className={`status status-${user.status}`}>
                      {user.status === 'available' ? 'Disponível' : 'Ocupado'}
                    </span>
                    {user.localizacao && (
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.5rem' }}>
                        <i className="fas fa-map-marker-alt"></i> {user.localizacao}
                      </div>
                    )}
                  </div>
                </div>
                
                {user.tags && user.tags.length > 0 && (
                  <div className="hashtags">
                    {user.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="tag-clickable"
                        onClick={() => handleTagClick(tag)}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <a
                  href={`https://wa.me/${user.whatsapp.replace(/\D/g, '')}?text=Olá! Vi seu perfil no TEX e gostaria de conversar sobre seus serviços.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-btn"
                >
                  <i className="fab fa-whatsapp"></i>
                  Conversar no WhatsApp
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <i className="fas fa-search"></i>
            <h3>Nenhum profissional encontrado</h3>
            <p>Tente ajustar sua busca ou explorar outras categorias</p>
            <div className="no-results-actions">
              <button 
                className="explore-all-btn"
                onClick={() => {
                  setSearchTerm('')
                  setProximityEnabled(false)
                  handleSearch()
                }}
              >
                Ver Todos os Profissionais
              </button>
              <button 
                className="back-home-btn"
                onClick={() => {
                  setCurrentScreen('home')
                  setNavigationHistory(['home'])
                }}
              >
                <i className="fas fa-home"></i>
                Voltar ao Início
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderProfileScreen = () => {
    if (!currentUser) return null

    return (
      <div className="screen active">
        {renderBackButton()}
        <div className="my-profile-content">
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-pic">
                {currentUser.foto_url ? (
                  <img src={currentUser.foto_url} alt={currentUser.nome} />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
              <div className="profile-info">
                <h2>{currentUser.nome}</h2>
                <div className="description">{currentUser.descricao}</div>
                <span className={`status status-${currentUser.status}`}>
                  {currentUser.status === 'available' ? 'Disponível' : 'Ocupado'}
                </span>
                {currentUser.localizacao && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.5rem' }}>
                    <i className="fas fa-map-marker-alt"></i> {currentUser.localizacao}
                  </div>
                )}
              </div>
            </div>
            
            {currentUser.tags && currentUser.tags.length > 0 && (
              <div className="hashtags">
                {currentUser.tags.map((tag, index) => (
                  <span key={index}>#{tag}</span>
                ))}
              </div>
            )}
            
            <div className="profile-stats">
              <div className="stat">
                <i className="fas fa-calendar-alt"></i>
                Perfil criado em {new Date(currentUser.criado_em).toLocaleDateString('pt-BR')}
              </div>
              <div className="stat">
                <i className="fas fa-clock"></i>
                Último acesso em {new Date(currentUser.ultimo_acesso).toLocaleDateString('pt-BR')}
              </div>
              <div className="stat">
                <i className="fas fa-check-circle"></i>
                Perfil {currentUser.perfil_completo ? 'completo' : 'incompleto'}
              </div>
              {currentUser.verificado && (
                <div className="stat">
                  <i className="fas fa-verified"></i>
                  Perfil verificado
                </div>
              )}
            </div>
          </div>
          
          <div className="profile-actions">
            <button 
              className="edit-profile-btn"
              onClick={() => navigateToScreen('edit')}
            >
              <i className="fas fa-edit"></i>
              Editar Perfil
            </button>
            
            <button 
              className="delete-profile-btn"
              onClick={handleDeleteProfile}
            >
              <i className="fas fa-trash"></i>
              Excluir Perfil
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderEditScreen = () => {
    if (!currentUser) return null

    return (
      <div className="screen active">
        {renderBackButton()}
        <div className="form-container">
          <h2>Editar Perfil</h2>
          <p>Atualize suas informações</p>
          
          <div className="profile-setup">
            <div className="photo-upload">
              <div className="photo-preview">
                {profileData.foto_url ? (
                  <img src={profileData.foto_url} alt="Preview" />
                ) : (
                  <i className="fas fa-camera"></i>
                )}
              </div>
              <input
                id="edit-photo-input"
                type="url"
                placeholder="URL da foto (opcional)"
                value={profileData.foto_url}
                onChange={(e) => setProfileData(prev => ({ ...prev, foto_url: e.target.value }))}
              />
            </div>
            
            <div className="form-group">
              <label>Nome Completo *</label>
              <input
                type="text"
                value={profileData.nome}
                onChange={(e) => setProfileData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Seu nome completo"
              />
            </div>
            
            <div className="form-group">
              <label>Descrição do Serviço *</label>
              <textarea
                value={profileData.descricao}
                onChange={(e) => setProfileData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva seus serviços e experiência"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label>Localização</label>
              <input
                type="text"
                value={profileData.localizacao}
                onChange={(e) => setProfileData(prev => ({ ...prev, localizacao: e.target.value }))}
                placeholder="Cidade, Estado"
              />
            </div>
            
            <div className="form-group">
              <label>Tags de Serviço *</label>
              <div className="tags-input">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Ex: eletricista, design, programação"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <button 
                    type="button"
                    onClick={handleAddTag}
                    style={{
                      background: 'var(--gradient)',
                      color: 'var(--black)',
                      border: 'none',
                      padding: '0.8rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Adicionar
                  </button>
                </div>
                <div className="tags-container">
                  {profileData.tags.map((tag, index) => (
                    <div key={index} className="tag">
                      {tag}
                      <i 
                        className="fas fa-times"
                        onClick={() => handleRemoveTag(tag)}
                      ></i>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>Status</label>
              <div className="status-toggle">
                <button
                  type="button"
                  className={`status-btn ${profileData.status === 'available' ? 'active' : ''}`}
                  onClick={() => setProfileData(prev => ({ ...prev, status: 'available' }))}
                >
                  <div className="dot available"></div>
                  Disponível
                </button>
                <button
                  type="button"
                  className={`status-btn ${profileData.status === 'busy' ? 'active' : ''}`}
                  onClick={() => setProfileData(prev => ({ ...prev, status: 'busy' }))}
                >
                  <div className="dot busy"></div>
                  Ocupado
                </button>
              </div>
            </div>
            
            <div className="edit-actions">
              <button 
                className="save-profile-btn"
                onClick={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              
              <button 
                className="cancel-edit-btn"
                onClick={goBack}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAboutScreen = () => (
    <div className="screen active">
      {renderBackButton()}
      <div className="content-container">
        <h1 className="page-title">
          <i className="fas fa-info-circle"></i>
          Sobre o TEX
        </h1>
        
        <div className="about-content">
          <div className="content-section">
            <p className="intro-text">
              O TEX (TrampoExpress) é a plataforma que conecta profissionais talentosos 
              a clientes que precisam de seus serviços, criando oportunidades e 
              facilitando conexões significativas.
            </p>
            
            <div className="features-grid">
              <div className="feature-card">
                <i className="fas fa-handshake"></i>
                <h3>Conexões Diretas</h3>
                <p>Conecte-se diretamente com profissionais através do WhatsApp</p>
              </div>
              
              <div className="feature-card">
                <i className="fas fa-map-marker-alt"></i>
                <h3>Busca por Proximidade</h3>
                <p>Encontre profissionais próximos à sua localização</p>
              </div>
              
              <div className="feature-card">
                <i className="fas fa-shield-alt"></i>
                <h3>Segurança</h3>
                <p>Plataforma segura com verificação de perfis</p>
              </div>
              
              <div className="feature-card">
                <i className="fas fa-star"></i>
                <h3>Qualidade</h3>
                <p>Profissionais qualificados e serviços de excelência</p>
              </div>
            </div>
            
            <div className="warning-box">
              <i className="fas fa-exclamation-triangle"></i>
              <p>
                <strong>Importante:</strong> O TEX é uma plataforma de conexão. 
                Sempre verifique as credenciais dos profissionais e negocie 
                diretamente os termos do serviço.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTermsScreen = () => (
    <div className="screen active">
      {renderBackButton()}
      <div className="content-container">
        <h1 className="page-title">
          <i className="fas fa-file-contract"></i>
          Termos de Uso
        </h1>
        
        <div className="terms-content">
          <div className="terms-section">
            <h2>
              <i className="fas fa-check-circle"></i>
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao acessar e usar o TEX, você concorda com estes termos de uso. 
              Se você não concordar com qualquer parte destes termos, não use nosso serviço.
            </p>
          </div>

          <div className="terms-section">
            <h2>
              <i className="fas fa-user-shield"></i>
              2. Uso do Serviço
            </h2>
            <p>O TEX é uma plataforma que conecta prestadores de serviços e clientes. Você concorda em:</p>
            <ul>
              <li>Fornecer informações verdadeiras e precisas</li>
              <li>Manter suas informações atualizadas</li>
              <li>Não usar o serviço para fins ilegais ou não autorizados</li>
              <li>Respeitar outros usuários da plataforma</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2>
              <i className="fas fa-exclamation-triangle"></i>
              3. Responsabilidades
            </h2>
            <p>O TEX não se responsabiliza por:</p>
            <ul>
              <li>Qualidade dos serviços prestados</li>
              <li>Disputas entre usuários</li>
              <li>Perdas ou danos resultantes do uso da plataforma</li>
              <li>Conteúdo gerado pelos usuários</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2>
              <i className="fas fa-lock"></i>
              4. Privacidade
            </h2>
            <p>
              Protegemos seus dados de acordo com nossa política de privacidade. 
              Ao usar o TEX, você concorda com nossa coleta e uso de informações 
              conforme descrito em nossa política.
            </p>
          </div>

          <div className="terms-section">
            <h2>
              <i className="fas fa-edit"></i>
              5. Modificações
            </h2>
            <p>
              Reservamos o direito de modificar estes termos a qualquer momento. 
              Alterações significativas serão notificadas aos usuários através 
              da plataforma.
            </p>
          </div>

          <div className="terms-section coming-soon">
            <h2>
              <i className="fas fa-gavel"></i>
              6. Resolução de Disputas
              <span className="badge">Em Breve</span>
            </h2>
            <p>
              Estamos desenvolvendo um sistema de <span className="highlight">mediação</span> 
              para ajudar na resolução de conflitos entre usuários.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'home':
        return renderHomeScreen()
      case 'login':
        return renderLoginScreen()
      case 'setup':
        return renderSetupScreen()
      case 'feed':
        return renderFeedScreen()
      case 'profile':
        return renderProfileScreen()
      case 'edit':
        return renderEditScreen()
      case 'about':
        return renderAboutScreen()
      case 'terms':
        return renderTermsScreen()
      default:
        return renderHomeScreen()
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      paddingTop: currentScreen === 'home' ? '0' : '80px',
      paddingBottom: '80px'
    }}>
      {renderHeader()}
      {renderCurrentScreen()}
      
      <footer>
        <nav className="footer-nav">
          <button onClick={() => {
            setCurrentScreen('home')
            setNavigationHistory(['home'])
          }}>
            Home
          </button>
          <button onClick={() => navigateToScreen('about')}>
            Sobre
          </button>
          <button onClick={() => navigateToScreen('terms')}>
            Termos
          </button>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Redes Sociais
          </a>
        </nav>
        <div className="copyright">
          © 2025 TrampoExpress. Todos os direitos reservados.
        </div>
      </footer>
      
      <PWAInstallPrompt />
      <Toaster position="top-center" />
    </div>
  )
}

export default App