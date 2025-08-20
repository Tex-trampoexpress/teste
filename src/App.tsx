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
      console.log('🔐 Iniciando login com WhatsApp:', whatsapp)
      
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
          console.log('✅ Perfil completo, indo para feed...')
          navigateTo('feed')
          setPaymentData(null)
          console.log('⚠️ Perfil incompleto, indo para criação...')
          setSelectedPrestador(null)
        console.log('🆕 Usuário não encontrado, criando novo perfil...')
        toast.success('Vamos criar seu perfil! 🚀', {
          duration: 2000,
          icon: '✨'
        })
        
      } else {
        console.log('⏳ Pagamento ainda pendente')
        toast.error('Pagamento ainda não foi processado. Aguarde alguns instantes e tente novamente.')
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
      toast.success(`Status alterado para ${newStatus ===