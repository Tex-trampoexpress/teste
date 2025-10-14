import React, { useState, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { DatabaseService, type Usuario, type CreateUsuarioData, type UpdateUsuarioData } from './lib/database'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import HomeScreen from './components/screens/HomeScreen'
import VerifyScreen from './components/screens/VerifyScreen'
import ProfileSetupScreen from './components/screens/ProfileSetupScreen'
import FeedScreen from './components/screens/FeedScreen'
import MyProfileScreen from './components/screens/MyProfileScreen'
import EditProfileScreen from './components/screens/EditProfileScreen'
import AboutScreen from './components/screens/AboutScreen'
import TermsScreen from './components/screens/TermsScreen'
import PaymentScreenWrapper from './components/screens/PaymentScreenWrapper'

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

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([{ screen: 'home' }])
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [proximityEnabled, setProximityEnabled] = useState(false)
  const [proximityRadius, setProximityRadius] = useState(10)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    nome: '',
    descricao: '',
    tags: [],
    foto_url: '',
    localizacao: '',
    status: 'available',
    latitude: null,
    longitude: null
  })
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    initializeApp()
    setupBackButtonHandler()
  }, [])

  useEffect(() => {
    if (currentScreen === 'feed') {
      searchUsers()
    }
  }, [currentScreen])

  const initializeApp = async () => {
    const savedUser = localStorage.getItem('tex-current-user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setIsLoggedIn(true)
        DatabaseService.updateLastAccess(user.id)
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

  const navigateTo = (screen: Screen, data?: any) => {
    const newState = { screen, data }
    setNavigationHistory(prev => [...prev, newState])
    setCurrentScreen(screen)
    setShowProfileMenu(false)
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

  const handleWhatsAppVerification = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Digite seu número do WhatsApp')
      return
    }
    const formattedNumber = whatsappNumber.replace(/\D/g, '')
    if (formattedNumber.length < 10) {
      toast.error('Número do WhatsApp inválido')
      return
    }
    const fullNumber = formattedNumber.startsWith('55') ? `+${formattedNumber}` : `+55${formattedNumber}`
    setIsVerifying(true)
    try {
      const existingUser = await DatabaseService.getUsuarioByWhatsApp(fullNumber)
      if (existingUser) {
        setCurrentUser(existingUser)
        setIsLoggedIn(true)
        localStorage.setItem('tex-current-user', JSON.stringify(existingUser))
        DatabaseService.updateLastAccess(existingUser.id)
        toast.success(`Bem-vindo de volta, ${existingUser.nome}!`)
        if (existingUser.perfil_completo) {
          navigateTo('feed')
        } else {
          navigateTo('profile-setup')
        }
      } else {
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
        setProfileForm(prev => ({ ...prev, status: 'available' }))
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

  const searchUsers = async (resetPage: boolean = true) => {
    if (resetPage) {
      setLoading(true)
      setPage(1)
      setUsers([])
    }

    try {
      let results: Usuario[] = []
      let hasMoreResults = false
      let total = 0

      if (proximityEnabled && userLocation) {
        results = await DatabaseService.getUsersByProximity(
          userLocation.latitude,
          userLocation.longitude,
          proximityRadius
        )
        hasMoreResults = false
        total = results.length
      } else {
        const response = await DatabaseService.getUsuarios({
          search: searchTerm,
          status: 'available',
          limit: 20,
          page: resetPage ? 1 : page
        })
        results = response.users
        hasMoreResults = response.hasMore
        total = response.total
      }

      if (resetPage) {
        setUsers(results)
      } else {
        setUsers(prev => [...prev, ...results])
      }

      setHasMore(hasMoreResults)
      setTotalUsers(total)

      console.log(`📊 Total: ${total}, Carregados: ${results.length}, Mais: ${hasMoreResults}`)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Erro na busca. Tente novamente.')
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }

  const loadMoreUsers = async () => {
    if (isLoadingMore || !hasMore || loading || proximityEnabled) return

    console.log(`⬇️ Carregando mais usuários... Página ${page + 1}`)
    setIsLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)

    try {
      const response = await DatabaseService.getUsuarios({
        search: searchTerm,
        status: 'available',
        limit: 20,
        page: nextPage
      })

      if (response.users.length > 0) {
        setUsers(prev => [...prev, ...response.users])
        setHasMore(response.hasMore)
        console.log(`✅ +${response.users.length} usuários carregados (Total: ${users.length + response.users.length}/${response.total})`)
      } else {
        setHasMore(false)
        console.log('📭 Nenhum usuário adicional encontrado')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mais:', error)
      toast.error('Erro ao carregar mais profissionais')
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleTagClick = (tag: string) => {
    setSearchTerm(tag)
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !profileForm.tags.includes(tag.trim())) {
      setProfileForm(prev => ({ ...prev, tags: [...prev.tags, tag.trim()] }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setProfileForm(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }))
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

  const handleContactClick = (user: Usuario) => {
    const clienteId = currentUser?.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
      const cleanPhone = paymentData.prestadorWhatsApp.replace(/\D/g, '')
      const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent('Olá! Paguei a taxa no TEX e gostaria de conversar sobre seus serviços.')}`
      console.log('📱 Redirecionando para WhatsApp:', whatsappUrl)
      window.open(whatsappUrl, '_blank')
      toast.success('Redirecionando para WhatsApp...')
      setTimeout(() => {
        navigateTo('feed')
      }, 2000)
    }
  }

  const renderProfileHeader = () => {
    if (!isLoggedIn || !currentUser) {
      return (
        <button className="whatsapp-login-btn" onClick={() => navigateTo('verify')}>
          <i className="fab fa-whatsapp"></i>
          Entrar com WhatsApp
        </button>
      )
    }
    return (
      <div className="profile-header-container">
        <button className="profile-header-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
          {currentUser.foto_url ? <img src={currentUser.foto_url} alt={currentUser.nome} /> : null}
          <i className={`fas fa-user ${currentUser.foto_url ? 'hidden' : ''}`}></i>
        </button>
        {showProfileMenu && (
          <>
            <div className="profile-menu-overlay" onClick={() => setShowProfileMenu(false)}></div>
            <div className="profile-menu">
              <div className="profile-menu-content">
                <div className="profile-menu-header">
                  <div className="profile-menu-avatar">
                    {currentUser.foto_url ? <img src={currentUser.foto_url} alt={currentUser.nome} /> : <i className="fas fa-user"></i>}
                  </div>
                  <div className="profile-menu-info">
                    <h4>{currentUser.nome || 'Usuário'}</h4>
                    <p>{currentUser.whatsapp}</p>
                  </div>
                </div>
                <div className="profile-menu-actions">
                  <button className="profile-menu-item" onClick={() => navigateTo('my-profile')}>
                    <i className="fas fa-user"></i>
                    Meu Perfil
                  </button>
                  <button className="profile-menu-item" onClick={() => navigateTo('feed')}>
                    <i className="fas fa-search"></i>
                    Explorar
                  </button>
                  <div className="profile-menu-divider"></div>
                  <button className="profile-menu-item" onClick={() => navigateTo('about')}>
                    <i className="fas fa-info-circle"></i>
                    Sobre
                  </button>
                  <button className="profile-menu-item" onClick={() => navigateTo('terms')}>
                    <i className="fas fa-file-contract"></i>
                    Termos
                  </button>
                  <div className="profile-menu-divider"></div>
                  <button className="profile-menu-item logout" onClick={handleLogout}>
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

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen searchTerm={searchTerm} onSearchTermChange={setSearchTerm} onSearchEnter={() => navigateTo('feed')} navigateTo={navigateTo} locationStatus={locationStatus} requestLocation={requestLocation} renderProfileHeader={renderProfileHeader} />
      case 'verify':
        return <VerifyScreen whatsappNumber={whatsappNumber} onWhatsappChange={setWhatsappNumber} handleWhatsAppVerification={handleWhatsAppVerification} isVerifying={isVerifying} renderBackButton={renderBackButton} />
      case 'profile-setup':
        return <ProfileSetupScreen profileForm={profileForm} onNomeChange={(v) => setProfileForm(prev => ({ ...prev, nome: v }))} onDescricaoChange={(v) => setProfileForm(prev => ({ ...prev, descricao: v }))} onLocalizacaoChange={(v) => setProfileForm(prev => ({ ...prev, localizacao: v }))} setProfileForm={setProfileForm} addTag={addTag} removeTag={removeTag} handlePhotoUpload={handlePhotoUpload} handleProfileSave={handleProfileSave} currentUser={currentUser} userLocation={userLocation} requestLocation={requestLocation} renderBackButton={renderBackButton} />
      case 'feed':
        return <FeedScreen searchTerm={searchTerm} onSearchTermChange={setSearchTerm} onSearchUsersEnter={searchUsers} proximityEnabled={proximityEnabled} setProximityEnabled={setProximityEnabled} userLocation={userLocation} requestLocation={requestLocation} proximityRadius={proximityRadius} setProximityRadius={setProximityRadius} searchUsers={searchUsers} loading={loading} users={users} handleTagClick={handleTagClick} handleContactClick={handleContactClick} navigateTo={navigateTo} renderBackButton={renderBackButton} loadMoreUsers={loadMoreUsers} hasMore={hasMore} isLoadingMore={isLoadingMore} totalUsers={totalUsers} />
      case 'my-profile':
        return <MyProfileScreen currentUser={currentUser} setCurrentUser={setCurrentUser} setProfileForm={setProfileForm} navigateTo={navigateTo} handleDeleteProfile={handleDeleteProfile} renderBackButton={renderBackButton} />
      case 'edit-profile':
        return <EditProfileScreen profileForm={profileForm} onNomeChange={(v) => setProfileForm(prev => ({ ...prev, nome: v }))} onDescricaoChange={(v) => setProfileForm(prev => ({ ...prev, descricao: v }))} onLocalizacaoChange={(v) => setProfileForm(prev => ({ ...prev, localizacao: v }))} setProfileForm={setProfileForm} addTag={addTag} removeTag={removeTag} handlePhotoUpload={handlePhotoUpload} handleProfileUpdate={handleProfileUpdate} navigateTo={navigateTo} renderBackButton={renderBackButton} />
      case 'about':
        return <AboutScreen renderBackButton={renderBackButton} />
      case 'terms':
        return <TermsScreen renderBackButton={renderBackButton} />
      case 'payment':
        return <PaymentScreenWrapper navigationHistory={navigationHistory} goBack={goBack} handlePaymentSuccess={handlePaymentSuccess} />
      default:
        return <HomeScreen searchTerm={searchTerm} onSearchTermChange={setSearchTerm} onSearchEnter={() => navigateTo('feed')} navigateTo={navigateTo} locationStatus={locationStatus} requestLocation={requestLocation} renderProfileHeader={renderProfileHeader} />
    }
  }

  return (
    <div className="App">
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: 'rgba(0, 0, 0, 0.8)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' } }} />
      <div className="screen active">{renderCurrentScreen()}</div>
      <PWAInstallPrompt />
    </div>
  )
}

export default App
