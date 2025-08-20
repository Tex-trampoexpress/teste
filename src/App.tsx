import React, { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { DatabaseService, type Usuario } from './lib/database'
import { MercadoPagoService, type PaymentData } from './lib/mercado-pago'
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
  const [quickUsers, setQuickUsers] = useState<Partial<Usuario>[]>([])
  const [quickLoading, setQuickLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['home'])
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [proximityEnabled, setProximityEnabled] = useState(false)
  const [proximityRadius, setProximityRadius] = useState(10)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // Payment states
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [selectedPrestador, setSelectedPrestador] = useState<Usuario | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)

  // Terms acceptance state
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

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

  // Sistema de navegação com histórico para botão nativo
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log('🔙 Botão nativo pressionado, estado:', event.state)
      
      if (event.state && event.state.screen) {
        // Navegar para a tela do histórico
        setCurrentScreen(event.state.screen)
        
        // Atualizar histórico local
        setNavigationHistory(prev => {
          const newHistory = [...prev]
          if (newHistory[newHistory.length - 1] !== event.state.screen) {
            newHistory.push(event.state.screen)
          }
          return newHistory
        })
      } else {
        // Se não há estado, voltar para home
        setCurrentScreen('home')
        setNavigationHistory(['home'])
      }
    }

    // Adicionar listener para o botão nativo
    window.addEventListener('popstate', handlePopState)
    
    // Estado inicial
    if (window.history.state === null) {
      window.history.replaceState({ screen: 'home' }, '', window.location.pathname)
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Função para navegar com histórico
  const navigateToScreen = (screen: string, pushToHistory: boolean = true) => {
    console.log('🧭 Navegando para:', screen)
    
    setCurrentScreen(screen)
    
    if (pushToHistory) {
      // Adicionar ao histórico do navegador
      window.history.pushState({ screen }, '', window.location.pathname)
      
      // Atualizar histórico local
      setNavigationHistory(prev => [...prev, screen])
    }
  }

  // Save user session when currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tex_user_whatsapp', currentUser.whatsapp)
      console.log('💾 Sessão salva para:', currentUser.nome)
      console.log('💾 Sessão salva para:', currentUser.nome)
    }
  }, [currentUser])

  // Load user data on mount
  useEffect(() => {
    // Check if terms were already accepted
    const acceptedTerms = localStorage.getItem('tex-terms-accepted')
    if (acceptedTerms === 'true') {
      setTermsAccepted(true)
    }

    console.log('🔄 Verificando sessão salva...')
    const savedUser = localStorage.getItem('tex-user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setIsLoggedIn(true)
        // Se tem usuário salvo, vai para o feed
        // Se tem usuário salvo, vai para o feed
        // Se tem usuário salvo, vai para o feed
        setCurrentScreen('feed')
        loadUsuarios()
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error)
        localStorage.removeItem('tex-user')
      }
    } else {
      console.log('ℹ️ Nenhuma sessão salva encontrada')
    }
  }, [])

  // Handle explore button click
  const handleExploreClick = () => {
    if (!termsAccepted) {
      setShowTermsModal(true)
    } else {
      navigateTo('feed')
      loadUsuarios()
    }
  }

  // Handle terms acceptance
  const handleAcceptTerms = () => {
    setTermsAccepted(true)
    localStorage.setItem('tex-terms-accepted', 'true')
    localStorage.setItem('tex-terms-accepted-date', new Date().toISOString())
    setShowTermsModal(false)
    navigateTo('feed')
    loadUsuarios()
  }

  // Handle terms rejection
  const handleRejectTerms = () => {
    setShowTermsModal(false)
  }

  // WhatsApp login
  const handleWhatsAppLogin = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Digite seu número do WhatsApp')
      return
    }

    setLoading(true)
    try {
      // Limpar o número (manter apenas dígitos)
      const cleanNumber = whatsappNumber.replace(/\D/g, '')
      console.log('📱 Verificando WhatsApp:', cleanNumber)
      const existingUser = await DatabaseService.getUsuarioByWhatsApp(whatsappNumber)
      if (existingUser) {
        console.log('⚠️ Usuário já existe, redirecionando para perfil')
        setCurrentUser(existingUser)
        localStorage.setItem('currentUser', JSON.stringify(existingUser))
        toast.success(`Bem-vindo de volta, ${existingUser.nome}!`)
        setCurrentScreen('userProfile')
        return
      }

      // Buscar usuário existente
      const existingUser2 = await DatabaseService.getUsuarioByWhatsApp(cleanNumber)
      
      if (cleanNumber.length < 10) {
        console.log('✅ Usuário existente encontrado:', existingUser2.nome)
        return
      }
      
      if (existingUser2) {
        console.log('✅ Usuário encontrado:', existingUser2.nome)
        console.log('📋 Perfil completo - indo para perfil')
        setProfileData({
          nome: existingUser2.nome,
          descricao: existingUser2.descricao || '',
          tags: existingUser2.tags || [],
          foto_url: existingUser2.foto_url || '',
          localizacao: existingUser2.localizacao || '',
          status: existingUser2.status || 'available',
          latitude: existingUser2.latitude,
          longitude: existingUser2.longitude
        })
        console.log('📝 Perfil incompleto - indo para edição')
        setCurrentUser({
          id: existingUser2.id,
          nome: existingUser2.nome,
          whatsapp: cleanNumber,
          descricao: existingUser2.descricao || '',
          tags: existingUser2.tags || [],
          foto_url: existingUser2.foto_url || '',
          localizacao: existingUser2.localizacao || '',
          status: existingUser2.status || 'available',
          latitude: existingUser2.latitude,
          longitude: existingUser2.longitude,
          criado_em: existingUser2.criado_em,
          atualizado_em: existingUser2.atualizado_em,
          ultimo_acesso: existingUser2.ultimo_acesso,
          perfil_completo: existingUser2.perfil_completo,
          verificado: existingUser2.verificado
        })
        navigateTo('profile-setup')
      } else {
        console.log('🆕 Usuário novo - indo para criação')
        const newUserId = crypto.randomUUID()
        setCurrentUser({
          id: newUserId,
          nome: '',
          whatsapp: cleanNumber, // Salvar número limpo
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
        navigateTo('profile-setup')
        toast.success('Vamos criar seu perfil profissional!')
      }
    } catch (error) {
      console.error('❌ Erro no login:', error)
      toast.error('Erro ao fazer login. Verifique sua conexão e tente novamente.', {
        duration: 4000,
        icon: '❌'
      })
    } finally {
      setLoading(false)
    }
  }

  // Load users
  const loadUsuarios = async (reset: boolean = false) => {
    setLoading(true)
    try {
      const currentOffset = reset ? 0 : offset
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
          limit: 10,
          offset: currentOffset
        })
      }

      if (reset) {
        setUsuarios(users)
        setOffset(10)
      } else {
        setUsuarios(prev => [...prev, ...users])
        setOffset(prev => prev + 10)
      }
      
      setHasMore(users.length === 10)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar profissionais')
    } finally {
      setLoading(false)
    }
  }

  // Carregamento rápido inicial
  const loadQuickUsers = async () => {
    try {
      setQuickLoading(true)
      const quickData = await DatabaseService.getUsuariosRapido(8)
      setQuickUsers(quickData)
    } catch (error) {
      console.error('❌ Erro no carregamento rápido:', error)
    } finally {
      setQuickLoading(false)
    }
  }

  // Load users when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsuarios(true) // Reset on filter change
    }, 300) // Debounce de 300ms
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedTags])

  // Carregamento inicial rápido
  useEffect(() => {
    loadQuickUsers()
  }, [])

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
  const handleContact = async (user: Usuario) => {
    try {
      console.log('💳 [PRODUÇÃO] Iniciando pagamento para:', user.nome)
      
      setSelectedPrestador(user)
      setLoading(true)
      console.log('🔐 Iniciando login com WhatsApp:', whatsappNumber)
      
      // Gerar ID único para cliente anônimo se não estiver logado
      const clienteId = currentUser?.id || crypto.randomUUID()
      
      console.log('🔑 Cliente ID:', clienteId)
      console.log('🔑 Prestador ID:', user.id)
      
      // Criar pagamento PIX
      const payment = await MercadoPagoService.createPixPayment({
        cliente_id: clienteId,
        prestador_id: user.id,
        amount: 2.02
      })
      
      console.log('✅ Pagamento criado com sucesso:', payment)
      setPaymentData(payment)
      navigateTo('payment')
      toast.success('💳 QR Code gerado! Complete o pagamento PIX')
      
    } catch (error) {
      console.error('❌ [PRODUÇÃO] Erro ao criar pagamento:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro: ${errorMessage}`)
      
      // Oferecer contato direto em caso de erro
      setTimeout(() => {
        if (confirm('Erro no sistema de pagamento.\n\nDeseja ir direto para o WhatsApp?')) {
          handleDirectContact(user)
        }
      }, 1000)
    } finally {
      setLoading(false)
    }
  }

  // Check payment and redirect to WhatsApp
  const handlePaymentCheck = async () => {
    if (!paymentData || !selectedPrestador) return

    setCheckingPayment(true)
    try {
      console.log('🔍 Verificando pagamento:', paymentData.id)
      
      const paymentStatus = await MercadoPagoService.checkPaymentStatus(paymentData.id)
      console.log('📊 Status do pagamento:', paymentStatus)
      
      console.log('🔍 Verificando se usuário existe...')
      if (paymentStatus.status === 'approved') {
        console.log('✅ Pagamento aprovado! Redirecionando para WhatsApp...')
        toast.success('🎉 Pagamento aprovado! Redirecionando para WhatsApp...')
        console.log('🎉 Usuário existente encontrado!')
        console.log('📊 Dados:', {
          nome: existingUser.nome,
          perfil_completo: existingUser.perfil_completo,
          status: existingUser.status
        })
        
        const message = `Olá! Vi seu perfil no TEX e gostaria de conversar sobre seus serviços.`
        const whatsappUrl = `https://wa.me/55${selectedPrestador.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
        
        // Mostrar notificação de boas-vindas
        toast.success(`Bem-vindo de volta, ${existingUser.nome}! 👋`, {
          duration: 3000,
          icon: '🎉'
        })
        
        setTimeout(() => {
          window.open(whatsappUrl, '_blank')
        // Aguardar um pouco para garantir que o estado foi atualizado
        setTimeout(() => {
          // Mostrar mensagem de boas-vindas
          toast.success(`Bem-vindo de volta, ${existingUser.nome}! 🎉`)
          
          // Redirecionar baseado no perfil
          if (existingUser.perfil_completo) {
            console.log('📱 Perfil completo, indo para feed')
            navigateTo('feed')
          } else {
            console.log('📝 Perfil incompleto, indo para criação')
            navigateTo('create-profile')
          }
        }, 100)
        
      } else {
        console.log('⏳ Pagamento ainda pendente')
        navigateTo('create-profile')
      }
    } catch (error) {
      console.error('❌ Erro ao verificar pagamento:', error)
      toast.error('Erro ao verificar pagamento. Tente novamente.')
    } finally {
      setCheckingPayment(false)
    }
  }

  // Simulate payment approval (for testing)
  const handleSimulatePayment = () => {
    if (!selectedPrestador) return
    
    toast.success('🎉 Pagamento simulado! Redirecionando...')
    
    const message = `Olá! Vi seu perfil no TEX e gostaria de conversar sobre seus serviços.`
    const whatsappUrl = `https://wa.me/55${selectedPrestador.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    
    setTimeout(() => {
      window.open(whatsappUrl, '_blank')
      navigateTo('feed')
      setPaymentData(null)
      setSelectedPrestador(null)
    }, 1000)
  }

  // Cancel payment
  const handleCancelPayment = () => {
    if (paymentData) {
      console.log('❌ Cancelando pagamento:', paymentData.id)
    }
    navigateTo('feed')
    setPaymentData(null)
    setSelectedPrestador(null)
    toast.success('Pagamento cancelado')
  }

  // Direct WhatsApp contact (fallback)
  const handleDirectContact = (user: Usuario) => {
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

  // Status toggle handler
  const [statusLoading, setStatusLoading] = useState(false)
  
  const handleStatusToggle = async () => {
    if (!currentUser) return
    
    setStatusLoading(true)
    try {
      const newStatus = currentUser.status === 'available' ? 'busy' : 'available'
      const updatedUser = await DatabaseService.updateUsuario(currentUser.id, { status: newStatus })
      setCurrentUser(updatedUser)
      localStorage.setItem('tex-user', JSON.stringify(updatedUser))
      toast.success(`Status alterado para ${newStatus === 'available' ? 'Disponível' : 'Ocupado'}`)
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status')
    } finally {
      setStatusLoading(false)
    }
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
            ) : (
              <i className="fas fa-user"></i>
            )}
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

      {/* Terms Acceptance Modal */}
      {showTermsModal && (
        <div className="terms-modal-overlay">
          <div className="terms-modal">
            <div className="terms-modal-header">
              <h3>📋 Termos de Uso</h3>
              <p>Leia e aceite os termos para continuar</p>
            </div>
            
            <div className="terms-modal-content">
              <div className="terms-text">
                <h4>🔗 Sobre o TEX - TrampoExpress</h4>
                <p>
                  O TEX é uma plataforma de <strong>conexão</strong> que facilita o encontro 
                  entre prestadores de serviços e clientes.
                </p>
                
                <h4>⚠️ Importante - Nossa Responsabilidade</h4>
                <ul>
                  <li>✅ <strong>Conectamos</strong> você com profissionais qualificados</li>
                  <li>❌ <strong>NÃO nos responsabilizamos</strong> pela qualidade dos serviços</li>
                  <li>❌ <strong>NÃO executamos</strong> nem intermediamos os serviços</li>
                  <li>❌ <strong>NÃO temos responsabilidade</strong> sobre acordos entre as partes</li>
                </ul>
                
                <h4>💬 Como Funciona</h4>
                <p>
                  Toda negociação, acordo de preços, prazos e execução do serviço 
                  acontece <strong>diretamente entre você e o prestador via WhatsApp</strong>.
                </p>
                
                <div className="terms-highlight">
                  <i className="fas fa-info-circle"></i>
                  <p>
                    <strong>Resumo:</strong> O TEX apenas conecta. Tudo é resolvido 
                    diretamente entre as partes no WhatsApp.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="terms-modal-actions">
              <button 
                className="terms-reject-btn"
                onClick={handleRejectTerms}
              >
                ❌ Não Aceito
              </button>
              <button 
                className="terms-accept-btn"
                onClick={handleAcceptTerms}
              >
                ✅ Aceito e Continuar
              </button>
            </div>
          </div>
        </div>
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

          <h3 className="trampoexpress-subtitle">TrampoExpress</h3>

          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar serviços ou acompanhantes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <button 
              className="explore-btn"
              onClick={handleExploreClick}
            >
              <i className="fas fa-search"></i>
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
              <button 
                onClick={() => {
                  setCurrentScreen('home')
                  // setNavigationHistory(['home'])
                }}
                className={currentScreen === 'home' ? 'active' : ''}
              >
                Home
              </button>
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

          <div className="profiles-grid">
            {quickLoading && usuarios.length === 0 ? (
              // Loading skeleton
              [...Array(6)].map((_, i) => (
                <div key={i} className="profile-card loading">
                  <div className="profile-header">
                    <div className="profile-pic skeleton"></div>
                    <div className="profile-info">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line short"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Mostrar usuários rápidos primeiro, depois os completos
              (usuarios.length > 0 ? usuarios : quickUsers).map((usuario) => (
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
                    {usuario.tags?.map((tag, index) => (
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
                    disabled={selectedPrestador?.id === usuario.id && loading}
                  >
                    <i className="fab fa-whatsapp"></i>
                    {(selectedPrestador?.id === usuario.id && loading) ? 'Gerando PIX...' : 'Entrar em Contato - R$ 2,02'}
                  </button>
                </div>
              ))
            )}
          </div>

          {!quickLoading && !loading && usuarios.length === 0 && quickUsers.length === 0 && (
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
          )}
          
          {/* Botão carregar mais */}
          {hasMore && usuarios.length > 0 && (
            <div className="load-more-container">
              <button 
                className="load-more-btn"
                onClick={() => loadUsuarios(false)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Carregando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus"></i>
                    Carregar mais profissionais
                  </>
                )}
              </button>
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
                  <div className="profile-avatar">
                    {currentUser.foto_url ? (
                      <img 
                        src={currentUser.foto_url} 
                        alt={currentUser.nome}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <i className={`fas fa-user ${currentUser.foto_url ? 'hidden' : ''}`}></i>
                  </div>
                  <h2>{currentUser.nome}</h2>
                  <p className="profile-whatsapp">📱 {currentUser.whatsapp}</p>
                  
                  {/* Status Badge */}
                  <div className={`status-badge ${currentUser.status}`}>
                    <span className="status-dot"></span>
                    {currentUser.status === 'available' ? 'Disponível' : 'Ocupado'}
                  </div>
                </div>

                {/* Profile Content */}
                <div className="profile-content">
                  {/* Description */}
                  {currentUser.descricao && (
                    <div className="profile-section">
                      <h3><i className="fas fa-info-circle"></i> Sobre</h3>
                      <p className="profile-description">{currentUser.descricao}</p>
                    </div>
                  )}

                  {/* Tags/Specialties */}
                  {currentUser.tags && currentUser.tags.length > 0 && (
                    <div className="profile-section">
                      <h3><i className="fas fa-tags"></i> Especialidades</h3>
                      <div className="tags-grid">
                        {currentUser.tags.map((tag, index) => (
                          <span key={index} className="profile-tag">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {currentUser.localizacao && (
                    <div className="profile-section">
                      <h3><i className="fas fa-map-marker-alt"></i> Localização</h3>
                      <p className="profile-location">{currentUser.localizacao}</p>
                    </div>
                  )}

                  {/* Member Since */}
                  <div className="profile-section">
                    <h3><i className="fas fa-calendar-alt"></i> Informações</h3>
                    <div className="profile-stats">
                      <div className="stat-item">
                        <span className="stat-label">Membro desde</span>
                        <span className="stat-value">{new Date(currentUser.criado_em).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Último acesso</span>
                        <span className="stat-value">{new Date(currentUser.ultimo_acesso).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Perfil</span>
                        <span className={`stat-value ${currentUser.perfil_completo ? 'complete' : 'incomplete'}`}>
                          {currentUser.perfil_completo ? '✅ Completo' : '⚠️ Incompleto'}
                        </span>
                      </div>
                      {currentUser.verificado && (
                        <div className="stat-item">
                          <span className="stat-label">Status</span>
                          <span className="stat-value verified">✅ Verificado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="profile-actions-grid">
                  <button 
                    className="btn-secondary"
                    onClick={() => setCurrentScreen('editProfile')}
                  >
                    <i className="fas fa-edit"></i>
                    Editar Perfil
                  </button>
                  
                  <button 
                    className={`btn-status ${currentUser.status}`}
                    onClick={handleStatusToggle}
                    disabled={statusLoading}
                  >
                    <i className={`fas ${statusLoading ? 'fa-spinner fa-spin' : currentUser.status === 'available' ? 'fa-pause' : 'fa-play'}`}></i>
                    {statusLoading ? 'Atualizando...' : currentUser.status === 'available' ? 'Marcar como Ocupado' : 'Marcar como Disponível'}
                  </button>
                  
                  <button 
                    className="btn-danger"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja sair?')) {
                        setCurrentUser(null)
                        setCurrentScreen('home')
                        localStorage.removeItem('currentUser')
                        toast.success('Logout realizado com sucesso!')
                      }
                    }}
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    Sair
                  </button>
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

      {/* Payment Screen */}
      <div className={`screen ${currentScreen === 'payment' ? 'active' : ''}`}>
        <div className="payment-container">
          {paymentData && selectedPrestador ? (
            <>
              <div className="payment-header">
                <h2>💳 Pagamento PIX</h2>
                <p>Complete o pagamento para entrar em contato com <strong>{selectedPrestador.nome}</strong></p>
              </div>

              <div className="payment-info">
                <div className="payment-amount">
                  <span className="amount-label">Valor:</span>
                  <span className="amount-value">R$ 2,02</span>
                </div>
                <p className="payment-description">
                  Taxa única para conexão com prestador de serviço
                </p>
              </div>

              <div className="qr-code-section">
                <h3>📱 Escaneie o QR Code</h3>
                {paymentData.qr_code_base64 ? (
                  <div className="qr-code-container">
                    <img 
                      src={`data:image/png;base64,${paymentData.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="qr-code-image"
                    />
                  </div>
                ) : (
                  <div className="qr-code-placeholder">
                    <i className="fas fa-qrcode"></i>
                    <p>QR Code não disponível</p>
                  </div>
                )}
              </div>

              <div className="pix-copy-section">
                <h3>📋 PIX Copia e Cola</h3>
                <div className="pix-code-container">
                  <input
                    type="text"
                    value={paymentData.qr_code}
                    readOnly
                    className="pix-code-input"
                  />
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentData.qr_code)
                      toast.success('Código PIX copiado!')
                    }}
                  >
                    <i className="fas fa-copy"></i>
                    Copiar
                  </button>
                </div>
                <p className="pix-instructions">
                  Cole este código no seu app do banco para fazer o pagamento
                </p>
              </div>

              <div className="payment-actions">
                <button
                  className="payment-check-btn"
                  onClick={handlePaymentCheck}
                  disabled={checkingPayment}
                >
                  <i className={`fas ${checkingPayment ? 'fa-spinner fa-spin' : 'fa-check-circle'}`}></i>
                  {checkingPayment ? 'Verificando...' : '✅ Já Paguei - Verificar'}
                </button>
                
                <button
                  className="payment-cancel-btn"
                  onClick={handleCancelPayment}
                >
                  <i className="fas fa-times"></i>
                  ❌ Cancelar
                </button>
              </div>

              <div className="payment-help">
                <h4>💡 Como pagar com PIX:</h4>
                <ol>
                  <li>📱 Abra o app do seu banco</li>
                  <li>💳 Escolha a opção PIX</li>
                  <li>📷 Escaneie o QR Code ou cole o código</li>
                  <li>✅ Confirme o pagamento de R$ 2,02</li>
                  <li>🔄 Volte aqui e clique "Já Paguei"</li>
                  <li>📞 Acesse o WhatsApp!</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="payment-error">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>❌ Erro no Pagamento</h3>
              <p>Não foi possível gerar o PIX. Tente novamente.</p>
              <button 
                className="back-btn"
                onClick={() => navigateTo('feed')}
              >
                🔄 Voltar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App