import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { DatabaseService } from './lib/database'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import './index.css'

interface Usuario {
  id: string
  nome: string | null
  whatsapp: string | null
  descricao: string | null
  tags: string[]
  foto_url: string | null
  localizacao: string | null
  status: string | null
  criado_em: string | null
  latitude?: number | null
  longitude?: number | null
  distancia?: number
}

function App() {
  const [currentScreen, setCurrentScreen] = useState('home')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState('available')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [previousScreen, setPreviousScreen] = useState('home')
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [searchRadius, setSearchRadius] = useState(10) // km
  const [sortByDistance, setSortByDistance] = useState(false)

  const dbService = new DatabaseService()

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
        status: 'available',
        criado_em: new Date().toISOString(),
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
        status: 'available',
        criado_em: new Date().toISOString(),
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
        status: 'busy',
        criado_em: new Date().toISOString(),
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
        status: 'available',
        criado_em: new Date().toISOString(),
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
        status: 'available',
        criado_em: new Date().toISOString(),
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
        status: 'available',
        criado_em: new Date().toISOString(),
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
        status: 'busy',
        criado_em: new Date().toISOString(),
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
        status: 'available',
        criado_em: new Date().toISOString(),
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
        status: 'available',
        criado_em: new Date().toISOString(),
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
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4167,
        longitude: -48.4944
      },
      {
        id: 'exemplo11',
        nome: 'Ricardo Alves',
        whatsapp: '48899887766',
        descricao: 'Jardineiro e paisagista. Manutenção de jardins, poda de árvores e criação de paisagens.',
        tags: ['jardineiro', 'paisagismo', 'poda'],
        foto_url: 'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Córrego Grande',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5833,
        longitude: -48.5167
      },
      {
        id: 'exemplo12',
        nome: 'Camila Rodrigues',
        whatsapp: '48888776655',
        descricao: 'Acompanhante de turismo em Florianópolis. Conheço todos os pontos turísticos da ilha.',
        tags: ['acompanhante', 'turismo', 'guia'],
        foto_url: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Beira Mar Norte',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5833,
        longitude: -48.5500
      },
      {
        id: 'exemplo13',
        nome: 'Bruno Martins',
        whatsapp: '48877665544',
        descricao: 'Pedreiro e construção civil. Reformas, construções e acabamentos. Trabalho com qualidade.',
        tags: ['pedreiro', 'construção', 'reforma'],
        foto_url: 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Estreito',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5833,
        longitude: -48.5667
      },
      {
        id: 'exemplo14',
        nome: 'Patrícia Silva',
        whatsapp: '48866554433',
        descricao: 'Diarista e faxineira. Limpeza residencial e comercial. Trabalho com produtos ecológicos.',
        tags: ['diarista', 'limpeza', 'faxina'],
        foto_url: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC - Pantanal',
        status: 'busy',
        criado_em: new Date().toISOString(),
        latitude: -27.6167,
        longitude: -48.5333
      },
      {
        id: 'exemplo15',
        nome: 'André Santos',
        whatsapp: '48855443322',
        descricao: 'Técnico em informática. Manutenção de computadores, notebooks e instalação de redes.',
        tags: ['técnico', 'informática', 'computador'],
        foto_url: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'São José, SC - Campinas',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5833,
        longitude: -48.6167
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
        timeout: 30000, // Aumentado de 10000 para 30000 (30 segundos)
        maximumAge: 300000 // 5 minutos
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
      return { ...user, distancia: 999 } // Usuários sem localização ficam por último
    })

    // Filtrar por raio se especificado
    const filtered = usersWithDistance.filter(user => 
      user.distancia === undefined || user.distancia <= searchRadius
    )

    // Ordenar por distância
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
      // Se der erro, manter apenas os usuários de exemplo
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
      
      // Simular login - criar um usuário temporário
      setCurrentUser({ id: userId, phone: phone })
      
      setCurrentScreen('profile')
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
    
    // Debug: vamos ver o que está acontecendo
    console.log('Tentando adicionar tag:', trimmedTag)
    console.log('Tags atuais:', tags)
    console.log('Condições:', {
      temTexto: !!trimmedTag,
      menorQue3: tags.length < 3,
      naoExiste: !tags.includes(trimmedTag)
    })
    
    if (trimmedTag && tags.length < 3 && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag]
      setTags(newTags)
      setTagInput('')
      console.log('Tag adicionada! Novas tags:', newTags)
    } else {
      console.log('Tag não foi adicionada')
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
    console.log('Tentando salvar perfil...')
    console.log('Nome:', name.trim())
    console.log('Tags:', tags)
    console.log('Quantidade de tags:', tags.length)
    
    if (!name.trim()) {
      alert('Por favor, preencha seu nome')
      return
    }
    
    // Verificar se há pelo menos uma tag
    if (!tags || tags.length === 0) {
      alert('Por favor, adicione pelo menos uma tag que descreva seu serviço (ex: pintor, eletricista, designer)')
      return
    }

    setLoading(true)
    try {
      if (!currentUser) throw new Error('Usuário não autenticado')

      let fotoUrl = ''
      if (photoFile) {
        // Para simplificar, vamos usar uma URL de placeholder
        // Em produção, você faria upload real da imagem
        fotoUrl = URL.createObjectURL(photoFile)
      }

      // Criar perfil usando o número de WhatsApp como ID e contato
      const novoUsuario = {
        id: currentUser.id,
        nome: name,
        whatsapp: phone, // O mesmo número usado para login
        descricao: description,
        tags,
        foto_url: fotoUrl,
        localizacao: location,
        status,
        latitude: userLocation?.lat || null,
        longitude: userLocation?.lng || null
      }

      console.log('Salvando usuário:', novoUsuario)

      // Adicionar à lista local (simulando salvamento no banco)
      setUsuarios(prev => [novoUsuario, ...prev])

      alert('Perfil salvo com sucesso!')
      setCurrentScreen('feed')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      alert('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="min-h-screen bg-black text-white">
      <PWAInstallPrompt />
      
      <header className="fixed top-0 w-full bg-black/80 backdrop-blur-md p-6 flex justify-between items-center z-50">
        <div 
          className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-cyan-400 bg-clip-text text-transparent cursor-pointer"
          onClick={handleBackToHome}
        >
          TEX
        </div>
        {/* Ícones removidos conforme solicitado */}
      </header>

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