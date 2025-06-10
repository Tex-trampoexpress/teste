import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { DatabaseService, Usuario, CreateUsuarioData, UpdateUsuarioData } from './lib/database'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import './index.css'

function App() {
  const [currentScreen, setCurrentScreen] = useState('home')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState<'available' | 'busy'>('available')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Usuario | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [previousScreen, setPreviousScreen] = useState('home')
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [searchRadius, setSearchRadius] = useState(10) // km
  const [sortByDistance, setSortByDistance] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Criar usuários de exemplo com coordenadas de Florianópolis
  const createExampleUsers = () => {
    const exemplos = [
      {
        id: 'exemplo1',
        nome: 'João Silva',
        whatsapp: '48999887766',
        descricao: 'Eletricista com 10 anos de experiência. Atendo residencial e comercial com garantia em toda Grande Florianópolis.',
        tags: ['eletricista', 'residencial', 'comercial'],
        foto_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Centro',
        status: 'available' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.5954,
        longitude: -48.5480
      },
      {
        id: 'exemplo2',
        nome: 'Maria Santos',
        whatsapp: '48988776655',
        descricao: 'Designer gráfica freelancer. Criação de logos, cartões e materiais publicitários. Atendo presencial e online.',
        tags: ['design', 'logo', 'publicidade'],
        foto_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Trindade',
        status: 'available' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.6014,
        longitude: -48.5200
      },
      {
        id: 'exemplo3',
        nome: 'Carlos Pereira',
        whatsapp: '48977665544',
        descricao: 'Encanador especializado em vazamentos e instalações. Atendimento 24h emergencial na Grande Floripa.',
        tags: ['encanador', 'vazamento', '24h'],
        foto_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'São José, SC - Kobrasol',
        status: 'busy' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.6108,
        longitude: -48.6326
      },
      {
        id: 'exemplo4',
        nome: 'Ana Costa',
        whatsapp: '48966554433',
        descricao: 'Professora particular de matemática e física. Ensino fundamental e médio. Aulas presenciais e online.',
        tags: ['professora', 'matemática', 'física'],
        foto_url: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Lagoa da Conceição',
        status: 'available' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.6389,
        longitude: -48.4556
      },
      {
        id: 'exemplo5',
        nome: 'Pedro Oliveira',
        whatsapp: '48955443322',
        descricao: 'Desenvolvedor web especializado em React e Node.js. Criação de sites e sistemas para empresas.',
        tags: ['programador', 'website', 'sistema'],
        foto_url: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Itacorubi',
        status: 'available' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.5707,
        longitude: -48.5020
      },
      {
        id: 'exemplo6',
        nome: 'Lucia Fernandes',
        whatsapp: '48944332211',
        descricao: 'Cabeleireira e manicure. Atendimento domiciliar e no salão. Especialista em cortes modernos e nail art.',
        tags: ['cabeleireira', 'manicure', 'domiciliar'],
        foto_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Palhoça, SC - Cidade Universitária',
        status: 'available' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.6394,
        longitude: -48.6700
      },
      {
        id: 'exemplo7',
        nome: 'Roberto Machado',
        whatsapp: '48933221100',
        descricao: 'Mecânico automotivo com 15 anos de experiência. Especialista em carros nacionais e importados.',
        tags: ['mecânico', 'automotivo', 'carros'],
        foto_url: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Biguaçu, SC - Centro',
        status: 'busy' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.4939,
        longitude: -48.6581
      },
      {
        id: 'exemplo8',
        nome: 'Fernanda Lima',
        whatsapp: '48922110099',
        descricao: 'Personal trainer e nutricionista. Treinos personalizados e acompanhamento nutricional na praia.',
        tags: ['personal', 'nutrição', 'fitness'],
        foto_url: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Canasvieiras',
        status: 'available' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.4389,
        longitude: -48.4556
      },
      {
        id: 'exemplo9',
        nome: 'Marcos Souza',
        whatsapp: '48911009988',
        descricao: 'Pintor residencial e comercial. Trabalho com texturas, grafiato e pintura decorativa.',
        tags: ['pintor', 'textura', 'decoração'],
        foto_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Santo Amaro da Imperatriz, SC',
        status: 'available' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.6889,
        longitude: -48.7778
      },
      {
        id: 'exemplo10',
        nome: 'Juliana Rocha',
        whatsapp: '48900998877',
        descricao: 'Fotógrafa profissional. Casamentos, eventos, ensaios e fotos corporativas. Especialista em fotos de praia.',
        tags: ['fotógrafa', 'casamento', 'eventos'],
        foto_url: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Jurerê Internacional',
        status: 'available' as const,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        latitude: -27.4167,
        longitude: -48.4944
      }
    ]
    
    return exemplos
  }

  // Função para calcular distância entre dois pontos (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Função para obter localização do usuário
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocalização não suportada')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setLocationPermission('granted')
        setLoading(false)
        console.log('Localização obtida:', { latitude, longitude })
      },
      (error) => {
        console.error('Erro ao obter localização:', error)
        setLocationPermission('denied')
        setLoading(false)
        
        // Usar localização padrão (centro de Florianópolis) para demonstração
        setUserLocation({ lat: -27.5954, lng: -48.5480 })
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 300000
      }
    )
  }

  // Filtrar usuários por proximidade
  const filterByProximity = (users: Usuario[]) => {
    if (!userLocation || !sortByDistance) return users

    const usersWithDistance = users.map(user => {
      if (user.latitude && user.longitude) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          user.latitude,
          user.longitude
        )
        return { ...user, distancia: distance }
      }
      return { ...user, distancia: 999 }
    })

    const filtered = usersWithDistance.filter(user => 
      user.distancia === undefined || user.distancia <= searchRadius
    )

    return filtered.sort((a, b) => (a.distancia || 999) - (b.distancia || 999))
  }

  useEffect(() => {
    // Carregar usuários de exemplo imediatamente
    const exampleUsers = createExampleUsers()
    setUsuarios(exampleUsers)
    setUsuariosFiltrados(exampleUsers)
    
    // Tentar carregar usuários do banco também
    loadUsuarios()

    // Tentar obter localização automaticamente
    getUserLocation()
  }, [])

  useEffect(() => {
    // Filtrar usuários baseado no termo de busca e proximidade
    let filtered = usuarios

    // Filtro por texto
    if (searchTerm.trim() !== '') {
      filtered = usuarios.filter(usuario => 
        usuario.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.localizacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filtro por proximidade
    filtered = filterByProximity(filtered)

    setUsuariosFiltrados(filtered)
  }, [searchTerm, usuarios, userLocation, sortByDistance, searchRadius])

  const loadUsuarios = async () => {
    try {
      const data = await DatabaseService.getUsuarios()
      // Mesclar com usuários de exemplo, evitando duplicatas
      setUsuarios(prev => {
        const existingIds = prev.map(u => u.id)
        const newUsers = data.filter(user => !existingIds.includes(user.id))
        return [...prev, ...newUsers]
      })
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    }
  }

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await DatabaseService.getUsuario(userId)
      setCurrentUserProfile(profile)
      return profile
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      return null
    }
  }

  const handleLogin = async () => {
    if (!phone || phone.length < 10) {
      alert('Por favor, insira um número de telefone válido')
      return
    }
    
    setLoading(true)
    try {
      // Gerar um ID único baseado no número de telefone
      const userId = `user_${phone.replace(/\D/g, '')}`
      
      // Verificar se já existe um perfil para este WhatsApp
      const existingProfile = await DatabaseService.getUsuarioByWhatsApp(phone)
      
      if (existingProfile) {
        // Usuário já tem perfil - fazer login
        setCurrentUser({ id: existingProfile.id, phone: phone })
        setCurrentUserProfile(existingProfile)
        setCurrentScreen('myProfile')
      } else {
        // Novo usuário - ir para criação de perfil
        setCurrentUser({ id: userId, phone: phone })
        setCurrentScreen('profile')
      }
    } catch (error) {
      console.error('Erro no login:', error)
      alert('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase()
    
    if (trimmedTag && tags.length < 3 && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag]
      setTags(newTags)
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      alert('Por favor, preencha seu nome')
      return
    }
    
    if (!tags || tags.length === 0) {
      alert('Por favor, adicione pelo menos uma tag que descreva seu serviço')
      return
    }

    setLoading(true)
    try {
      if (!currentUser) throw new Error('Usuário não autenticado')

      let fotoUrl = ''
      if (photoFile) {
        fotoUrl = URL.createObjectURL(photoFile)
      }

      const userData: CreateUsuarioData = {
        id: currentUser.id,
        nome: name,
        whatsapp: phone,
        descricao: description || undefined,
        tags,
        foto_url: fotoUrl || undefined,
        localizacao: location || undefined,
        status,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng
      }

      // Salvar no banco de dados
      const savedUser = await DatabaseService.createUsuario(userData)
      
      // Atualizar estado local
      setCurrentUserProfile(savedUser)
      setUsuarios(prev => [savedUser, ...prev])

      alert('Perfil salvo com sucesso!')
      setCurrentScreen('myProfile')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      alert('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      alert('Por favor, preencha seu nome')
      return
    }
    
    if (!tags || tags.length === 0) {
      alert('Por favor, adicione pelo menos uma tag')
      return
    }

    setLoading(true)
    try {
      if (!currentUser || !currentUserProfile) throw new Error('Usuário não autenticado')

      let fotoUrl = photoPreview
      if (photoFile) {
        fotoUrl = URL.createObjectURL(photoFile)
      }

      const updateData: UpdateUsuarioData = {
        nome: name,
        descricao: description || undefined,
        tags,
        foto_url: fotoUrl || undefined,
        localizacao: location || undefined,
        status,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng
      }

      // Atualizar no banco de dados
      const updatedUser = await DatabaseService.updateUsuario(currentUserProfile.id, updateData)
      
      // Atualizar estado local
      setCurrentUserProfile(updatedUser)
      setUsuarios(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))

      alert('Perfil atualizado com sucesso!')
      setCurrentScreen('myProfile')
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      alert('Erro ao atualizar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!currentUserProfile) return

    const confirmDelete = confirm('Tem certeza que deseja excluir seu perfil? Esta ação não pode ser desfeita.')
    if (!confirmDelete) return

    setLoading(true)
    try {
      await DatabaseService.deleteUsuario(currentUserProfile.id)
      
      // Limpar estado local
      setCurrentUser(null)
      setCurrentUserProfile(null)
      setUsuarios(prev => prev.filter(u => u.id !== currentUserProfile.id))
      
      // Limpar formulário
      setName('')
      setDescription('')
      setLocation('')
      setTags([])
      setPhotoFile(null)
      setPhotoPreview('')
      setPhone('')

      alert('Perfil excluído com sucesso!')
      setCurrentScreen('home')
    } catch (error) {
      console.error('Erro ao excluir perfil:', error)
      alert('Erro ao excluir perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const startEditProfile = () => {
    if (!currentUserProfile) return

    // Preencher formulário com dados atuais
    setName(currentUserProfile.nome)
    setDescription(currentUserProfile.descricao || '')
    setLocation(currentUserProfile.localizacao || '')
    setTags(currentUserProfile.tags || [])
    setStatus(currentUserProfile.status)
    setPhotoPreview(currentUserProfile.foto_url || '')
    setPhotoFile(null)

    setCurrentScreen('editProfile')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentUserProfile(null)
    setName('')
    setDescription('')
    setLocation('')
    setTags([])
    setPhotoFile(null)
    setPhotoPreview('')
    setPhone('')
    setShowProfileMenu(false)
    setCurrentScreen('home')
  }

  const formatWhatsAppLink = (whatsapp: string, nome: string) => {
    const cleanPhone = whatsapp.replace(/\D/g, '')
    const message = `Olá ${nome}! Vi seu perfil no TEX e gostaria de conversar sobre seus serviços.`
    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const formatDistance = (distance?: number) => {
    if (!distance) return ''
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term.trim() !== '') {
      setPreviousScreen(currentScreen)
      setCurrentScreen('feed')
    }
  }

  const handleBackToHome = () => {
    setSearchTerm('')
    setCurrentScreen('home')
  }

  const handleBackToPrevious = () => {
    setSearchTerm('')
    setCurrentScreen(previousScreen)
  }

  const navigateToScreen = (screen: string) => {
    setPreviousScreen(currentScreen)
    setCurrentScreen(screen)
  }

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu)
  }

  const handleProfileMenuAction = (action: string) => {
    setShowProfileMenu(false)
    
    switch (action) {
      case 'view':
        navigateToScreen('myProfile')
        break
      case 'edit':
        startEditProfile()
        break
      case 'logout':
        handleLogout()
        break
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PWAInstallPrompt />
      
      <header className="fixed top-0 w-full bg-black/80 backdrop-blur-md p-6 flex justify-between items-center z-50">
        <div 
          className="tex-logo-container tex-logo-normal cursor-pointer"
          onClick={handleBackToHome}
        >
          <div className="tex-logo-text">TEX</div>
        </div>
        
        {/* Profile Menu - only show when user is logged in */}
        {currentUser && (
          <div className="relative">
            <button 
              className="profile-header-btn"
              onClick={toggleProfileMenu}
              title="Menu do Perfil"
            >
              <i className="fas fa-user"></i>
            </button>
            
            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="profile-menu">
                <div className="profile-menu-content">
                  {currentUserProfile && (
                    <div className="profile-menu-header">
                      <div className="profile-menu-avatar">
                        {currentUserProfile.foto_url ? (
                          <img src={currentUserProfile.foto_url} alt={currentUserProfile.nome} />
                        ) : (
                          <i className="fas fa-user"></i>
                        )}
                      </div>
                      <div className="profile-menu-info">
                        <h4>{currentUserProfile.nome}</h4>
                        <p>{formatPhoneDisplay(currentUserProfile.whatsapp)}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="profile-menu-actions">
                    <button 
                      className="profile-menu-item"
                      onClick={() => handleProfileMenuAction('view')}
                    >
                      <i className="fas fa-eye"></i>
                      Ver Perfil
                    </button>
                    
                    <button 
                      className="profile-menu-item"
                      onClick={() => handleProfileMenuAction('edit')}
                    >
                      <i className="fas fa-edit"></i>
                      Editar Perfil
                    </button>
                    
                    <div className="profile-menu-divider"></div>
                    
                    <button 
                      className="profile-menu-item logout"
                      onClick={() => handleProfileMenuAction('logout')}
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Overlay para fechar menu */}
      {showProfileMenu && (
        <div 
          className="profile-menu-overlay"
          onClick={() => setShowProfileMenu(false)}
        ></div>
      )}

      {/* Home Screen */}
      {currentScreen === 'home' && (
        <main className="screen active">
          <div className="hero-container">
            <h1>Do Trampo ao Encontro.<br /><span>Tá no TEX.</span></h1>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Procure serviços, pessoas ou encontros..."
                aria-label="Campo de busca"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchTerm)
                  }
                }}
              />
              <button 
                className="explore-btn" 
                type="button"
                onClick={() => handleSearch(searchTerm)}
              >
                {searchTerm.trim() ? 'Buscar' : 'Explorar Agora'}
              </button>
            </div>
            
            {/* Location Status */}
            <div className="location-status">
              {locationPermission === 'granted' && userLocation ? (
                <p className="text-green-400 text-sm">
                  <i className="fas fa-map-marker-alt"></i>
                  Localização ativa - encontre profissionais próximos
                </p>
              ) : (
                <button 
                  onClick={getUserLocation}
                  className="location-enable-btn"
                  disabled={loading}
                >
                  <i className="fas fa-map-marker-alt"></i>
                  {loading ? 'Obtendo localização...' : 'Ativar localização para busca próxima'}
                </button>
              )}
            </div>

            <button 
              className="whatsapp-login-btn"
              onClick={() => navigateToScreen('verify')}
            >
              <i className="fab fa-whatsapp"></i>
              Entrar com WhatsApp
            </button>
          </div>
        </main>
      )}

      {/* Verify Screen */}
      {currentScreen === 'verify' && (
        <main className="screen active">
          <div className="form-container">
            <div className="back-button-container">
              <button 
                className="back-button"
                onClick={handleBackToPrevious}
              >
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
            <h2>Entre com seu WhatsApp</h2>
            <p>Este número será usado para clientes entrarem em contato com você</p>
            <div className="phone-input">
              <span className="country-code">+55</span>
              <input 
                type="tel" 
                placeholder="(48) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={15}
              />
            </div>
            <div className="info-box">
              <i className="fas fa-info-circle"></i>
              <p>Seu número será exibido no seu perfil para que clientes possam te contatar diretamente pelo WhatsApp</p>
            </div>
            <button 
              className="verify-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Continuar'}
            </button>
          </div>
        </main>
      )}

      {/* My Profile Screen */}
      {currentScreen === 'myProfile' && (
        <main className="screen active">
          <div className="my-profile-content">
            <div className="back-button-container">
              <button 
                className="back-button"
                onClick={handleBackToPrevious}
              >
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>

            {currentUserProfile ? (
              <div className="form-container">
                <h2>Meu Perfil</h2>
                
                {/* Profile Display */}
                <div className="profile-card">
                  <div className="profile-header">
                    <div className="profile-pic">
                      {currentUserProfile.foto_url ? (
                        <img src={currentUserProfile.foto_url} alt={currentUserProfile.nome} />
                      ) : (
                        <div className="w-full h-full bg-gray-600 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-2xl"></i>
                        </div>
                      )}
                    </div>
                    <div className="profile-info">
                      <h2>{currentUserProfile.nome}</h2>
                      {currentUserProfile.descricao && (
                        <p className="description">{currentUserProfile.descricao}</p>
                      )}
                      {currentUserProfile.localizacao && (
                        <p className="text-sm text-gray-400">📍 {currentUserProfile.localizacao}</p>
                      )}
                      <span className={`status ${currentUserProfile.status === 'available' ? 'status-available' : 'status-busy'}`}>
                        {currentUserProfile.status === 'available' ? 'Disponível' : 'Ocupado'}
                      </span>
                    </div>
                  </div>
                  
                  {currentUserProfile.tags && currentUserProfile.tags.length > 0 && (
                    <div className="hashtags">
                      {currentUserProfile.tags.map(tag => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profile Stats */}
                <div className="profile-stats">
                  <div className="stat">
                    <i className="fas fa-calendar-alt"></i>
                    <span>Perfil criado em {formatDate(currentUserProfile.criado_em)}</span>
                  </div>
                  <div className="stat">
                    <i className="fab fa-whatsapp"></i>
                    <span>{formatPhoneDisplay(currentUserProfile.whatsapp)}</span>
                  </div>
                  {currentUserProfile.latitude && currentUserProfile.longitude && (
                    <div className="stat">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>Localização GPS ativa</span>
                    </div>
                  )}
                </div>

                {/* Profile Actions */}
                <div className="profile-actions">
                  <button 
                    className="edit-profile-btn"
                    onClick={startEditProfile}
                  >
                    <i className="fas fa-edit"></i>
                    Editar Perfil
                  </button>
                  
                  <button 
                    className="delete-profile-btn"
                    onClick={handleDeleteProfile}
                    disabled={loading}
                  >
                    <i className="fas fa-trash"></i>
                    {loading ? 'Excluindo...' : 'Excluir Perfil'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-container">
                <div className="no-profile">
                  <h2>Nenhum perfil encontrado</h2>
                  <p>Você ainda não criou seu perfil profissional</p>
                  <button 
                    className="create-profile-btn"
                    onClick={() => navigateToScreen('profile')}
                  >
                    Criar Perfil
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Profile Setup Screen */}
      {currentScreen === 'profile' && (
        <main className="screen active">
          <div className="form-container">
            <div className="back-button-container">
              <button 
                className="back-button"
                onClick={handleBackToPrevious}
              >
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
            <h2>Configure seu Perfil</h2>
            <div className="profile-setup">
              <div className="photo-upload">
                <div className="photo-preview">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" />
                  ) : (
                    <i className="fas fa-camera"></i>
                  )}
                </div>
                <input 
                  type="file" 
                  id="photo-input" 
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <label htmlFor="photo-input">Escolher Foto</label>
              </div>
              
              <div className="form-group">
                <label htmlFor="name">Nome</label>
                <input 
                  type="text" 
                  id="name" 
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Descrição</label>
                <textarea 
                  id="description" 
                  placeholder="Descreva seus serviços..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">Localização</label>
                <input 
                  type="text" 
                  id="location" 
                  placeholder="Sua cidade/região"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                {userLocation && (
                  <p className="text-sm text-green-400 mt-1">
                    <i className="fas fa-map-marker-alt"></i>
                    Coordenadas GPS serão salvas automaticamente
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Como você se identifica? (até 3 tags)</label>
                <p className="text-sm text-gray-400 mb-2">
                  Ex: pintor, eletricista, designer, professor, mecânico...
                </p>
                <div className="tags-input">
                  <input 
                    type="text" 
                    placeholder="Digite uma palavra e pressione Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    disabled={tags.length >= 3}
                  />
                  <div className="tags-container">
                    {tags.map(tag => (
                      <div key={tag} className="tag">
                        #{tag}
                        <i 
                          className="fas fa-times" 
                          onClick={() => removeTag(tag)}
                        ></i>
                      </div>
                    ))}
                  </div>
                  {tags.length >= 3 && (
                    <p className="text-sm text-yellow-400">
                      Máximo de 3 tags atingido. Remova uma tag para adicionar outra.
                    </p>
                  )}
                  {tags.length > 0 && (
                    <p className="text-sm text-green-400">
                      ✓ {tags.length} tag(s) adicionada(s)
                    </p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="status-toggle">
                  <button 
                    className={`status-btn ${status === 'available' ? 'active' : ''}`}
                    onClick={() => setStatus('available')}
                  >
                    <span className="dot available"></span>
                    Disponível
                  </button>
                  <button 
                    className={`status-btn ${status === 'busy' ? 'active' : ''}`}
                    onClick={() => setStatus('busy')}
                  >
                    <span className="dot busy"></span>
                    Ocupado
                  </button>
                </div>
              </div>

              <div className="whatsapp-preview">
                <h4>Prévia do seu contato:</h4>
                <div className="contact-preview">
                  <i className="fab fa-whatsapp"></i>
                  <span>{formatPhoneDisplay(phone)}</span>
                </div>
              </div>

              <button 
                className="save-profile-btn"
                onClick={handleSaveProfile}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Perfil'}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Edit Profile Screen */}
      {currentScreen === 'editProfile' && (
        <main className="screen active">
          <div className="form-container">
            <div className="back-button-container">
              <button 
                className="back-button"
                onClick={() => setCurrentScreen('myProfile')}
              >
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
            <h2>Editar Perfil</h2>
            <div className="profile-setup">
              <div className="photo-upload">
                <div className="photo-preview">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" />
                  ) : (
                    <i className="fas fa-camera"></i>
                  )}
                </div>
                <input 
                  type="file" 
                  id="edit-photo-input" 
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <label htmlFor="edit-photo-input">Alterar Foto</label>
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-name">Nome</label>
                <input 
                  type="text" 
                  id="edit-name" 
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Descrição</label>
                <textarea 
                  id="edit-description" 
                  placeholder="Descreva seus serviços..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-location">Localização</label>
                <input 
                  type="text" 
                  id="edit-location" 
                  placeholder="Sua cidade/região"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Tags (até 3)</label>
                <div className="tags-input">
                  <input 
                    type="text" 
                    placeholder="Digite uma palavra e pressione Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    disabled={tags.length >= 3}
                  />
                  <div className="tags-container">
                    {tags.map(tag => (
                      <div key={tag} className="tag">
                        #{tag}
                        <i 
                          className="fas fa-times" 
                          onClick={() => removeTag(tag)}
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
                    className={`status-btn ${status === 'available' ? 'active' : ''}`}
                    onClick={() => setStatus('available')}
                  >
                    <span className="dot available"></span>
                    Disponível
                  </button>
                  <button 
                    className={`status-btn ${status === 'busy' ? 'active' : ''}`}
                    onClick={() => setStatus('busy')}
                  >
                    <span className="dot busy"></span>
                    Ocupado
                  </button>
                </div>
              </div>

              <div className="edit-actions">
                <button 
                  className="save-profile-btn"
                  onClick={handleUpdateProfile}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                
                <button 
                  className="cancel-edit-btn"
                  onClick={() => setCurrentScreen('myProfile')}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Feed Screen */}
      {currentScreen === 'feed' && (
        <main className="screen active">
          <div className="feed">
            <div className="search-header">
              <div className="back-button-container">
                <button 
                  className="back-button"
                  onClick={handleBackToHome}
                >
                  <i className="fas fa-arrow-left"></i>
                  Início
                </button>
              </div>
              
              <div className="search-bar">
                <i className="fas fa-search"></i>
                <input 
                  type="text" 
                  placeholder="Buscar por nome, serviço ou localização..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              {/* Filtros de Proximidade */}
              <div className="proximity-filters">
                <div className="filter-row">
                  <button
                    className={`proximity-toggle ${sortByDistance ? 'active' : ''}`}
                    onClick={() => setSortByDistance(!sortByDistance)}
                    disabled={!userLocation}
                  >
                    <i className="fas fa-map-marker-alt"></i>
                    {sortByDistance ? 'Ordenado por distância' : 'Ordenar por proximidade'}
                  </button>
                  
                  {!userLocation && (
                    <button 
                      onClick={getUserLocation}
                      className="enable-location-btn"
                      disabled={loading}
                    >
                      <i className="fas fa-location-arrow"></i>
                      {loading ? 'Obtendo...' : 'Ativar GPS'}
                    </button>
                  )}
                </div>

                {sortByDistance && userLocation && (
                  <div className="radius-selector">
                    <label>Raio de busca:</label>
                    <select 
                      value={searchRadius} 
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                    >
                      <option value={1}>1 km</option>
                      <option value={2}>2 km</option>
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                      <option value={20}>20 km</option>
                      <option value={50}>50 km</option>
                      <option value={999}>Sem limite</option>
                    </select>
                  </div>
                )}
              </div>

              {searchTerm && (
                <div className="search-results-info">
                  <p>{usuariosFiltrados.length} resultado(s) para "{searchTerm}"</p>
                  {sortByDistance && userLocation && (
                    <p className="text-sm text-cyan-400">
                      Ordenado por proximidade • Raio: {searchRadius === 999 ? 'Ilimitado' : `${searchRadius}km`}
                    </p>
                  )}
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-yellow-400 to-cyan-400 bg-clip-text text-transparent">
              {searchTerm ? 'Resultados da Busca' : sortByDistance ? 'Profissionais Próximos' : 'Profissionais Disponíveis'}
            </h2>
            
            {usuariosFiltrados.length === 0 ? (
              <div className="no-results">
                <i className="fas fa-search"></i>
                <h3>Nenhum resultado encontrado</h3>
                <p>
                  {sortByDistance && userLocation 
                    ? `Nenhum profissional encontrado num raio de ${searchRadius}km`
                    : 'Tente buscar por outros termos ou explore todos os profissionais'
                  }
                </p>
                <div className="no-results-actions">
                  <button 
                    className="explore-all-btn"
                    onClick={() => {
                      setSearchTerm('')
                      setSortByDistance(false)
                    }}
                  >
                    Ver Todos os Profissionais
                  </button>
                  <button 
                    className="back-home-btn"
                    onClick={handleBackToHome}
                  >
                    <i className="fas fa-home"></i>
                    Voltar ao Início
                  </button>
                </div>
              </div>
            ) : (
              usuariosFiltrados.map(usuario => (
                <div key={usuario.id} className="profile-card mb-4">
                  <div className="profile-header">
                    <div className="profile-pic">
                      {usuario.foto_url ? (
                        <img src={usuario.foto_url} alt={usuario.nome || 'Usuário'} />
                      ) : (
                        <div className="w-full h-full bg-gray-600 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-2xl"></i>
                        </div>
                      )}
                    </div>
                    <div className="profile-info">
                      <div className="profile-name-distance">
                        <h2>{usuario.nome}</h2>
                        {usuario.distancia !== undefined && sortByDistance && (
                          <span className="distance-badge">
                            <i className="fas fa-map-marker-alt"></i>
                            {formatDistance(usuario.distancia)}
                          </span>
                        )}
                      </div>
                      {usuario.descricao && (
                        <p className="description">{usuario.descricao}</p>
                      )}
                      {usuario.localizacao && (
                        <p className="text-sm text-gray-400">📍 {usuario.localizacao}</p>
                      )}
                      <span className={`status ${usuario.status === 'available' ? 'status-available' : 'status-busy'}`}>
                        {usuario.status === 'available' ? 'Disponível' : 'Ocupado'}
                      </span>
                    </div>
                  </div>
                  
                  {usuario.tags && usuario.tags.length > 0 && (
                    <div className="hashtags">
                      {usuario.tags.map(tag => (
                        <span 
                          key={tag}
                          className="tag-clickable"
                          onClick={() => handleSearch(tag)}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {usuario.whatsapp && (
                    <a 
                      href={formatWhatsAppLink(usuario.whatsapp, usuario.nome || 'Profissional')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whatsapp-btn"
                    >
                      <i className="fab fa-whatsapp"></i>
                      Conversar no WhatsApp
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      )}

      <footer className="bg-black/80 backdrop-blur-md p-6 text-center">
        <nav className="footer-nav">
          <button onClick={handleBackToHome}>Home</button>
          <button onClick={() => navigateToScreen('feed')}>Feed</button>
          <a href="src/pages/about.html">Sobre</a>
          <a href="src/pages/terms.html">Termos</a>
        </nav>
        <div className="copyright">
          © 2025 TrampoExpress. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}

export default App