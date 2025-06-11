import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { DatabaseService, Usuario } from './lib/database'
import toast, { Toaster } from 'react-hot-toast'
import PWAInstallPrompt from './components/PWAInstallPrompt'

interface LocationData {
  latitude: number
  longitude: number
  address?: string
}

function App() {
  // Estados principais
  const [currentScreen, setCurrentScreen] = useState('home')
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Estados do formulário de verificação
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Estados do perfil
  const [profileData, setProfileData] = useState({
    nome: '',
    descricao: '',
    tags: [] as string[],
    foto_url: '',
    localizacao: '',
    status: 'available' as 'available' | 'busy'
  })
  const [currentTag, setCurrentTag] = useState('')
  const [userLocation, setUserLocation] = useState<LocationData | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Estados da busca e feed
  const [searchTerm, setSearchTerm] = useState('')
  const [profiles, setProfiles] = useState<Usuario[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [proximityEnabled, setProximityEnabled] = useState(false)
  const [searchRadius, setSearchRadius] = useState(10)

  // Estados do menu do perfil
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Verificar se usuário já está logado ao carregar
  useEffect(() => {
    const savedUser = localStorage.getItem('tex-current-user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setIsLoggedIn(true)
        setProfileData({
          nome: user.nome || '',
          descricao: user.descricao || '',
          tags: user.tags || [],
          foto_url: user.foto_url || '',
          localizacao: user.localizacao || '',
          status: user.status || 'available'
        })
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error)
        localStorage.removeItem('tex-current-user')
      }
    }
  }, [])

  // Carregar perfis quando a tela mudar para feed
  useEffect(() => {
    if (currentScreen === 'feed') {
      loadProfiles()
    }
  }, [currentScreen, proximityEnabled, searchRadius])

  // Função para obter localização
  const getCurrentLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          
          try {
            // Tentar obter endereço usando reverse geocoding
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY`
            )
            
            let address = ''
            if (response.ok) {
              const data = await response.json()
              if (data.results && data.results[0]) {
                address = data.results[0].formatted
              }
            }
            
            resolve({ latitude, longitude, address })
          } catch (error) {
            // Se falhar ao obter endereço, retorna só as coordenadas
            resolve({ latitude, longitude })
          }
        },
        (error) => {
          reject(new Error('Erro ao obter localização: ' + error.message))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutos
        }
      )
    })
  }

  // Função para habilitar localização
  const enableLocation = async () => {
    try {
      setIsLoading(true)
      const location = await getCurrentLocation()
      setUserLocation(location)
      
      if (location.address) {
        setProfileData(prev => ({ ...prev, localizacao: location.address || '' }))
      }
      
      toast.success('Localização obtida com sucesso!')
    } catch (error) {
      console.error('Erro ao obter localização:', error)
      toast.error('Não foi possível obter sua localização')
    } finally {
      setIsLoading(false)
    }
  }

  // Função para verificar WhatsApp e fazer login
  const handleWhatsAppLogin = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Digite seu número do WhatsApp')
      return
    }

    // Formatar número
    let formattedPhone = phoneNumber.trim()
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+55' + formattedPhone.replace(/\D/g, '')
    }

    try {
      setIsVerifying(true)
      
      // Verificar se usuário já existe
      const existingUser = await DatabaseService.getUsuarioByWhatsApp(formattedPhone)
      
      if (existingUser) {
        // Usuário existe - fazer login
        setCurrentUser(existingUser)
        setIsLoggedIn(true)
        localStorage.setItem('tex-current-user', JSON.stringify(existingUser))
        
        if (existingUser.perfil_completo) {
          setCurrentScreen('feed')
          toast.success(`Bem-vindo de volta, ${existingUser.nome}!`)
        } else {
          setCurrentScreen('profile-setup')
          setProfileData({
            nome: existingUser.nome || '',
            descricao: existingUser.descricao || '',
            tags: existingUser.tags || [],
            foto_url: existingUser.foto_url || '',
            localizacao: existingUser.localizacao || '',
            status: existingUser.status || 'available'
          })
          toast.success('Complete seu perfil para continuar')
        }
      } else {
        // Usuário novo - ir para cadastro
        setCurrentScreen('profile-setup')
        setProfileData(prev => ({ ...prev }))
        toast.success('Vamos criar seu perfil!')
      }
    } catch (error) {
      console.error('Erro no login:', error)
      toast.error('Erro ao verificar WhatsApp. Tente novamente.')
    } finally {
      setIsVerifying(false)
    }
  }

  // Função para adicionar tag
  const addTag = () => {
    if (currentTag.trim() && !profileData.tags.includes(currentTag.trim().toLowerCase())) {
      setProfileData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim().toLowerCase()]
      }))
      setCurrentTag('')
    }
  }

  // Função para remover tag
  const removeTag = (tagToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Função para upload de foto
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.')
        return
      }

      // Verificar tipo do arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Apenas imagens são permitidas.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setProfileData(prev => ({ ...prev, foto_url: result }))
        toast.success('Foto carregada com sucesso!')
      }
      reader.readAsDataURL(file)
    }
  }

  // Função para salvar perfil (CORRIGIDA)
  const saveProfile = async () => {
    console.log('🔄 Iniciando salvamento do perfil...')
    console.log('📝 Dados do perfil:', profileData)
    console.log('👤 Usuário atual:', currentUser)
    console.log('📱 Telefone:', phoneNumber)
    console.log('✏️ Editando:', isEditingProfile)

    // Validações básicas
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

    try {
      setIsLoading(true)
      console.log('🚀 Iniciando operação no banco...')

      let user: Usuario

      if (currentUser && isEditingProfile) {
        // ATUALIZAR usuário existente
        console.log('✏️ Atualizando usuário existente:', currentUser.id)
        
        const updateData = {
          nome: profileData.nome.trim(),
          descricao: profileData.descricao.trim(),
          tags: profileData.tags,
          foto_url: profileData.foto_url || null,
          localizacao: profileData.localizacao?.trim() || null,
          status: profileData.status,
          latitude: userLocation?.latitude || null,
          longitude: userLocation?.longitude || null
        }

        console.log('📝 Dados para atualização:', updateData)
        user = await DatabaseService.updateUsuario(currentUser.id, updateData)
        console.log('✅ Usuário atualizado:', user)
        
      } else {
        // CRIAR novo usuário
        console.log('🆕 Criando novo usuário...')
        
        if (!phoneNumber.trim()) {
          toast.error('Número do WhatsApp é obrigatório')
          return
        }

        let formattedPhone = phoneNumber.trim()
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+55' + formattedPhone.replace(/\D/g, '')
        }

        const createData = {
          id: crypto.randomUUID(),
          nome: profileData.nome.trim(),
          whatsapp: formattedPhone,
          descricao: profileData.descricao.trim(),
          tags: profileData.tags,
          foto_url: profileData.foto_url || undefined,
          localizacao: profileData.localizacao?.trim() || undefined,
          status: profileData.status,
          latitude: userLocation?.latitude || undefined,
          longitude: userLocation?.longitude || undefined
        }

        console.log('📝 Dados para criação:', createData)
        user = await DatabaseService.createUsuario(createData)
        console.log('✅ Usuário criado:', user)
      }

      // Atualizar estado local
      setCurrentUser(user)
      setIsLoggedIn(true)
      localStorage.setItem('tex-current-user', JSON.stringify(user))
      
      // Navegar para a tela apropriada
      if (isEditingProfile) {
        setIsEditingProfile(false)
        setCurrentScreen('my-profile')
        toast.success('Perfil atualizado com sucesso!')
      } else {
        setCurrentScreen('feed')
        toast.success('Perfil criado com sucesso!')
      }

      console.log('🎉 Salvamento concluído com sucesso!')
      
    } catch (error) {
      console.error('❌ Erro ao salvar perfil:', error)
      
      // Mensagens de erro específicas
      if (error instanceof Error) {
        if (error.message.includes('WhatsApp já está cadastrado')) {
          toast.error('Este número de WhatsApp já está cadastrado')
        } else if (error.message.includes('obrigatório')) {
          toast.error(error.message)
        } else {
          toast.error('Erro ao salvar perfil: ' + error.message)
        }
      } else {
        toast.error('Erro inesperado ao salvar perfil')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Função para carregar perfis
  const loadProfiles = async () => {
    try {
      setIsSearching(true)
      let profiles: Usuario[]

      if (proximityEnabled && userLocation) {
        profiles = await DatabaseService.getUsersByProximity(
          userLocation.latitude,
          userLocation.longitude,
          searchRadius
        )
      } else {
        profiles = await DatabaseService.getUsuarios({
          search: searchTerm,
          status: 'available',
          limit: 50
        })
      }

      setProfiles(profiles)
    } catch (error) {
      console.error('Erro ao carregar perfis:', error)
      toast.error('Erro ao carregar perfis')
    } finally {
      setIsSearching(false)
    }
  }

  // Função para buscar perfis
  const searchProfiles = async () => {
    await loadProfiles()
  }

  // Função para limpar busca
  const clearSearch = () => {
    setSearchTerm('')
    setProximityEnabled(false)
    loadProfiles()
  }

  // Função para alternar proximidade
  const toggleProximity = async () => {
    if (!proximityEnabled && !userLocation) {
      try {
        await enableLocation()
      } catch (error) {
        return
      }
    }
    setProximityEnabled(!proximityEnabled)
  }

  // Função para buscar por tag
  const searchByTag = (tag: string) => {
    setSearchTerm(tag)
    searchProfiles()
  }

  // Função para atualizar status
  const updateStatus = async (newStatus: 'available' | 'busy') => {
    if (!currentUser) return

    try {
      const updatedUser = await DatabaseService.updateStatus(currentUser.id, newStatus)
      setCurrentUser(updatedUser)
      setProfileData(prev => ({ ...prev, status: newStatus }))
      localStorage.setItem('tex-current-user', JSON.stringify(updatedUser))
      toast.success(`Status alterado para ${newStatus === 'available' ? 'Disponível' : 'Ocupado'}`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  // Função para logout
  const logout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setCurrentScreen('home')
    setProfileData({
      nome: '',
      descricao: '',
      tags: [],
      foto_url: '',
      localizacao: '',
      status: 'available'
    })
    setPhoneNumber('')
    localStorage.removeItem('tex-current-user')
    setShowProfileMenu(false)
    toast.success('Logout realizado com sucesso')
  }

  // Função para deletar perfil
  const deleteProfile = async () => {
    if (!currentUser) return

    if (window.confirm('Tem certeza que deseja excluir seu perfil? Esta ação não pode ser desfeita.')) {
      try {
        await DatabaseService.deleteUsuario(currentUser.id)
        logout()
        toast.success('Perfil excluído com sucesso')
      } catch (error) {
        console.error('Erro ao excluir perfil:', error)
        toast.error('Erro ao excluir perfil')
      }
    }
  }

  // Função para editar perfil
  const startEditProfile = () => {
    setIsEditingProfile(true)
    setCurrentScreen('profile-setup')
    setShowProfileMenu(false)
  }

  // Função para cancelar edição
  const cancelEdit = () => {
    setIsEditingProfile(false)
    setCurrentScreen('my-profile')
    // Restaurar dados originais
    if (currentUser) {
      setProfileData({
        nome: currentUser.nome || '',
        descricao: currentUser.descricao || '',
        tags: currentUser.tags || [],
        foto_url: currentUser.foto_url || '',
        localizacao: currentUser.localizacao || '',
        status: currentUser.status || 'available'
      })
    }
  }

  // Renderizar header com logo e menu do perfil
  const renderHeader = () => {
    if (currentScreen === 'home') return null

    return (
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo TEX à esquerda */}
        <div 
          className="tex-logo-container tex-logo-scrolled"
          onClick={() => setCurrentScreen('feed')}
          style={{ cursor: 'pointer' }}
        >
          <div className="tex-logo-text">TEX</div>
        </div>

        {/* Menu do perfil à direita */}
        {isLoggedIn && currentUser && (
          <div style={{ position: 'relative' }}>
            <button
              className="profile-header-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {currentUser.foto_url ? (
                <img 
                  src={currentUser.foto_url} 
                  alt="Perfil"
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
                        <p>{currentUser.status === 'available' ? 'Disponível' : 'Ocupado'}</p>
                      </div>
                    </div>
                    
                    <div className="profile-menu-actions">
                      <button 
                        className="profile-menu-item"
                        onClick={() => {
                          setCurrentScreen('my-profile')
                          setShowProfileMenu(false)
                        }}
                      >
                        <i className="fas fa-user"></i>
                        Meu Perfil
                      </button>
                      
                      <button 
                        className="profile-menu-item"
                        onClick={() => {
                          setCurrentScreen('feed')
                          setShowProfileMenu(false)
                        }}
                      >
                        <i className="fas fa-search"></i>
                        Buscar Profissionais
                      </button>
                      
                      <div className="profile-menu-divider"></div>
                      
                      <button 
                        className="profile-menu-item"
                        onClick={() => updateStatus(currentUser.status === 'available' ? 'busy' : 'available')}
                      >
                        <i className={`fas fa-circle ${currentUser.status === 'available' ? 'text-green-500' : 'text-red-500'}`}></i>
                        {currentUser.status === 'available' ? 'Marcar como Ocupado' : 'Marcar como Disponível'}
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
          </div>
        )}
      </header>
    )
  }

  // Renderizar tela inicial
  const renderHomeScreen = () => (
    <div className="screen active">
      <div className="hero-container">
        <div className="tex-logo-container tex-logo-normal">
          <div className="tex-logo-text">TEX</div>
        </div>
        
        <h1>
          Do trampo ao encontro
          <span>TrampoExpress</span>
        </h1>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar profissionais, serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchTerm.trim() && setCurrentScreen('feed')}
          />
          
          <button 
            className="explore-btn"
            onClick={() => setCurrentScreen('feed')}
          >
            <i className="fas fa-search"></i>
            Explorar Profissionais
          </button>
        </div>

        <div className="location-status">
          {userLocation ? (
            <p style={{ color: 'var(--cyan)', fontSize: '0.9rem' }}>
              <i className="fas fa-map-marker-alt"></i> Localização ativada
            </p>
          ) : (
            <button className="location-enable-btn" onClick={enableLocation} disabled={isLoading}>
              <i className="fas fa-map-marker-alt"></i>
              {isLoading ? 'Obtendo localização...' : 'Ativar localização'}
            </button>
          )}
        </div>

        <button 
          className="whatsapp-login-btn"
          onClick={() => setCurrentScreen('verify')}
        >
          <i className="fab fa-whatsapp"></i>
          Entrar com WhatsApp
        </button>
      </div>
    </div>
  )

  // Renderizar tela de verificação
  const renderVerifyScreen = () => (
    <div className="screen active">
      <div className="back-button-container">
        <button className="back-button" onClick={() => setCurrentScreen('home')}>
          <i className="fas fa-arrow-left"></i>
          Voltar
        </button>
      </div>

      <div className="form-container">
        <h2>Entrar no TEX</h2>
        <p>Digite seu número do WhatsApp para entrar ou criar sua conta</p>
        
        <div className="info-box">
          <i className="fab fa-whatsapp"></i>
          <p>Se você já tem uma conta, será redirecionado para seu perfil. Se é novo por aqui, vamos criar seu perfil profissional!</p>
        </div>

        <div className="phone-input">
          <div className="country-code">+55</div>
          <input
            type="tel"
            placeholder="11999887766"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
            maxLength={11}
          />
        </div>

        <button 
          className="verify-btn"
          onClick={handleWhatsAppLogin}
          disabled={isVerifying || !phoneNumber.trim()}
        >
          {isVerifying ? 'Verificando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )

  // Renderizar tela de configuração do perfil
  const renderProfileSetupScreen = () => (
    <div className="screen active">
      <div className="back-button-container">
        <button 
          className="back-button" 
          onClick={() => {
            if (isEditingProfile) {
              cancelEdit()
            } else {
              setCurrentScreen('verify')
            }
          }}
        >
          <i className="fas fa-arrow-left"></i>
          Voltar
        </button>
      </div>

      <div className="form-container">
        <h2>{isEditingProfile ? 'Editar Perfil' : 'Criar Perfil'}</h2>
        <p>{isEditingProfile ? 'Atualize suas informações' : 'Complete seu perfil profissional'}</p>

        <div className="profile-setup">
          {/* Upload de foto */}
          <div className="photo-upload">
            <div className="photo-preview">
              {profileData.foto_url ? (
                <img src={profileData.foto_url} alt="Preview" />
              ) : (
                <i className="fas fa-camera"></i>
              )}
            </div>
            <label htmlFor={isEditingProfile ? "edit-photo-input" : "photo-input"}>
              <i className="fas fa-upload"></i>
              {profileData.foto_url ? 'Alterar Foto' : 'Adicionar Foto'}
            </label>
            <input
              id={isEditingProfile ? "edit-photo-input" : "photo-input"}
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
            <label>Descrição Profissional *</label>
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
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ex: eletricista, pintor, designer..."
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <button 
                  type="button"
                  onClick={addTag}
                  style={{
                    padding: '0.8rem 1rem',
                    background: 'var(--gradient)',
                    color: 'var(--black)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600'
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
                      onClick={() => removeTag(tag)}
                    ></i>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Localização */}
          <div className="form-group">
            <label>Localização</label>
            <input
              type="text"
              placeholder="Cidade, bairro..."
              value={profileData.localizacao}
              onChange={(e) => setProfileData(prev => ({ ...prev, localizacao: e.target.value }))}
            />
            {!userLocation && (
              <button 
                type="button"
                className="location-enable-btn"
                onClick={enableLocation}
                disabled={isLoading}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                <i className="fas fa-map-marker-alt"></i>
                {isLoading ? 'Obtendo localização...' : 'Usar minha localização atual'}
              </button>
            )}
          </div>

          {/* Status */}
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

          {/* Preview do WhatsApp */}
          {phoneNumber && (
            <div className="whatsapp-preview">
              <h4>Como aparecerá no WhatsApp:</h4>
              <div className="contact-preview">
                <i className="fab fa-whatsapp"></i>
                +55{phoneNumber}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          {isEditingProfile ? (
            <div className="edit-actions">
              <button 
                className="save-profile-btn"
                onClick={saveProfile}
                disabled={isLoading}
              >
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button 
                className="cancel-edit-btn"
                onClick={cancelEdit}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button 
              className="save-profile-btn"
              onClick={saveProfile}
              disabled={isLoading}
            >
              {isLoading ? 'Criando perfil...' : 'Criar Perfil'}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // Renderizar tela do meu perfil
  const renderMyProfileScreen = () => {
    if (!currentUser) {
      return (
        <div className="screen active">
          <div className="my-profile-content">
            <div className="no-profile">
              <h2>Nenhum perfil encontrado</h2>
              <p>Você precisa criar um perfil primeiro</p>
              <button 
                className="create-profile-btn"
                onClick={() => setCurrentScreen('verify')}
              >
                Criar Perfil
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="screen active">
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
                <p className="description">{currentUser.descricao}</p>
                <span className={`status status-${currentUser.status}`}>
                  {currentUser.status === 'available' ? 'Disponível' : 'Ocupado'}
                </span>
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
                <i className="fas fa-calendar"></i>
                <span>Membro desde {new Date(currentUser.criado_em).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="stat">
                <i className="fas fa-clock"></i>
                <span>Último acesso: {new Date(currentUser.ultimo_acesso).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="stat">
                <i className="fas fa-check-circle"></i>
                <span>Perfil {currentUser.perfil_completo ? 'completo' : 'incompleto'}</span>
              </div>
              {currentUser.localizacao && (
                <div className="stat">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{currentUser.localizacao}</span>
                </div>
              )}
            </div>

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
                onClick={deleteProfile}
              >
                <i className="fas fa-trash"></i>
                Excluir Perfil
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Renderizar tela de feed
  const renderFeedScreen = () => (
    <div className="screen active">
      <div className="feed">
        <div className="search-header">
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar profissionais, serviços..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchProfiles()}
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
                onClick={toggleProximity}
                disabled={isLoading}
              >
                <i className="fas fa-map-marker-alt"></i>
                {proximityEnabled ? 'Busca por proximidade ativa' : 'Buscar por proximidade'}
              </button>
              
              {!userLocation && !proximityEnabled && (
                <button
                  className="enable-location-btn"
                  onClick={enableLocation}
                  disabled={isLoading}
                >
                  <i className="fas fa-location-arrow"></i>
                  {isLoading ? 'Obtendo...' : 'Ativar localização'}
                </button>
              )}
            </div>

            {proximityEnabled && (
              <div className="radius-selector">
                <label>Raio:</label>
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

          <div className="search-results-info">
            {isSearching ? (
              <p>Buscando profissionais...</p>
            ) : (
              <p>{profiles.length} profissionais encontrados</p>
            )}
          </div>
        </div>

        {profiles.length === 0 && !isSearching ? (
          <div className="no-results">
            <i className="fas fa-search"></i>
            <h3>Nenhum profissional encontrado</h3>
            <p>Tente ajustar sua busca ou expandir o raio de proximidade</p>
            <div className="no-results-actions">
              <button className="explore-all-btn" onClick={() => {
                setSearchTerm('')
                setProximityEnabled(false)
                loadProfiles()
              }}>
                Ver todos os profissionais
              </button>
              <button className="back-home-btn" onClick={() => setCurrentScreen('home')}>
                <i className="fas fa-home"></i>
                Voltar ao início
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {profiles.map((profile) => (
              <div key={profile.id} className="profile-card">
                <div className="profile-header">
                  <div className="profile-pic">
                    {profile.foto_url ? (
                      <img src={profile.foto_url} alt={profile.nome} />
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
                      <h2>{profile.nome}</h2>
                      {profile.distancia && (
                        <div className="distance-badge">
                          <i className="fas fa-map-marker-alt"></i>
                          {profile.distancia.toFixed(1)} km
                        </div>
                      )}
                    </div>
                    <p className="description">{profile.descricao}</p>
                    <span className={`status status-${profile.status}`}>
                      {profile.status === 'available' ? 'Disponível' : 'Ocupado'}
                    </span>
                  </div>
                </div>

                {profile.tags && profile.tags.length > 0 && (
                  <div className="hashtags">
                    {profile.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="tag-clickable"
                        onClick={() => searchByTag(tag)}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <a
                  href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}?text=Olá! Vi seu perfil no TEX e gostaria de conversar sobre seus serviços.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-btn"
                >
                  <i className="fab fa-whatsapp"></i>
                  Entrar em contato
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // Renderizar tela sobre
  const renderAboutScreen = () => (
    <div className="screen active">
      <div className="back-button-container">
        <button className="back-button" onClick={() => setCurrentScreen('home')}>
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
              a pessoas que precisam de serviços de qualidade. Nossa missão é facilitar 
              essas conexões de forma rápida, segura e eficiente.
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
                <p>Veja profissionais próximos a você com cálculo de distância em tempo real</p>
              </div>
              
              <div className="feature-card">
                <i className="fab fa-whatsapp"></i>
                <h3>Contato Direto</h3>
                <p>Converse diretamente pelo WhatsApp sem intermediários</p>
              </div>
              
              <div className="feature-card">
                <i className="fas fa-shield-alt"></i>
                <h3>Segurança</h3>
                <p>Perfis verificados e sistema seguro de comunicação</p>
              </div>
            </div>

            <div className="warning-box">
              <i className="fas fa-exclamation-triangle"></i>
              <p>
                <strong>Importante:</strong> O TEX é uma plataforma de conexão. 
                Sempre verifique credenciais, peça orçamentos detalhados e 
                mantenha a comunicação transparente com os profissionais.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Renderizar tela de termos
  const renderTermsScreen = () => (
    <div className="screen active">
      <div className="back-button-container">
        <button className="back-button" onClick={() => setCurrentScreen('home')}>
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
            <h2><i className="fas fa-handshake"></i>Aceitação dos Termos</h2>
            <p>
              Ao utilizar o TEX, você concorda com estes termos de uso. 
              Se não concordar com qualquer parte, não utilize nossos serviços.
            </p>
          </div>

          <div className="terms-section">
            <h2><i className="fas fa-users"></i>Uso da Plataforma</h2>
            <p>O TEX é uma plataforma de conexão entre profissionais e clientes. Você se compromete a:</p>
            <ul>
              <li>Fornecer informações verdadeiras e atualizadas</li>
              <li>Manter um comportamento respeitoso</li>
              <li>Não usar a plataforma para fins ilegais</li>
              <li>Respeitar os direitos de outros usuários</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2><i className="fas fa-shield-alt"></i>Responsabilidades</h2>
            <p>O TEX atua apenas como intermediário. Não nos responsabilizamos por:</p>
            <ul>
              <li>Qualidade dos serviços prestados</li>
              <li>Disputas entre usuários</li>
              <li>Danos ou prejuízos decorrentes das contratações</li>
              <li>Veracidade das informações fornecidas pelos usuários</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2><i className="fas fa-user-shield"></i>Privacidade</h2>
            <p>
              Protegemos seus dados pessoais conforme nossa política de privacidade. 
              Coletamos apenas informações necessárias para o funcionamento da plataforma.
            </p>
          </div>

          <div className="terms-section coming-soon">
            <h2>
              <i className="fas fa-star"></i>
              Sistema de Avaliações
              <span className="badge">Em Breve</span>
            </h2>
            <p>
              Em breve implementaremos um sistema de <span className="highlight">avaliações e comentários</span> 
              para aumentar a confiança entre usuários e melhorar a qualidade dos serviços.
            </p>
          </div>

          <div className="terms-section coming-soon">
            <h2>
              <i className="fas fa-credit-card"></i>
              Pagamentos Integrados
              <span className="badge">Futuro</span>
            </h2>
            <p>
              Planejamos integrar um sistema de <span className="highlight">pagamentos seguros</span> 
              diretamente na plataforma para maior comodidade e segurança nas transações.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // Renderizar footer
  const renderFooter = () => (
    <footer>
      <nav className="footer-nav">
        <button onClick={() => setCurrentScreen('home')}>Home</button>
        <button onClick={() => setCurrentScreen('about')}>Sobre</button>
        <button onClick={() => setCurrentScreen('terms')}>Termos</button>
        <a href="https://instagram.com/tex.app" target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
      </nav>
      <div className="copyright">
        © 2025 TrampoExpress. Todos os direitos reservados.
      </div>
    </footer>
  )

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      paddingTop: currentScreen !== 'home' ? '80px' : '0'
    }}>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px'
          }
        }}
      />
      
      <PWAInstallPrompt />
      
      {renderHeader()}
      
      <main style={{ flex: 1 }}>
        {currentScreen === 'home' && renderHomeScreen()}
        {currentScreen === 'verify' && renderVerifyScreen()}
        {currentScreen === 'profile-setup' && renderProfileSetupScreen()}
        {currentScreen === 'my-profile' && renderMyProfileScreen()}
        {currentScreen === 'feed' && renderFeedScreen()}
        {currentScreen === 'about' && renderAboutScreen()}
        {currentScreen === 'terms' && renderTermsScreen()}
      </main>
      
      {renderFooter()}
    </div>
  )
}

export default App