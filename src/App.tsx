import React, { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { MercadoPagoService } from './lib/mercadopago'
import PagamentoPix from './components/PagamentoPix'
import { DatabaseService, type Usuario, type CreateUsuarioData, type UpdateUsuarioData } from './lib/database'
import PWAInstallPrompt from './components/PWAInstallPrompt'

// Tipos para o estado da aplicação
type Screen = 'home' | 'verify' | 'profile-setup' | 'feed' | 'my-profile' | 'edit-profile' | 'about' | 'terms'

interface LocationState {
  enabled: boolean
  latitude: number | null
  longitude: number | null
  loading: boolean
}

interface SearchFilters {
  search: string
  tags: string[]
  proximityEnabled: boolean
  radius: number
}

const App: React.FC = () => {
  // Estados principais
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [selectedPrestador, setSelectedPrestador] = useState<Usuario | null>(null)
  const [navigationHistory, setNavigationHistory] = useState<Screen[]>(['home'])

  // Estados do formulário de verificação
  const [whatsappNumber, setWhatsappNumber] = useState('')

  // Estados do setup de perfil
  const [profileData, setProfileData] = useState({
    nome: '',
    descricao: '',
    tags: [] as string[],
    foto_url: '',
    localizacao: '',
    status: 'available' as 'available' | 'busy'
  })
  const [currentTag, setCurrentTag] = useState('')

  // Estados de localização
  const [location, setLocation] = useState<LocationState>({
    enabled: false,
    latitude: null,
    longitude: null,
    loading: false
  })

  // Estados do feed
  const [users, setUsers] = useState<Usuario[]>([])
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    search: '',
    tags: [],
    proximityEnabled: false,
    radius: 10
  })

  // Estados do menu de perfil
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Estados de pagamento
  const [showPagamento, setShowPagamento] = useState(false)
  const [prestadorSelecionado, setPrestadorSelecionado] = useState<Usuario | null>(null)

  // Navegação
  const navigateTo = (screen: Screen) => {
    setNavigationHistory(prev => [...prev, screen])
    setCurrentScreen(screen)
    setShowProfileMenu(false)
  }

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory]
      newHistory.pop()
      const previousScreen = newHistory[newHistory.length - 1]
      setNavigationHistory(newHistory)
      setCurrentScreen(previousScreen)
    }
  }

  // Suporte ao botão voltar nativo
  useEffect(() => {
    const handlePopState = () => {
      goBack()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [navigationHistory])

  // Verificação de WhatsApp
  const handleWhatsAppVerification = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Por favor, digite seu número do WhatsApp')
      return
    }

    const formattedNumber = whatsappNumber.startsWith('+55') 
      ? whatsappNumber 
      : `+55${whatsappNumber.replace(/\D/g, '')}`

    setLoading(true)
    try {
      const existingUser = await DatabaseService.getUsuarioByWhatsApp(formattedNumber)
      
      if (existingUser) {
        setCurrentUser(existingUser)
        await DatabaseService.updateLastAccess(existingUser.id)
        
        if (existingUser.perfil_completo) {
          navigateTo('feed')
          toast.success(`Bem-vindo de volta, ${existingUser.nome}!`)
        } else {
          navigateTo('profile-setup')
          toast.success('Complete seu perfil para continuar')
        }
      } else {
        // Criar novo usuário
        const newUserId = crypto.randomUUID()
        setCurrentUser({
          id: newUserId,
          nome: '',
          whatsapp: formattedNumber,
          descricao: null,
          tags: [],
          foto_url: null,
          localizacao: null,
          status: 'available',
          latitude: null,
          longitude: null,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          ultimo_acesso: new Date().toISOString(),
          perfil_completo: false,
          verificado: false
        })
        navigateTo('profile-setup')
        toast.success('Vamos criar seu perfil!')
      }
    } catch (error) {
      console.error('Erro na verificação:', error)
      toast.error('Erro ao verificar número. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Localização GPS
  const enableLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo navegador')
      return
    }

    setLocation(prev => ({ ...prev, loading: true }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          enabled: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loading: false
        })
        toast.success('Localização ativada!')
      },
      (error) => {
        console.error('Erro de geolocalização:', error)
        setLocation(prev => ({ ...prev, loading: false }))
        toast.error('Erro ao obter localização')
      }
    )
  }

  // Handle contact with payment
  const handleContactWithPayment = (user: Usuario) => {
    if (!currentUser) {
      toast.error('Faça login para entrar em contato')
      return
    }

    if (currentUser.id === user.id) {
      toast.error('Você não pode entrar em contato consigo mesmo')
      return
    }

    // Abrir modal de pagamento PIX
    setPrestadorSelecionado(user)
    setShowPagamento(true)
  }

  // Gerenciamento de tags
  const addTag = () => {
    if (currentTag.trim() && !profileData.tags.includes(currentTag.trim())) {
      setProfileData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Upload de foto
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileData(prev => ({
          ...prev,
          foto_url: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Salvar perfil
  const saveProfile = async () => {
    if (!currentUser) return

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

    setLoading(true)
    try {
      const userData: CreateUsuarioData = {
        id: currentUser.id,
        nome: profileData.nome.trim(),
        whatsapp: currentUser.whatsapp,
        descricao: profileData.descricao.trim(),
        tags: profileData.tags,
        foto_url: profileData.foto_url || undefined,
        localizacao: profileData.localizacao.trim() || undefined,
        status: profileData.status,
        latitude: location.latitude || undefined,
        longitude: location.longitude || undefined
      }

      const savedUser = await DatabaseService.createUsuario(userData)
      setCurrentUser(savedUser)
      navigateTo('feed')
      toast.success('Perfil criado com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Atualizar perfil existente
  const updateProfile = async () => {
    if (!currentUser) return

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

    setLoading(true)
    try {
      const updateData: UpdateUsuarioData = {
        nome: profileData.nome.trim(),
        descricao: profileData.descricao.trim(),
        tags: profileData.tags,
        foto_url: profileData.foto_url || null,
        localizacao: profileData.localizacao.trim() || null,
        status: profileData.status,
        latitude: location.latitude || null,
        longitude: location.longitude || null
      }

      const updatedUser = await DatabaseService.updateUsuario(currentUser.id, updateData)
      setCurrentUser(updatedUser)
      navigateTo('my-profile')
      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      toast.error('Erro ao atualizar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Carregar usuários do feed
  const loadUsers = async () => {
    setLoading(true)
    try {
      let loadedUsers: Usuario[] = []

      if (searchFilters.proximityEnabled && location.latitude && location.longitude) {
        loadedUsers = await DatabaseService.getUsersByProximity(
          location.latitude,
          location.longitude,
          searchFilters.radius
        )
      } else {
        loadedUsers = await DatabaseService.getUsuarios({
          search: searchFilters.search,
          tags: searchFilters.tags.length > 0 ? searchFilters.tags : undefined,
          status: 'available',
          limit: 50
        })
      }

      setUsers(loadedUsers)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar profissionais')
    } finally {
      setLoading(false)
    }
  }

  // Carregar usuários quando o filtro mudar
  useEffect(() => {
    if (currentScreen === 'feed') {
      loadUsers()
    }
  }, [currentScreen, searchFilters, location.latitude, location.longitude])

  // Atualizar status do usuário
  const updateUserStatus = async (newStatus: 'available' | 'busy') => {
    if (!currentUser) return

    try {
      const updatedUser = await DatabaseService.updateStatus(currentUser.id, newStatus)
      setCurrentUser(updatedUser)
      toast.success(`Status alterado para ${newStatus === 'available' ? 'Disponível' : 'Ocupado'}`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  // Deletar perfil
  const deleteProfile = async () => {
    if (!currentUser) return

    if (!confirm('Tem certeza que deseja excluir seu perfil? Esta ação não pode ser desfeita.')) {
      return
    }

    setLoading(true)
    try {
      await DatabaseService.deleteUsuario(currentUser.id)
      setCurrentUser(null)
      setCurrentScreen('home')
      setNavigationHistory(['home'])
      toast.success('Perfil excluído com sucesso')
    } catch (error) {

    // Generate a temporary client ID for anonymous users
    const clienteId = currentUser?.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Open payment modal directly
      descricao: '',
      clienteId: clienteId,
      foto_url: '',
      localizacao: '',
      status: 'available'
    })
    toast.success('Logout realizado com sucesso')
  }

  // Preparar dados para edição
  const prepareEditProfile = () => {
    if (currentUser) {
      setProfileData({
        nome: currentUser.nome,
        descricao: currentUser.descricao || '',
        tags: currentUser.tags,
        foto_url: currentUser.foto_url || '',
        localizacao: currentUser.localizacao || '',
        status: currentUser.status
      })
      
      if (currentUser.latitude && currentUser.longitude) {
        setLocation({
          enabled: true,
          latitude: currentUser.latitude,
          longitude: currentUser.longitude,
          loading: false
        })
      }
    }
    navigateTo('edit-profile')
  }

  // Handle WhatsApp contact click
  const handleWhatsAppClick = (e: React.MouseEvent, user: Usuario) => {
    e.preventDefault()
    
    if (!currentUser) {
      toast.error('Faça login para entrar em contato')
      navigateTo('verify')
      return
    }

    // Abrir modal de pagamento PIX
    setPrestadorSelecionado(user)
    setShowPagamento(true)
  }

  // Handle payment success
  const handleContactWithPaymentClick = (user: Usuario) => {
    // Verificar se o usuário está logado
    if (!currentUser) {
      toast.error('Você precisa estar logado para entrar em contato')
      setCurrentScreen('verify')
      return
    }

    // Verificar se não está tentando contatar a si mesmo
    if (currentUser.id === user.id) {
      toast.error('Você não pode entrar em contato consigo mesmo')
      return
    }

    // Abrir modal de pagamento
    setSelectedPrestador(user)
    setShowPayment(true)
    toast.loading('Preparando pagamento...')
  }

  // Handle payment success
  const handlePaymentSuccess = (whatsappUrl: string) => {
    setShowPayment(false)
    setSelectedPrestador(null)
    toast.dismiss()
    toast.success('Pagamento confirmado! Redirecionando para WhatsApp...')
    
    // Redirecionar para WhatsApp após um pequeno delay
    setTimeout(() => {
      window.open(whatsappUrl, '_blank')
    }, 1000)
  }

  // Handle payment close
  const handlePaymentClose = () => {
    setShowPayment(false)
    setSelectedPrestador(null)
    toast.dismiss()
  }

  // Close payment modal
  const closePaymentModal = () => {
    setShowPagamento(false)
    setPrestadorSelecionado(null)
  }

  // Renderização das telas
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <div className="screen active">
            <div className="hero-container">
              {/* Logo TEX */}
              <div className="tex-logo-container-inside">
                <div className="tex-logo-text-inside">TEX</div>
              </div>

              {/* Título principal */}
              <h1>
                Encontre profissionais
                <span>próximos a você</span>
              </h1>

              {/* Caixa de busca */}
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Buscar por serviços, profissionais ou localização..."
                  value={searchFilters.search}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, search: e.target.value }))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      setSearchFilters(prev => ({ ...prev, search: e.currentTarget.value }))
                      navigateTo('feed')
                    }
                  }}
                />
                
                <button 
                  className="explore-btn"
                  onClick={() => navigateTo('feed')}
                >
                  <i className="fas fa-search"></i>
                  Explorar Profissionais
                </button>
              </div>

              {/* Status de localização */}
              <div className="location-status">
                {!location.enabled ? (
                  <button 
                    className="location-enable-btn"
                    onClick={enableLocation}
                    disabled={location.loading}
                  >
                    <i className="fas fa-map-marker-alt"></i>
                    {location.loading ? 'Obtendo localização...' : 'Ativar localização para busca próxima'}
                  </button>
                ) : (
                  <p className="location-gps-status">
                    <i className="fas fa-check-circle"></i>
                    Localização ativada
                  </p>
                )}
              </div>

              {/* Botão de login via WhatsApp */}
              <button 
                className="whatsapp-login-btn"
                onClick={() => navigateTo('verify')}
              >
                <i className="fab fa-whatsapp"></i>
                Entrar com WhatsApp
              </button>

              {/* Footer info */}
              <div className="hero-footer-info">
                <nav className="hero-footer-nav">
                  <button onClick={() => navigateTo('about')}>Sobre</button>
                  <button onClick={() => navigateTo('terms')}>Termos</button>
                  <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">Suporte</a>
                </nav>
                <div className="hero-copyright">
                  © 2025 TrampoExpress. Do trampo ao encontro.
                </div>
              </div>
            </div>
          </div>
        )

      case 'verify':
        return (
          <div className="screen active">
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>

            <div className="form-container">
              <h2>Entrar no TEX</h2>
              <p>Digite seu número do WhatsApp para entrar ou criar sua conta</p>

              <div className="phone-input">
                <span className="country-code">+55</span>
                <input
                  type="tel"
                  placeholder="11999887766"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleWhatsAppVerification()
                    }
                  }}
                />
              </div>

              <div className="info-box">
                <i className="fab fa-whatsapp"></i>
                <p>
                  Usamos seu WhatsApp apenas para identificação. 
                  Não enviamos mensagens automáticas.
                </p>
              </div>

              <button 
                className="verify-btn"
                onClick={handleWhatsAppVerification}
                disabled={loading || !whatsappNumber.trim()}
              >
                {loading ? 'Verificando...' : 'Continuar'}
              </button>
            </div>
          </div>
        )

      case 'profile-setup':
        return (
          <div className="screen active">
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>

            <div className="form-container">
              <h2>Criar Perfil Profissional</h2>
              <p>Complete seu perfil para começar a receber contatos</p>

              <div className="profile-setup">
                {/* Upload de foto */}
                <div className="photo-upload">
                  <div className="photo-preview">
                    {profileData.foto_url ? (
                      <img src={profileData.foto_url} alt="Foto do perfil" />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>
                  <label htmlFor="photo-input">
                    <i className="fas fa-camera"></i>
                    Adicionar Foto
                  </label>
                  <input
                    id="photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </div>

                {/* Nome */}
                <div className="form-group">
                  <label>Nome Completo *</label>
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={profileData.nome}
                    onChange={(e) => setProfileData(prev => ({ ...prev, nome: e.target.value }))}
                  />
                </div>

                {/* Descrição */}
                <div className="form-group">
                  <label>Descrição dos Serviços *</label>
                  <textarea
                    placeholder="Descreva seus serviços, experiência e diferenciais..."
                    value={profileData.descricao}
                    onChange={(e) => setProfileData(prev => ({ ...prev, descricao: e.target.value }))}
                    rows={4}
                  />
                </div>

                {/* Tags/Especialidades */}
                <div className="form-group">
                  <label>Especialidades *</label>
                  <div className="tags-input">
                    <input
                      type="text"
                      placeholder="Digite uma especialidade e pressione Enter"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                    />
                    <div className="tags-container">
                      {profileData.tags.map((tag, index) => (
                        <span key={index} className="tag">
                          {tag}
                          <i className="fas fa-times" onClick={() => removeTag(tag)}></i>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div className="form-group">
                  <label>Localização</label>
                  <input
                    type="text"
                    placeholder="Cidade, bairro ou região"
                    value={profileData.localizacao}
                    onChange={(e) => setProfileData(prev => ({ ...prev, localizacao: e.target.value }))}
                  />
                  
                  <div className="location-gps-option">
                    {!location.enabled ? (
                      <button 
                        className="location-gps-btn"
                        onClick={enableLocation}
                        disabled={location.loading}
                      >
                        <i className="fas fa-map-marker-alt"></i>
                        {location.loading ? 'Obtendo localização...' : 'Usar localização atual'}
                      </button>
                    ) : (
                      <p className="location-gps-status">
                        <i className="fas fa-check-circle"></i>
                        Localização GPS ativada
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label>Status Inicial</label>
                  <div className="status-toggle">
                    <button
                      className={`status-btn ${profileData.status === 'available' ? 'active' : ''}`}
                      onClick={() => setProfileData(prev => ({ ...prev, status: 'available' }))}
                    >
                      <span className="dot available"></span>
                      Disponível
                    </button>
                    <button
                      className={`status-btn ${profileData.status === 'busy' ? 'active' : ''}`}
                      onClick={() => setProfileData(prev => ({ ...prev, status: 'busy' }))}
                    >
                      <span className="dot busy"></span>
                      Ocupado
                    </button>
                  </div>
                </div>

                {/* Preview do WhatsApp */}
                <div className="whatsapp-preview">
                  <h4>Como aparecerá no WhatsApp:</h4>
                  <div className="contact-preview">
                    <i className="fab fa-whatsapp"></i>
                    <span>{currentUser?.whatsapp}</span>
                  </div>
                </div>

                <button 
                  className="save-profile-btn"
                  onClick={saveProfile}
                  disabled={loading || !profileData.nome.trim() || !profileData.descricao.trim() || profileData.tags.length === 0}
                >
                  {loading ? 'Salvando...' : 'Criar Perfil'}
                </button>
              </div>
            </div>
          </div>
        )

      case 'feed':
        return (
          <div className="screen active">
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>

            <div className="feed">
              {/* Header de busca */}
              <div className="search-header">
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Buscar profissionais..."
                    value={searchFilters.search}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                  {searchFilters.search && (
                    <button 
                      className="clear-search"
                      onClick={() => setSearchFilters(prev => ({ ...prev, search: '' }))}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>

                {/* Filtros de proximidade */}
                <div className="proximity-filters">
                  <div className="filter-row">
                    <button
                      className={`proximity-toggle ${searchFilters.proximityEnabled ? 'active' : ''}`}
                      onClick={() => setSearchFilters(prev => ({ ...prev, proximityEnabled: !prev.proximityEnabled }))}
                      disabled={!location.enabled}
                    >
                      <i className="fas fa-map-marker-alt"></i>
                      Busca por proximidade
                    </button>
                    
                    {!location.enabled && (
                      <button 
                        className="enable-location-btn"
                        onClick={enableLocation}
                        disabled={location.loading}
                      >
                        <i className="fas fa-location-arrow"></i>
                        {location.loading ? 'Ativando...' : 'Ativar GPS'}
                      </button>
                    )}
                  </div>

                  {searchFilters.proximityEnabled && location.enabled && (
                    <div className="radius-selector">
                      <label>Raio:</label>
                      <select
                        value={searchFilters.radius}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                      >
                        <option value={5}>5 km</option>
                        <option value={10}>10 km</option>
                        <option value={25}>25 km</option>
                        <option value={50}>50 km</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="search-results-info">
                  {loading ? 'Carregando...' : `${users.length} profissionais encontrados`}
                </div>
              </div>

              {/* Lista de usuários */}
              {loading ? (
                <div className="loading-container">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Carregando profissionais...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="no-results">
                  <i className="fas fa-search"></i>
                  <h3>Nenhum profissional encontrado</h3>
                  <p>Tente ajustar os filtros de busca ou ampliar a área de pesquisa</p>
                  <div className="no-results-actions">
                    <button 
                      onClick={() => setSearchFilters({ search: '', tags: [], proximityEnabled: false, radius: 10 })}
                    >
                      Ver todos os profissionais
                    </button>
                    <button className="back-home-btn" onClick={() => navigateTo('home')}>
                      <i className="fas fa-home"></i>
                      Voltar ao início
                    </button>
                  </div>
                </div>
              ) : (
                <div className="users-list">
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
                                {user.distancia}km
                              </span>
                            )}
                          </div>
                          <p className="description">{user.descricao}</p>
                          {user.localizacao && (
                            <p className="location">
                              <i className="fas fa-map-marker-alt"></i>
                              {user.localizacao}
                            </p>
                          )}
                          <span className={`status status-${user.status}`}>
                            {user.status === 'available' ? 'Disponível' : 'Ocupado'}
                          </span>
                        </div>
                      </div>

                      <div className="hashtags">
                        {user.tags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="tag-clickable"
                            onClick={() => {
                              setSearchFilters(prev => ({ 
                                ...prev, 
                                tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag]
                              }))
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <button
                        className="whatsapp-btn"
                       onClick={(e) => handleWhatsAppClick(e, user)}
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
        )

      case 'my-profile':
        return (
          <div className="screen active">
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>

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
                        <span className={`status status-${currentUser.status}`}>
                          {currentUser.status === 'available' ? 'Disponível' : 'Ocupado'}
                        </span>
                      </div>
                    </div>

                    <div className="hashtags">
                      {currentUser.tags.map((tag, index) => (
                        <span key={index}>#{tag}</span>
                      ))}
                    </div>

                    {/* Toggle de status */}
                    <div className="status-toggle-profile">
                      <button
                        className={`status-btn-profile ${currentUser.status === 'available' ? 'active' : ''}`}
                        onClick={() => updateUserStatus('available')}
                      >
                        <span className="dot available"></span>
                        Disponível
                      </button>
                      <button
                        className={`status-btn-profile ${currentUser.status === 'busy' ? 'active' : ''}`}
                        onClick={() => updateUserStatus('busy')}
                      >
                        <span className="dot busy"></span>
                        Ocupado
                      </button>
                    </div>
                  </div>

                  {/* Estatísticas do perfil */}
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
                      <span>Perfil {currentUser.verificado ? 'Verificado' : 'Não Verificado'}</span>
                    </div>
                  </div>

                  {/* Ações do perfil */}
                  <div className="profile-actions">
                    <button className="edit-profile-btn" onClick={prepareEditProfile}>
                      <i className="fas fa-edit"></i>
                      Editar Perfil
                    </button>
                    <button className="delete-profile-btn" onClick={deleteProfile}>
                      <i className="fas fa-trash"></i>
                      Excluir Perfil
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-profile">
                  <i className="fas fa-user-slash"></i>
                  <h3>Nenhum perfil encontrado</h3>
                  <p>Você precisa estar logado para ver seu perfil</p>
                  <button className="create-profile-btn" onClick={() => navigateTo('verify')}>
                    Fazer Login
                  </button>
                </div>
              )}
            </div>
          </div>
        )

      case 'edit-profile':
        return (
          <div className="screen active">
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>

            <div className="form-container">
              <h2>Editar Perfil</h2>
              <p>Atualize suas informações profissionais</p>

              <div className="profile-setup">
                {/* Upload de foto */}
                <div className="photo-upload">
                  <div className="photo-preview">
                    {profileData.foto_url ? (
                      <img src={profileData.foto_url} alt="Foto do perfil" />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>
                  <label htmlFor="edit-photo-input">
                    <i className="fas fa-camera"></i>
                    Alterar Foto
                  </label>
                  <input
                    id="edit-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </div>

                {/* Nome */}
                <div className="form-group">
                  <label>Nome Completo *</label>
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={profileData.nome}
                    onChange={(e) => setProfileData(prev => ({ ...prev, nome: e.target.value }))}
                  />
                </div>

                {/* Descrição */}
                <div className="form-group">
                  <label>Descrição dos Serviços *</label>
                  <textarea
                    placeholder="Descreva seus serviços, experiência e diferenciais..."
                    value={profileData.descricao}
                    onChange={(e) => setProfileData(prev => ({ ...prev, descricao: e.target.value }))}
                    rows={4}
                  />
                </div>

                {/* Tags/Especialidades */}
                <div className="form-group">
                  <label>Especialidades *</label>
                  <div className="tags-input">
                    <input
                      type="text"
                      placeholder="Digite uma especialidade e pressione Enter"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                    />
                    <div className="tags-container">
                      {profileData.tags.map((tag, index) => (
                        <span key={index} className="tag">
                          {tag}
                          <i className="fas fa-times" onClick={() => removeTag(tag)}></i>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div className="form-group">
                  <label>Localização</label>
                  <input
                    type="text"
                    placeholder="Cidade, bairro ou região"
                    value={profileData.localizacao}
                    onChange={(e) => setProfileData(prev => ({ ...prev, localizacao: e.target.value }))}
                  />
                  
                  <div className="location-gps-option">
                    {!location.enabled ? (
                      <button 
                        className="location-gps-btn"
                        onClick={enableLocation}
                        disabled={location.loading}
                      >
                        <i className="fas fa-map-marker-alt"></i>
                        {location.loading ? 'Obtendo localização...' : 'Usar localização atual'}
                      </button>
                    ) : (
                      <p className="location-gps-status">
                        <i className="fas fa-check-circle"></i>
                        Localização GPS ativada
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label>Status</label>
                  <div className="status-toggle">
                    <button
                      className={`status-btn ${profileData.status === 'available' ? 'active' : ''}`}
                      onClick={() => setProfileData(prev => ({ ...prev, status: 'available' }))}
                    >
                      <span className="dot available"></span>
                      Disponível
                    </button>
                    <button
                      className={`status-btn ${profileData.status === 'busy' ? 'active' : ''}`}
                      onClick={() => setProfileData(prev => ({ ...prev, status: 'busy' }))}
                    >
                      <span className="dot busy"></span>
                      Ocupado
                    </button>
                  </div>
                </div>

                <div className="edit-actions">
                  <button 
                    className="save-profile-btn"
                    onClick={updateProfile}
                    disabled={loading || !profileData.nome.trim() || !profileData.descricao.trim() || profileData.tags.length === 0}
                  >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                  <button className="cancel-edit-btn" onClick={goBack}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'about':
        return (
          <div className="screen active">
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>

            <div className="content-container">
              <h1 className="page-title">
                <i className="fas fa-info-circle"></i>
                Sobre o TEX
              </h1>
              
              <div className="about-content">
                <div className="content-section">
                  <p className="intro-text">
                    O TEX (TrampoExpress) é a plataforma que conecta profissionais qualificados 
                    a pessoas que precisam de serviços de qualidade. Do trampo ao encontro!
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
                      <p>Converse diretamente com os profissionais via WhatsApp de forma rápida e segura.</p>
                    </div>

                    <div className="feature-card">
                      <i className="fas fa-shield-alt"></i>
                      <h3>Perfis Verificados</h3>
                      <p>Profissionais com perfis completos e informações verificadas para sua segurança.</p>
                    </div>

                    <div className="feature-card">
                      <i className="fas fa-mobile-alt"></i>
                      <h3>100% Mobile</h3>
                      <p>Aplicativo otimizado para celular, funciona offline e pode ser instalado na tela inicial.</p>
                    </div>
                  </div>

                  <div className="warning-box">
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>
                      <strong>Importante:</strong> O TEX é uma plataforma de conexão. 
                      Sempre verifique credenciais, peça orçamentos e negocie diretamente 
                      com os profissionais. Não nos responsabilizamos pelos serviços prestados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'terms':
        return (
          <div className="screen active">
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>

            <div className="content-container">
              <h1 className="page-title">
                <i className="fas fa-file-contract"></i>
                Termos de Uso
              </h1>
              
              <div className="terms-content">
                <div className="terms-section">
                  <h2><i className="fas fa-handshake"></i> Aceitação dos Termos</h2>
                  <p>
                    Ao usar o TEX, você concorda com estes termos. Se não concordar, 
                    não use nossos serviços.
                  </p>
                </div>

                <div className="terms-section">
                  <h2><i className="fas fa-user-check"></i> Uso da Plataforma</h2>
                  <p>O TEX conecta prestadores de serviços e clientes. Você concorda em:</p>
                  <ul>
                    <li>Fornecer informações verdadeiras e atualizadas</li>
                    <li>Não usar a plataforma para atividades ilegais</li>
                    <li>Respeitar outros usuários</li>
                    <li>Não criar perfis falsos ou duplicados</li>
                  </ul>
                </div>

                <div className="terms-section">
                  <h2><i className="fas fa-shield-alt"></i> Responsabilidades</h2>
                  <p>
                    O TEX é apenas uma plataforma de conexão. Não somos responsáveis por:
                  </p>
                  <ul>
                    <li>Qualidade dos serviços prestados</li>
                    <li>Negociações entre usuários</li>
                    <li>Problemas decorrentes dos serviços contratados</li>
                  </ul>
                </div>

                <div className="terms-section">
                  <h2><i className="fas fa-lock"></i> Privacidade</h2>
                  <p>
                    Protegemos seus dados de acordo com nossa política de privacidade. 
                    Ao usar o TEX, você concorda com nossa coleta e uso de informações conforme descrito.
                  </p>
                </div>

                <div className="terms-section">
                  <h2><i className="fas fa-edit"></i> Modificações</h2>
                  <p>
                    Reservamos o direito de modificar estes termos a qualquer momento. 
                    Alterações significativas serão notificadas aos usuários.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="screen active">
            <div className="hero-container">
              <h1>Página não encontrada</h1>
              <button onClick={() => navigateTo('home')}>Voltar ao início</button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="app">
      {/* Botão de perfil no header (sempre visível) */}
      {currentUser && (
        <>
          <button 
            className="profile-header-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            {currentUser.foto_url ? (
              <img src={currentUser.foto_url} alt="Perfil" />
            ) : (
              <i className="fas fa-user"></i>
            )}
          </button>

          {/* Menu dropdown do perfil */}
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
                      Buscar Profissionais
                    </button>
                    <button 
                      className="profile-menu-item"
                      onClick={prepareEditProfile}
                    >
                      <i className="fas fa-edit"></i>
                      Editar Perfil
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
                      onClick={logout}
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

      {/* Renderizar tela atual */}
      {renderScreen()}

      {/* Payment Modal */}
      {showPagamento && prestadorSelecionado && currentUser && (
        <PagamentoPix
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }
        }}
      />

      {/* Payment Modal */}
      {showPayment && selectedPrestador && currentUser && (
        <PagamentoPix
          prestadorId={selectedPrestador.id}
          prestadorNome={selectedPrestador.nome}
          prestadorWhatsapp={selectedPrestador.whatsapp}
          clienteId={currentUser.id}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <style jsx>{`
        .contact-paid-btn {
          width: 100%;
          background: linear-gradient(135deg, #FFD700, #00FFFF);
          color: #000;
          border: none;
          padding: 1rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .contact-paid-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
        }
      `}</style>

    </div>
  )
}

export default App