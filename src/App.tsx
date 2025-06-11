import React, { useState, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { DatabaseService } from './lib/database'
import type { Usuario } from './lib/database'
import PWAInstallPrompt from './components/PWAInstallPrompt'

interface LocationState {
  latitude: number | null
  longitude: number | null
  enabled: boolean
  loading: boolean
}

const App: React.FC = () => {
  // Estados principais
  const [currentScreen, setCurrentScreen] = useState<string>('home')
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [users, setUsers] = useState<Usuario[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Estados de localização
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    enabled: false,
    loading: false
  })
  const [proximityEnabled, setProximityEnabled] = useState(false)
  const [proximityRadius, setProximityRadius] = useState(10)

  // Estados do formulário
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [profileData, setProfileData] = useState({
    nome: '',
    descricao: '',
    tags: [] as string[],
    foto_url: '',
    localizacao: '',
    status: 'available' as 'available' | 'busy'
  })
  const [newTag, setNewTag] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // Estados de navegação
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['home'])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Função para navegar entre telas
  const navigateTo = (screen: string, addToHistory: boolean = true) => {
    setCurrentScreen(screen)
    
    if (addToHistory) {
      const newHistory = navigationHistory.slice(0, historyIndex + 1)
      newHistory.push(screen)
      setNavigationHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }

  // Função para voltar na navegação
  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCurrentScreen(navigationHistory[newIndex])
    }
  }

  // Função para lidar com o botão voltar nativo
  const handlePopState = (event: PopStateEvent) => {
    event.preventDefault()
    goBack()
  }

  // Configurar navegação com botão nativo
  useEffect(() => {
    // Adicionar estado inicial ao histórico do navegador
    if (window.history.state === null) {
      window.history.replaceState({ screen: 'home' }, '', window.location.href)
    }

    // Adicionar listener para o botão voltar
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [historyIndex, navigationHistory])

  // Atualizar histórico do navegador quando navegar
  useEffect(() => {
    if (currentScreen !== 'home') {
      window.history.pushState({ screen: currentScreen }, '', window.location.href)
    }
  }, [currentScreen])

  // Função para obter localização
  const enableLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo navegador')
      return
    }

    setLocation(prev => ({ ...prev, loading: true }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          enabled: true,
          loading: false
        })
        toast.success('Localização ativada!')
      },
      (error) => {
        console.error('Erro ao obter localização:', error)
        toast.error('Erro ao obter localização')
        setLocation(prev => ({ ...prev, loading: false }))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }

  // Função para buscar usuários
  const searchUsers = async () => {
    setLoading(true)
    try {
      let results: Usuario[] = []

      if (proximityEnabled && location.latitude && location.longitude) {
        results = await DatabaseService.getUsersByProximity(
          location.latitude,
          location.longitude,
          proximityRadius
        )
      } else {
        results = await DatabaseService.getUsuarios({
          search: searchTerm,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          status: 'available',
          limit: 50
        })
      }

      setUsers(results)
    } catch (error) {
      console.error('Erro na busca:', error)
      toast.error('Erro ao buscar profissionais')
    } finally {
      setLoading(false)
    }
  }

  // Verificar usuário por WhatsApp
  const verifyWhatsApp = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Digite seu número do WhatsApp')
      return
    }

    setLoading(true)
    try {
      const user = await DatabaseService.getUsuarioByWhatsApp(whatsappNumber)
      
      if (user) {
        setCurrentUser(user)
        if (user.perfil_completo) {
          navigateTo('feed')
          toast.success(`Bem-vindo de volta, ${user.nome}!`)
        } else {
          navigateTo('profile-setup')
          toast.success('Complete seu perfil para continuar')
        }
      } else {
        navigateTo('profile-setup')
        toast.success('Vamos criar seu perfil!')
      }
    } catch (error) {
      console.error('Erro na verificação:', error)
      toast.error('Erro ao verificar WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  // Função para upload de foto (SEM LIMITE DE TAMANHO)
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Verificar apenas se é uma imagem
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem')
        return
      }

      setPhotoFile(file)
      
      // Criar URL para preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileData(prev => ({
          ...prev,
          foto_url: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
      
      toast.success('Foto selecionada!')
    }
  }

  // Adicionar tag
  const addTag = () => {
    if (newTag.trim() && !profileData.tags.includes(newTag.trim())) {
      setProfileData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  // Remover tag
  const removeTag = (tagToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Salvar perfil (CORRIGIDO)
  const saveProfile = async () => {
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
      const userData = {
        nome: profileData.nome,
        descricao: profileData.descricao,
        tags: profileData.tags,
        foto_url: profileData.foto_url || null,
        localizacao: profileData.localizacao || null,
        status: profileData.status, // Garantir que o status seja passado
        latitude: location.latitude,
        longitude: location.longitude
      }

      let savedUser: Usuario

      if (currentUser) {
        // Atualizar perfil existente
        savedUser = await DatabaseService.updateUsuario(currentUser.id, userData)
      } else {
        // Criar novo perfil
        const newUserData = {
          id: crypto.randomUUID(),
          whatsapp: whatsappNumber,
          ...userData
        }
        savedUser = await DatabaseService.createUsuario(newUserData)
      }

      setCurrentUser(savedUser)
      navigateTo('feed')
      toast.success('Perfil salvo com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Atualizar status do usuário (CORRIGIDO)
  const updateUserStatus = async (newStatus: 'available' | 'busy') => {
    if (!currentUser) return

    setLoading(true)
    try {
      const updatedUser = await DatabaseService.updateUsuario(currentUser.id, { 
        status: newStatus 
      })
      setCurrentUser(updatedUser)
      toast.success(`Status alterado para ${newStatus === 'available' ? 'Disponível' : 'Ocupado'}`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    } finally {
      setLoading(false)
    }
  }

  // Editar perfil
  const editProfile = () => {
    if (currentUser) {
      setProfileData({
        nome: currentUser.nome,
        descricao: currentUser.descricao || '',
        tags: currentUser.tags || [],
        foto_url: currentUser.foto_url || '',
        localizacao: currentUser.localizacao || '',
        status: currentUser.status
      })
      navigateTo('edit-profile')
    }
  }

  // Deletar perfil
  const deleteProfile = async () => {
    if (!currentUser) return

    if (confirm('Tem certeza que deseja excluir seu perfil? Esta ação não pode ser desfeita.')) {
      setLoading(true)
      try {
        await DatabaseService.deleteUsuario(currentUser.id)
        setCurrentUser(null)
        setProfileData({
          nome: '',
          descricao: '',
          tags: [],
          foto_url: '',
          localizacao: '',
          status: 'available'
        })
        navigateTo('home')
        toast.success('Perfil excluído com sucesso')
      } catch (error) {
        console.error('Erro ao deletar perfil:', error)
        toast.error('Erro ao excluir perfil')
      } finally {
        setLoading(false)
      }
    }
  }

  // Logout
  const logout = () => {
    setCurrentUser(null)
    setWhatsappNumber('')
    setProfileData({
      nome: '',
      descricao: '',
      tags: [],
      foto_url: '',
      localizacao: '',
      status: 'available'
    })
    navigateTo('home')
    toast.success('Logout realizado com sucesso')
  }

  // Buscar usuários ao carregar o feed
  useEffect(() => {
    if (currentScreen === 'feed') {
      searchUsers()
    }
  }, [currentScreen, searchTerm, selectedTags, proximityEnabled, proximityRadius])

  // Filtrar por tag
  const filterByTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  // Limpar busca
  const clearSearch = () => {
    setSearchTerm('')
    setSelectedTags([])
    setProximityEnabled(false)
  }

  // Gerar link do WhatsApp
  const generateWhatsAppLink = (user: Usuario) => {
    const message = encodeURIComponent(`Olá ${user.nome}! Vi seu perfil no TEX e gostaria de conversar sobre seus serviços.`)
    return `https://wa.me/${user.whatsapp.replace(/\D/g, '')}?text=${message}`
  }

  // Calcular distância
  const formatDistance = (distance?: number) => {
    if (!distance) return ''
    if (distance < 1) return `${Math.round(distance * 1000)}m`
    return `${distance.toFixed(1)}km`
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          {/* Logo à esquerda */}
          <div className="tex-logo-container tex-logo-normal">
            <div className="tex-logo-text">TEX</div>
          </div>

          {/* Botão de login/perfil à direita */}
          <div className="relative">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="profile-header-btn"
                >
                  {currentUser.foto_url ? (
                    <img 
                      src={currentUser.foto_url} 
                      alt="Perfil"
                      className="w-full h-full object-cover"
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
                            <p>{currentUser.status === 'available' ? 'Disponível' : 'Ocupado'}</p>
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
                              editProfile()
                            }}
                          >
                            <i className="fas fa-edit"></i>
                            Editar Perfil
                          </button>
                          
                          <div className="profile-menu-divider"></div>
                          
                          <button 
                            className="profile-menu-item"
                            onClick={() => {
                              setShowProfileMenu(false)
                              updateUserStatus(currentUser.status === 'available' ? 'busy' : 'available')
                            }}
                          >
                            <i className={`fas ${currentUser.status === 'available' ? 'fa-pause' : 'fa-play'}`}></i>
                            {currentUser.status === 'available' ? 'Marcar como Ocupado' : 'Marcar como Disponível'}
                          </button>
                          
                          <div className="profile-menu-divider"></div>
                          
                          <button 
                            className="profile-menu-item logout"
                            onClick={() => {
                              setShowProfileMenu(false)
                              logout()
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
              </div>
            ) : (
              <button
                onClick={() => navigateTo('verify')}
                className="whatsapp-login-btn"
                style={{ padding: '0.8rem 1.2rem', fontSize: '0.9rem' }}
              >
                <i className="fab fa-whatsapp"></i>
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-20">
        {/* Home Screen */}
        <div className={`screen ${currentScreen === 'home' ? 'active' : ''}`}>
          <div className="hero-container">
            <h1>
              Conecte-se com profissionais
              <span>Do trampo ao encontro</span>
            </h1>
            
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar profissionais, serviços ou localização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchTerm.trim() && navigateTo('feed')}
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
              {location.enabled ? (
                <p style={{ color: '#00FFFF', fontSize: '0.9rem' }}>
                  <i className="fas fa-map-marker-alt"></i>
                  Localização ativada - Busca por proximidade disponível
                </p>
              ) : (
                <button 
                  className="location-enable-btn"
                  onClick={enableLocation}
                  disabled={location.loading}
                >
                  <i className="fas fa-map-marker-alt"></i>
                  {location.loading ? 'Obtendo localização...' : 'Ativar Localização'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Verify Screen */}
        <div className={`screen ${currentScreen === 'verify' ? 'active' : ''}`}>
          {currentScreen === 'verify' && (
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
          )}
          
          <div className="form-container">
            <h2>Entrar no TEX</h2>
            <p>Digite seu número do WhatsApp para entrar ou criar sua conta</p>
            
            <div className="phone-input">
              <div className="country-code">+55</div>
              <input
                type="tel"
                placeholder="11999887766"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
              />
            </div>
            
            <div className="info-box">
              <i className="fab fa-whatsapp"></i>
              <p>Usamos o WhatsApp apenas para identificação. Não enviamos mensagens automáticas.</p>
            </div>
            
            <button 
              className="verify-btn"
              onClick={verifyWhatsApp}
              disabled={loading || whatsappNumber.length < 10}
            >
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </div>
        </div>

        {/* Profile Setup Screen */}
        <div className={`screen ${currentScreen === 'profile-setup' ? 'active' : ''}`}>
          {currentScreen === 'profile-setup' && (
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
          )}
          
          <div className="form-container">
            <h2>{currentUser ? 'Editar Perfil' : 'Criar Perfil'}</h2>
            <p>Complete suas informações profissionais</p>
            
            <div className="profile-setup">
              {/* Upload de Foto */}
              <div className="photo-upload">
                <div className="photo-preview">
                  {profileData.foto_url ? (
                    <img src={profileData.foto_url} alt="Preview" />
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

              {/* Tags */}
              <div className="form-group">
                <label>Especialidades *</label>
                <div className="tags-input">
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
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Digite uma especialidade"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <button 
                      type="button"
                      onClick={addTag}
                      style={{ 
                        background: 'var(--gradient)', 
                        color: 'black', 
                        border: 'none', 
                        padding: '0.5rem 1rem', 
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Adicionar
                    </button>
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
              </div>

              {/* Status */}
              <div className="form-group">
                <label>Status Inicial</label>
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
              <div className="whatsapp-preview">
                <h4>Como aparecerá no WhatsApp:</h4>
                <div className="contact-preview">
                  <i className="fab fa-whatsapp"></i>
                  {whatsappNumber ? `+55 ${whatsappNumber}` : '+55 11999887766'}
                </div>
              </div>

              <button 
                className="save-profile-btn"
                onClick={saveProfile}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Perfil'}
              </button>
            </div>
          </div>
        </div>

        {/* Edit Profile Screen */}
        <div className={`screen ${currentScreen === 'edit-profile' ? 'active' : ''}`}>
          {currentScreen === 'edit-profile' && (
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
          )}
          
          <div className="form-container">
            <h2>Editar Perfil</h2>
            <p>Atualize suas informações profissionais</p>
            
            <div className="profile-setup">
              {/* Upload de Foto */}
              <div className="photo-upload">
                <div className="photo-preview">
                  {profileData.foto_url ? (
                    <img src={profileData.foto_url} alt="Preview" />
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

              {/* Tags */}
              <div className="form-group">
                <label>Especialidades *</label>
                <div className="tags-input">
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
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Digite uma especialidade"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <button 
                      type="button"
                      onClick={addTag}
                      style={{ 
                        background: 'var(--gradient)', 
                        color: 'black', 
                        border: 'none', 
                        padding: '0.5rem 1rem', 
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Adicionar
                    </button>
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

              <div className="edit-actions">
                <button 
                  className="save-profile-btn"
                  onClick={saveProfile}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
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

        {/* My Profile Screen */}
        <div className={`screen ${currentScreen === 'my-profile' ? 'active' : ''}`}>
          {currentScreen === 'my-profile' && (
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
          )}
          
          <div className="my-profile-content">
            {currentUser ? (
              <>
                <div className="profile-card">
                  <div className="profile-header">
                    <div className="profile-pic">
                      {currentUser.foto_url ? (
                        <img src={currentUser.foto_url} alt={currentUser.nome} />
                      ) : (
                        <i className="fas fa-user" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.5)' }}></i>
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

                  {currentUser.localizacao && (
                    <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.8)' }}>
                      <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem', color: 'var(--cyan)' }}></i>
                      {currentUser.localizacao}
                    </p>
                  )}
                </div>

                <div className="profile-stats">
                  <div className="stat">
                    <i className="fas fa-calendar"></i>
                    Membro desde {new Date(currentUser.criado_em).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="stat">
                    <i className="fas fa-clock"></i>
                    Última atividade: {new Date(currentUser.ultimo_acesso).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="stat">
                    <i className="fas fa-check-circle"></i>
                    Perfil {currentUser.perfil_completo ? 'completo' : 'incompleto'}
                  </div>
                  {currentUser.verificado && (
                    <div className="stat">
                      <i className="fas fa-verified" style={{ color: 'var(--gold)' }}></i>
                      Perfil verificado
                    </div>
                  )}
                </div>

                <div className="profile-actions">
                  <button 
                    className="edit-profile-btn"
                    onClick={editProfile}
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
              </>
            ) : (
              <div className="no-profile">
                <h3>Nenhum perfil encontrado</h3>
                <p>Crie seu perfil para começar a usar o TEX</p>
                <button 
                  className="create-profile-btn"
                  onClick={() => navigateTo('verify')}
                >
                  Criar Perfil
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feed Screen */}
        <div className={`screen ${currentScreen === 'feed' ? 'active' : ''}`}>
          {currentScreen === 'feed' && (
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
          )}
          
          <div className="feed">
            {/* Search Header */}
            <div className="search-header">
              <div className="search-bar">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Buscar profissionais..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="clear-search" onClick={() => setSearchTerm('')}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              {/* Proximity Filters */}
              <div className="proximity-filters">
                <div className="filter-row">
                  <button
                    className={`proximity-toggle ${proximityEnabled ? 'active' : ''}`}
                    onClick={() => setProximityEnabled(!proximityEnabled)}
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
                      {location.loading ? 'Obtendo...' : 'Ativar GPS'}
                    </button>
                  )}
                </div>

                {proximityEnabled && location.enabled && (
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

              {(searchTerm || selectedTags.length > 0 || proximityEnabled) && (
                <div className="search-results-info">
                  <button onClick={clearSearch} style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    color: 'white', 
                    padding: '0.5rem 1rem', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}>
                    <i className="fas fa-times"></i> Limpar filtros
                  </button>
                </div>
              )}
            </div>

            {/* Results */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--cyan)' }}></i>
                <p style={{ marginTop: '1rem' }}>Carregando profissionais...</p>
              </div>
            ) : users.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {users.map((user) => (
                  <div key={user.id} className="profile-card">
                    <div className="profile-header">
                      <div className="profile-pic">
                        {user.foto_url ? (
                          <img src={user.foto_url} alt={user.nome} />
                        ) : (
                          <i className="fas fa-user" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.5)' }}></i>
                        )}
                      </div>
                      <div className="profile-info">
                        <div className="profile-name-distance">
                          <h2>{user.nome}</h2>
                          {user.distancia && (
                            <div className="distance-badge">
                              <i className="fas fa-map-marker-alt"></i>
                              {formatDistance(user.distancia)}
                            </div>
                          )}
                        </div>
                        <p className="description">{user.descricao}</p>
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
                            onClick={() => filterByTag(tag)}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {user.localizacao && (
                      <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.8)' }}>
                        <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem', color: 'var(--cyan)' }}></i>
                        {user.localizacao}
                      </p>
                    )}

                    <a 
                      href={generateWhatsAppLink(user)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whatsapp-btn"
                    >
                      <i className="fab fa-whatsapp"></i>
                      Entrar em Contato
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <i className="fas fa-search"></i>
                <h3>Nenhum profissional encontrado</h3>
                <p>Tente ajustar seus filtros de busca ou explorar outras especialidades.</p>
                <div className="no-results-actions">
                  <button 
                    className="explore-all-btn"
                    onClick={clearSearch}
                  >
                    Ver Todos os Profissionais
                  </button>
                  <button 
                    className="back-home-btn"
                    onClick={() => navigateTo('home')}
                  >
                    <i className="fas fa-home"></i>
                    Voltar ao Início
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* About Screen */}
        <div className={`screen ${currentScreen === 'about' ? 'active' : ''}`}>
          {currentScreen === 'about' && (
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
          )}
          
          <div className="content-container">
            <h1 className="page-title">
              <i className="fas fa-info-circle"></i>
              Sobre o TEX
            </h1>
            
            <div className="about-content">
              <div className="content-section">
                <p className="intro-text">
                  O TEX é a plataforma que conecta profissionais qualificados a pessoas que precisam de serviços de qualidade. 
                  <strong> Do trampo ao encontro</strong> - facilitamos conexões que geram oportunidades.
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
                    <h3>Seguro e Confiável</h3>
                    <p>Perfis verificados e sistema de avaliações para garantir qualidade.</p>
                  </div>
                  
                  <div className="feature-card">
                    <i className="fas fa-mobile-alt"></i>
                    <h3>Fácil de Usar</h3>
                    <p>Interface intuitiva, funciona em qualquer dispositivo, online ou offline.</p>
                  </div>
                </div>

                <div className="warning-box">
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>
                    <strong>Importante:</strong> O TEX é uma plataforma de conexão. Não nos responsabilizamos pela qualidade dos serviços prestados. 
                    Sempre verifique referências e negocie diretamente com o profissional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms Screen */}
        <div className={`screen ${currentScreen === 'terms' ? 'active' : ''}`}>
          {currentScreen === 'terms' && (
            <div className="back-button-container">
              <button className="back-button" onClick={goBack}>
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
          )}
          
          <div className="content-container">
            <h1 className="page-title">
              <i className="fas fa-file-contract"></i>
              Termos de Uso
            </h1>
            
            <div className="terms-content">
              <div className="terms-section">
                <h2><i className="fas fa-handshake"></i> Aceitação dos Termos</h2>
                <p>Ao usar o TEX, você concorda com estes termos. Se não concordar, não use nossos serviços.</p>
              </div>

              <div className="terms-section">
                <h2><i className="fas fa-user-check"></i> Uso da Plataforma</h2>
                <p>O TEX conecta prestadores de serviços e clientes. Você se compromete a:</p>
                <ul>
                  <li>Fornecer informações verdadeiras e atualizadas</li>
                  <li>Usar a plataforma de forma legal e ética</li>
                  <li>Respeitar outros usuários</li>
                  <li>Não criar perfis falsos ou enganosos</li>
                </ul>
              </div>

              <div className="terms-section">
                <h2><i className="fas fa-exclamation-circle"></i> Responsabilidades</h2>
                <p>O TEX <span className="highlight">não se responsabiliza</span> por:</p>
                <ul>
                  <li>Qualidade dos serviços prestados</li>
                  <li>Disputas entre usuários</li>
                  <li>Danos ou prejuízos decorrentes do uso</li>
                  <li>Conteúdo publicado pelos usuários</li>
                </ul>
              </div>

              <div className="terms-section">
                <h2><i className="fas fa-lock"></i> Privacidade</h2>
                <p>Protegemos seus dados conforme nossa política de privacidade. Coletamos apenas informações necessárias para o funcionamento da plataforma.</p>
              </div>

              <div className="terms-section coming-soon">
                <h2><i className="fas fa-star"></i> Recursos Futuros <span className="badge">Em Breve</span></h2>
                <p>Estamos trabalhando em novos recursos:</p>
                <ul>
                  <li>Sistema de avaliações e comentários</li>
                  <li>Chat interno na plataforma</li>
                  <li>Pagamentos integrados</li>
                  <li>Notificações push</li>
                </ul>
              </div>

              <div className="terms-section">
                <h2><i className="fas fa-edit"></i> Modificações</h2>
                <p>Podemos atualizar estes termos. Mudanças importantes serão comunicadas aos usuários.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer>
        <nav className="footer-nav">
          <button onClick={() => navigateTo('about')}>Sobre</button>
          <button onClick={() => navigateTo('terms')}>Termos</button>
          <a href="https://wa.me/5511999887766" target="_blank" rel="noopener noreferrer">Suporte</a>
          <a href="https://instagram.com/tex.app" target="_blank" rel="noopener noreferrer">Instagram</a>
        </nav>
        <div className="copyright">
          © 2025 TEX - Do trampo ao encontro
        </div>
      </footer>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  )
}

export default App