import React, { useState, useEffect } from 'react'
import { useCallback, useMemo } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { DatabaseService, type Usuario, type CreateUsuarioData, type UpdateUsuarioData } from './lib/database'
import { supabase } from './lib/supabase'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import PaymentScreen from './components/PaymentScreen'

// Types
type Screen = 'home' | 'verify' | 'profile-setup' | 'feed' | 'my-profile' | 'edit-profile' | 'about' | 'terms' | 'payment'

interface NavigationState {
  screen: Screen
  data?: any
}

interface ProfileFormData {
  nome: string
  descricao: string
  tags: string[]
  foto_url: string
  localizacao: string
  status: 'available' | 'busy'
  latitude: number | null
  longitude: number | null
}

// Input Components - NO React.memo to prevent focus loss
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

const TextArea = ({ value, onChange, placeholder, rows }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows: number
}) => {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      autoComplete="off"
    />
  )
}

// Main App Component
function App() {
  // State management
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([{ screen: 'home' }])
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Location state
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')

  // Search and feed state
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [proximityEnabled, setProximityEnabled] = useState(false)
  const [proximityRadius, setProximityRadius] = useState(10)

  // Form states
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)


  // Profile form state
  const [profileForm, setProfileForm] = useState({
    nome: '',
    descricao: '',
    tags: [] as string[],
    foto_url: '',
    localizacao: '',
    status: 'available' as 'available' | 'busy',
    latitude: null as number | null,
    longitude: null as number | null
  })

  // Initialize app
  useEffect(() => {
    initializeApp()
    setupBackButtonHandler()
  }, [])

  const initializeApp = async () => {
    // Check for existing session
    const savedUser = localStorage.getItem('tex-current-user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setIsLoggedIn(true)
        
        // Update last access
        DatabaseService.updateLastAccess(user.id)
        
        // Navigate to appropriate screen based on profile completeness
        if (user.perfil_completo) {
          navigateTo('feed')
        } else {
          navigateTo('profile-setup')
        }
      } catch (error) {
        console.error('Error loading saved user:', error)
        localStorage.removeItem('tex-current-user')
      }
    }
  }

  const setupBackButtonHandler = () => {
    const handlePopState = () => {
      if (navigationHistory.length > 1) {
        goBack()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }

  // Navigation functions
  const navigateTo = (screen: Screen, data?: any) => {
    const newState = { screen, data }
    setNavigationHistory(prev => [...prev, newState])
    setCurrentScreen(screen)
    setShowProfileMenu(false)
    
    // Update browser history
    window.history.pushState(newState, '', `#${screen}`)
  }

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1)
      const previousState = newHistory[newHistory.length - 1]
      
      setNavigationHistory(newHistory)
      setCurrentScreen(previousState.screen)
      setShowProfileMenu(false)
    }
  }

  // Location functions
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste navegador')
      return
    }

    setLocationStatus('requesting')
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        setUserLocation(location)
        setLocationStatus('granted')
        toast.success('Localização obtida com sucesso!')
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationStatus('denied')
        toast.error('Não foi possível obter sua localização')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }

  // WhatsApp verification
  const handleWhatsAppVerification = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Digite seu número do WhatsApp')
      return
    }

    // Format WhatsApp number
    const formattedNumber = whatsappNumber.replace(/\D/g, '')
    if (formattedNumber.length < 10) {
      toast.error('Número do WhatsApp inválido')
      return
    }

    const fullNumber = formattedNumber.startsWith('55') ? `+${formattedNumber}` : `+55${formattedNumber}`

    setIsVerifying(true)

    try {
      // Check if user already exists
      const existingUser = await DatabaseService.getUsuarioByWhatsApp(fullNumber)
      
      if (existingUser) {
        // User exists - login
        setCurrentUser(existingUser)
        setIsLoggedIn(true)
        localStorage.setItem('tex-current-user', JSON.stringify(existingUser))
        
        // Update last access
        DatabaseService.updateLastAccess(existingUser.id)
        
        toast.success(`Bem-vindo de volta, ${existingUser.nome}!`)
        
        // Navigate based on profile completeness
        if (existingUser.perfil_completo) {
          navigateTo('feed')
        } else {
          navigateTo('profile-setup')
        }
      } else {
        // New user - go to profile setup
        const newUserId = crypto.randomUUID()
        const newUser: Partial<Usuario> = {
          id: newUserId,
          whatsapp: fullNumber,
          nome: '',
          descricao: '',
          tags: [],
          foto_url: null,
          localizacao: null,
          status: 'available',
          latitude: null,
          longitude: null,
          perfil_completo: false,
          verificado: false
        }
        
        setCurrentUser(newUser as Usuario)
        setIsLoggedIn(true)
        
        // Initialize profile form with WhatsApp
        setProfileForm(prev => ({
          ...prev,
          status: 'available'
        }))
        
        toast.success('Vamos criar seu perfil!')
        navigateTo('profile-setup')
      }
    } catch (error) {
      console.error('WhatsApp verification error:', error)
      toast.error('Erro ao verificar WhatsApp. Tente novamente.')
    } finally {
      setIsVerifying(false)
    }
  }

  // Profile management
  const handleProfileSave = async () => {
    if (!profileForm.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    if (!profileForm.descricao.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }
    if (profileForm.tags.length === 0) {
      toast.error('Adicione pelo menos uma especialidade')
      return
    }

    try {
      const profileData: CreateUsuarioData = {
        id: currentUser!.id,
        nome: profileForm.nome.trim(),
        whatsapp: currentUser!.whatsapp,
        descricao: profileForm.descricao.trim(),
        tags: profileForm.tags,
        foto_url: profileForm.foto_url || undefined,
        localizacao: profileForm.localizacao.trim() || undefined,
        status: profileForm.status,
        latitude: profileForm.latitude,
        longitude: profileForm.longitude
      }

      const savedUser = await DatabaseService.createUsuario(profileData)
      
      setCurrentUser(savedUser)
      localStorage.setItem('tex-current-user', JSON.stringify(savedUser))
      
      toast.success('Perfil criado com sucesso!')
      navigateTo('feed')
    } catch (error) {
      console.error('Profile save error:', error)
      toast.error('Erro ao salvar perfil. Tente novamente.')
    }
  }

  const handleProfileUpdate = async () => {
    if (!currentUser) return

    try {
      const updateData: UpdateUsuarioData = {
        nome: profileForm.nome.trim(),
        descricao: profileForm.descricao.trim(),
        tags: profileForm.tags,
        foto_url: profileForm.foto_url || null,
        localizacao: profileForm.localizacao.trim() || null,
        status: profileForm.status,
        latitude: profileForm.latitude,
        longitude: profileForm.longitude
      }

      const updatedUser = await DatabaseService.updateUsuario(currentUser.id, updateData)
      
      setCurrentUser(updatedUser)
      localStorage.setItem('tex-current-user', JSON.stringify(updatedUser))
      
      toast.success('Perfil atualizado com sucesso!')
      navigateTo('my-profile')
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Erro ao atualizar perfil. Tente novamente.')
    }
  }

  // Search and feed functions
  const searchUsers = async () => {
    setLoading(true)
    try {
      let results: Usuario[] = []

      if (proximityEnabled && userLocation) {
        results = await DatabaseService.getUsersByProximity(
          userLocation.latitude,
          userLocation.longitude,
          proximityRadius
        )
      } else {
        results = await DatabaseService.getUsuarios({
          search: searchTerm,
          status: 'available',
          limit: 20
        })
      }

      setUsers(results)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Erro na busca. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleTagClick = (tag: string) => {
    setSearchTerm(tag)
  }

  // Utility functions
  const addTag = (tag: string) => {
    if (tag.trim() && !profileForm.tags.includes(tag.trim())) {
      setProfileForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setProfileForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setProfileForm(prev => ({ ...prev, foto_url: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setShowProfileMenu(false)
    localStorage.removeItem('tex-current-user')
    setNavigationHistory([{ screen: 'home' }])
    setCurrentScreen('home')
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
        console.error('Delete profile error:', error)
        toast.error('Erro ao excluir perfil. Tente novamente.')
      }
    }
  }

  // Payment functions
  const handleContactClick = (user: Usuario) => {
    // Gerar ID temporário para cliente não logado
    const clienteId = currentUser?.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Ir direto para tela de pagamento
    navigateTo('payment', {
      prestadorId: user.id,
      prestadorNome: user.nome,
      prestadorWhatsApp: user.whatsapp,
      clienteId: clienteId
    })
  }

  const handlePaymentSuccess = () => {
    const paymentData = navigationHistory[navigationHistory.length - 1]?.data
    if (paymentData) {
      console.log('🎉 Pagamento aprovado! Dados:', paymentData)
      
      // Redirect to WhatsApp
      const cleanPhone = paymentData.prestadorWhatsApp.replace(/\D/g, '')
      const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent('Olá! Paguei a taxa no TEX e gostaria de conversar sobre seus serviços.')}`
      
      console.log('📱 Redirecionando para WhatsApp:', whatsappUrl)
      window.open(whatsappUrl, '_blank')
      
      toast.success('Redirecionando para WhatsApp...')
      
      // Voltar para o feed após um pequeno delay
      setTimeout(() => {
        navigateTo('feed')
      }, 2000)
    }
  }

  // Search users effect - only when screen changes to feed
  useEffect(() => {
    if (currentScreen === 'feed') {
      searchUsers()
    }
  }, [currentScreen])

  // Direct inline handlers - no useCallback needed without React.memo
  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleSearchEnter = () => {
    navigateTo('feed')
  }

  const handleSearchUsersEnter = () => {
    searchUsers()
  }

  const handleWhatsappChange = (value: string) => {
    setWhatsappNumber(value)
  }

  const handleNomeChange = (value: string) => {
    setProfileForm(prev => ({ ...prev, nome: value }))
  }

  const handleDescricaoChange = (value: string) => {
    setProfileForm(prev => ({ ...prev, descricao: value }))
  }

  const handleLocalizacaoChange = (value: string) => {
    setProfileForm(prev => ({ ...prev, localizacao: value }))
  }

  // Render functions
  const renderProfileHeader = () => {
    if (!isLoggedIn || !currentUser) {
      return (
        <button 
          className="whatsapp-login-btn"
          onClick={() => navigateTo('verify')}
        >
          <i className="fab fa-whatsapp"></i>
          Entrar com WhatsApp
        </button>
      )
    }

    return (
      <div className="profile-header-container">
        <button 
          className="profile-header-btn"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          {currentUser.foto_url ? (
            <img src={currentUser.foto_url} alt={currentUser.nome} />
          ) : null}
          <i className={`fas fa-user ${currentUser.foto_url ? 'hidden' : ''}`}></i>
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
                    onClick={() => navigateTo('my-profile')}
                  >
                    <i className="fas fa-user"></i>
                    Meu Perfil
                  </button>
                  <button 
                    className="profile-menu-item"
                    onClick={() => navigateTo('feed')}
                  >
                    <i className="fas fa-search"></i>
                    Explorar
                  </button>
                  <div className="profile-menu-divider"></div>
                  <button 
                    className="profile-menu-item"
                    onClick={() => navigateTo('about')}
                  >
                    <i className="fas fa-info-circle"></i>
                    Sobre
                  </button>
                  <button 
                    className="profile-menu-item"
                    onClick={() => navigateTo('terms')}
                  >
                    <i className="fas fa-file-contract"></i>
                    Termos
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
    )
  }

  const renderBackButton = () => {
    if (navigationHistory.length <= 1) return null

    return (
      <div className="back-button-container">
        <button className="back-button" onClick={goBack}>
          <i className="fas fa-arrow-left"></i>
          Voltar
        </button>
      </div>
    )
  }

  // Screen components
  const HomeScreen = () => (
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
          onChange={handleSearchTermChange}
          onEnter={handleSearchEnter}
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

  const VerifyScreen = () => (
    <div className="form-container">
      {renderBackButton()}
      <h2>Entrar com WhatsApp</h2>
      <p>Digite seu número do WhatsApp para entrar ou criar sua conta</p>
      
      <div className="phone-input">
        <span className="country-code">+55</span>
        <TextInput
          type="tel"
          value={whatsappNumber}
          onChange={handleWhatsappChange}
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

  const ProfileSetupScreen = () => (
    <div className="form-container profile-setup">
      {renderBackButton()}
      <h2>Criar Perfil</h2>
      <p>Complete seu perfil para começar a receber contatos</p>

      <div className="photo-upload">
        <div className="photo-preview">
          {profileForm.foto_url ? (
            <img src={profileForm.foto_url} alt="Preview" />
          ) : (
            <i className="fas fa-camera"></i>
          )}
        </div>
        <label htmlFor="photo-input">
          <i className="fas fa-upload"></i>
          Adicionar Foto
        </label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
        />
      </div>

      <div className="form-group">
        <label>Nome Completo *</label>
        <TextInput
          value={profileForm.nome}
          onChange={handleNomeChange}
          placeholder="Seu nome completo"
        />
      </div>

      <div className="form-group">
        <label>Descrição Profissional *</label>
        <TextArea
          value={profileForm.descricao}
          onChange={handleDescricaoChange}
          placeholder="Descreva seus serviços e experiência..."
          rows={4}
        />
      </div>

      <div className="form-group">
        <label>Especialidades *</label>
        <div className="tags-input">
          <input
            type="text"
            placeholder="Digite uma especialidade e pressione Enter"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const input = e.currentTarget
                addTag(input.value)
                input.value = ''
              }
            }}
            autoComplete="off"
          />
          <div className="tags-container">
            {profileForm.tags.map((tag, index) => (
              <div key={index} className="tag">
                {tag}
                <i className="fas fa-times" onClick={() => removeTag(tag)}></i>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Localização</label>
        <TextInput
          value={profileForm.localizacao}
          onChange={handleLocalizacaoChange}
          placeholder="Cidade, Estado"
        />
        <div className="location-gps-option">
          {userLocation ? (
            <p className="location-gps-status">
              <i className="fas fa-check-circle"></i>
              Localização GPS ativada
            </p>
          ) : (
            <button 
              type="button"
              className="location-gps-btn"
              onClick={() => {
                requestLocation()
                if (userLocation) {
                  setProfileForm(prev => ({
                    ...prev,
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude
                  }))
                }
              }}
            >
              <i className="fas fa-map-marker-alt"></i>
              Usar GPS
            </button>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Status</label>
        <div className="status-toggle">
          <button
            type="button"
            className={`status-btn ${profileForm.status === 'available' ? 'active' : ''}`}
            onClick={() => setProfileForm(prev => ({ ...prev, status: 'available' }))}
          >
            <span className="dot available"></span>
            Disponível
          </button>
          <button
            type="button"
            className={`status-btn ${profileForm.status === 'busy' ? 'active' : ''}`}
            onClick={() => setProfileForm(prev => ({ ...prev, status: 'busy' }))}
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

      <button className="save-profile-btn" onClick={handleProfileSave}>
        <i className="fas fa-save"></i>
        Salvar Perfil
      </button>
    </div>
  )

  const FeedScreen = () => (
    <div className="feed">
      {renderBackButton()}
      
      <div className="search-header">
        <div className="search-bar">
          <i className="fas fa-search"></i>
          <SearchInput
            value={searchTerm}
            onChange={handleSearchTermChange}
            onEnter={handleSearchUsersEnter}
            placeholder="Buscar profissionais..."
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <div className="proximity-filters">
          <div className="filter-row">
            <button
              className={`proximity-toggle ${proximityEnabled ? 'active' : ''}`}
              onClick={() => setProximityEnabled(!proximityEnabled)}
              disabled={!userLocation}
            >
              <i className="fas fa-map-marker-alt"></i>
              Busca por Proximidade
            </button>
            
            {!userLocation && (
              <button className="enable-location-btn" onClick={requestLocation}>
                <i className="fas fa-location-arrow"></i>
                Ativar GPS
              </button>
            )}
          </div>

          {proximityEnabled && userLocation && (
            <div className="radius-selector">
              <label>Raio:</label>
              <select
                value={proximityRadius}
                onChange={(e) => setProximityRadius(Number(e.target.value))}
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

        <button className="explore-btn" onClick={searchUsers}>
          <i className="fas fa-search"></i>
          Buscar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--cyan)' }}></i>
          <p>Buscando profissionais...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="no-results">
          <i className="fas fa-search"></i>
          <h3>Nenhum profissional encontrado</h3>
          <p>Tente ajustar sua busca ou localização</p>
          <div className="no-results-actions">
            <button className="explore-all-btn" onClick={() => {
              setSearchTerm('')
              setProximityEnabled(false)
              searchUsers()
            }}>
              Ver Todos os Profissionais
            </button>
            <button className="back-home-btn" onClick={() => navigateTo('home')}>
              <i className="fas fa-home"></i>
              Voltar ao Início
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="search-results-info">
            {proximityEnabled && userLocation ? 
              `${users.length} profissionais próximos` : 
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
                    <i className="fas fa-user"></i>
                  )}
                </div>
                <div className="profile-info">
                  <div className="profile-name-distance">
                    <h2>{user.nome}</h2>
                    {user.distancia && (
                      <span className="distance-badge">
                        <i className="fas fa-map-marker-alt"></i>
                        {user.distancia.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <p className="description">{user.descricao}</p>
                  {user.localizacao && (
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>
                      <i className="fas fa-map-marker-alt"></i> {user.localizacao}
                    </p>
                  )}
                  <span className={`status status-${user.status}`}>
                    {user.status === 'available' ? 'Disponível' : 'Ocupado'}
                  </span>
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
              
              <button
                className="whatsapp-btn"
                onClick={() => handleContactClick(user)}
              >
                <i className="fab fa-whatsapp"></i>
                Entrar em Contato
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const MyProfileScreen = () => {
    if (!currentUser) {
      return (
        <div className="no-profile">
          <h2>Perfil não encontrado</h2>
          <p>Você precisa estar logado para ver seu perfil.</p>
          <button className="create-profile-btn" onClick={() => navigateTo('verify')}>
            Fazer Login
          </button>
        </div>
      )
    }

    return (
      <div className="my-profile-content">
        {renderBackButton()}
        
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
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>
                  <i className="fas fa-map-marker-alt"></i> {currentUser.localizacao}
                </p>
              )}
              
              <div className="status-toggle-profile">
                <button
                  className={`status-btn-profile ${currentUser.status === 'available' ? 'active' : ''}`}
                  onClick={async () => {
                    try {
                      const updatedUser = await DatabaseService.updateStatus(currentUser.id, 'available')
                      setCurrentUser(updatedUser)
                      localStorage.setItem('tex-current-user', JSON.stringify(updatedUser))
                      toast.success('Status atualizado!')
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
                      localStorage.setItem('tex-current-user', JSON.stringify(updatedUser))
                      toast.success('Status atualizado!')
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
              // Load current data into form
              setProfileForm({
                nome: currentUser.nome,
                descricao: currentUser.descricao || '',
                tags: currentUser.tags || [],
                foto_url: currentUser.foto_url || '',
                localizacao: currentUser.localizacao || '',
                status: currentUser.status,
                latitude: currentUser.latitude,
                longitude: currentUser.longitude
              })
              navigateTo('edit-profile')
            }}
          >
            <i className="fas fa-edit"></i>
            Editar Perfil
          </button>
          
          <button className="delete-profile-btn" onClick={handleDeleteProfile}>
            <i className="fas fa-trash"></i>
            Excluir Perfil
          </button>
        </div>
      </div>
    )
  }

  const EditProfileScreen = () => (
    <div className="form-container profile-setup">
      {renderBackButton()}
      <h2>Editar Perfil</h2>
      <p>Atualize suas informações</p>

      <div className="photo-upload">
        <div className="photo-preview">
          {profileForm.foto_url ? (
            <img src={profileForm.foto_url} alt="Preview" />
          ) : (
            <i className="fas fa-camera"></i>
          )}
        </div>
        <label htmlFor="edit-photo-input">
          <i className="fas fa-upload"></i>
          Alterar Foto
        </label>
        <input
          id="edit-photo-input"
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
        />
      </div>

      <div className="form-group">
        <label>Nome Completo *</label>
        <TextInput
          value={profileForm.nome}
          onChange={handleNomeChange}
          placeholder="Seu nome completo"
        />
      </div>

      <div className="form-group">
        <label>Descrição Profissional *</label>
        <TextArea
          value={profileForm.descricao}
          onChange={handleDescricaoChange}
          placeholder="Descreva seus serviços e experiência..."
          rows={4}
        />
      </div>

      <div className="form-group">
        <label>Especialidades *</label>
        <div className="tags-input">
          <input
            type="text"
            placeholder="Digite uma especialidade e pressione Enter"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const input = e.currentTarget
                addTag(input.value)
                input.value = ''
              }
            }}
            autoComplete="off"
          />
          <div className="tags-container">
            {profileForm.tags.map((tag, index) => (
              <div key={index} className="tag">
                {tag}
                <i className="fas fa-times" onClick={() => removeTag(tag)}></i>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Localização</label>
        <TextInput
          value={profileForm.localizacao}
          onChange={handleLocalizacaoChange}
          placeholder="Cidade, Estado"
        />
      </div>

      <div className="form-group">
        <label>Status</label>
        <div className="status-toggle">
          <button
            type="button"
            className={`status-btn ${profileForm.status === 'available' ? 'active' : ''}`}
            onClick={() => setProfileForm(prev => ({ ...prev, status: 'available' }))}
          >
            <span className="dot available"></span>
            Disponível
          </button>
          <button
            type="button"
            className={`status-btn ${profileForm.status === 'busy' ? 'active' : ''}`}
            onClick={() => setProfileForm(prev => ({ ...prev, status: 'busy' }))}
          >
            <span className="dot busy"></span>
            Ocupado
          </button>
        </div>
      </div>

      <div className="edit-actions">
        <button className="save-profile-btn" onClick={handleProfileUpdate}>
          <i className="fas fa-save"></i>
          Salvar Alterações
        </button>
        
        <button className="cancel-edit-btn" onClick={() => navigateTo('my-profile')}>
          <i className="fas fa-times"></i>
          Cancelar
        </button>
      </div>
    </div>
  )

  const AboutScreen = () => (
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

  const TermsScreen = () => (
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

  const PaymentScreenComponent = () => {
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

  // Render function - only render current screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />
      case 'verify':
        return <VerifyScreen />
      case 'profile-setup':
        return <ProfileSetupScreen />
      case 'feed':
        return <FeedScreen />
      case 'my-profile':
        return <MyProfileScreen />
      case 'edit-profile':
        return <EditProfileScreen />
      case 'about':
        return <AboutScreen />
      case 'terms':
        return <TermsScreen />
      case 'payment':
        return <PaymentScreenComponent />
      default:
        return <HomeScreen />
    }
  }

  // Main render
  return (
    <div className="App">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }
        }}
      />

      <div className="screen active">
        {renderCurrentScreen()}
      </div>

      <PWAInstallPrompt />
    </div>
  )
}

export default App