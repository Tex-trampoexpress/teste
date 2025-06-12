import React, { useState, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { DatabaseService } from './lib/database'
import type { Usuario } from './lib/database'
import PWAInstallPrompt from './components/PWAInstallPrompt'

// Types
interface LocationState {
  enabled: boolean
  latitude: number | null
  longitude: number | null
  loading: boolean
}

interface NavigationState {
  currentScreen: string
  history: string[]
}

const App: React.FC = () => {
  // Navigation state
  const [navigation, setNavigation] = useState<NavigationState>({
    currentScreen: 'home',
    history: ['home']
  })

  // User state
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Location state
  const [location, setLocation] = useState<LocationState>({
    enabled: false,
    latitude: null,
    longitude: null,
    loading: false
  })

  // Search and feed state
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [proximityEnabled, setProximityEnabled] = useState(false)
  const [proximityRadius, setProximityRadius] = useState(10)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    nome: '',
    descricao: '',
    tags: [] as string[],
    foto_url: '',
    localizacao: '',
    status: 'available' as 'available' | 'busy'
  })
  const [newTag, setNewTag] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // WhatsApp verification state
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Profile menu state
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Navigation functions
  const navigateTo = (screen: string) => {
    setNavigation(prev => ({
      currentScreen: screen,
      history: [...prev.history, screen]
    }))
    
    // Update browser history
    window.history.pushState({ screen }, '', `#${screen}`)
  }

  const goBack = () => {
    setNavigation(prev => {
      if (prev.history.length <= 1) return prev
      
      const newHistory = [...prev.history]
      newHistory.pop() // Remove current screen
      const previousScreen = newHistory[newHistory.length - 1] || 'home'
      
      return {
        currentScreen: previousScreen,
        history: newHistory
      }
    })
    
    // Update browser history
    window.history.back()
  }

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const screen = event.state?.screen || 'home'
      setNavigation(prev => {
        const newHistory = [...prev.history]
        if (newHistory.length > 1) {
          newHistory.pop()
        }
        return {
          currentScreen: screen,
          history: newHistory
        }
      })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Location functions
  const enableLocation = async () => {
    setLocation(prev => ({ ...prev, loading: true }))
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        })
      })

      const { latitude, longitude } = position.coords
      setLocation({
        enabled: true,
        latitude,
        longitude,
        loading: false
      })
      
      toast.success('Localização ativada!')
    } catch (error) {
      console.error('Erro ao obter localização:', error)
      setLocation(prev => ({ ...prev, loading: false }))
      toast.error('Erro ao obter localização. Verifique as permissões.')
    }
  }

  // Search functions - CORRIGIDO para mostrar apenas usuários disponíveis
  const searchUsers = async (term: string = searchTerm) => {
    setLoading(true)
    try {
      let results: Usuario[] = []
      
      if (proximityEnabled && location.enabled && location.latitude && location.longitude) {
        results = await DatabaseService.getUsersByProximity(
          location.latitude,
          location.longitude,
          proximityRadius
        )
        
        if (term.trim()) {
          results = results.filter(user => 
            user.nome.toLowerCase().includes(term.toLowerCase()) ||
            user.descricao?.toLowerCase().includes(term.toLowerCase()) ||
            user.localizacao?.toLowerCase().includes(term.toLowerCase()) ||
            user.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
          )
        }
      } else {
        // IMPORTANTE: Buscar apenas usuários disponíveis
        results = await DatabaseService.getUsuarios({
          search: term,
          status: 'available', // Filtro para mostrar apenas disponíveis
          limit: 20
        })
      }
      
      console.log(`🔍 Busca realizada: ${results.length} usuários encontrados`)
      console.log('📊 Status dos usuários:', results.map(u => `${u.nome}: ${u.status}`))
      console.log('📷 Fotos dos usuários:', results.map(u => `${u.nome}: ${u.foto_url ? 'TEM FOTO' : 'SEM FOTO'}`))
      
      setUsers(results)
    } catch (error) {
      console.error('Erro na busca:', error)
      toast.error('Erro ao buscar usuários')
    } finally {
      setLoading(false)
    }
  }

  const searchByTag = async (tag: string) => {
    setSearchTerm(tag)
    setLoading(true)
    try {
      const results = await DatabaseService.searchByTags([tag])
      console.log(`🏷️ Busca por tag "${tag}": ${results.length} usuários encontrados`)
      setUsers(results)
    } catch (error) {
      console.error('Erro na busca por tag:', error)
      toast.error('Erro ao buscar por especialidade')
    } finally {
      setLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchTerm('')
    setUsers([])
  }

  // WhatsApp verification - FLUXO CORRIGIDO
  const verifyWhatsApp = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Digite seu número do WhatsApp')
      return
    }

    setVerifying(true)
    try {
      console.log('🔍 Verificando WhatsApp:', whatsappNumber)
      
      // Verificar se usuário já existe
      const existingUser = await DatabaseService.getUsuarioByWhatsApp(whatsappNumber)
      
      if (existingUser) {
        // USUÁRIO EXISTENTE - Login
        console.log('✅ Usuário existente encontrado:', existingUser.nome)
        console.log('📷 Foto do usuário no login:', existingUser.foto_url)
        setCurrentUser(existingUser)
        setIsLoggedIn(true)
        
        // Ir direto para o perfil com mensagem de boas-vindas
        navigateTo('my-profile')
        toast.success(`Bem-vindo de volta, ${existingUser.nome}!`)
      } else {
        // USUÁRIO NOVO - Criar perfil
        console.log('ℹ️ Usuário novo, redirecionando para criação de perfil')
        setIsEditing(false) // Garantir que não está em modo de edição
        
        // Limpar formulário para novo usuário
        setProfileForm({
          nome: '',
          descricao: '',
          tags: [],
          foto_url: '',
          localizacao: '',
          status: 'available'
        })
        
        navigateTo('profile-setup')
        toast.success('Vamos criar seu perfil!')
      }
    } catch (error) {
      console.error('❌ Erro na verificação:', error)
      toast.error('Erro ao verificar WhatsApp. Tente novamente.')
    } finally {
      setVerifying(false)
    }
  }

  // FUNÇÃO CORRIGIDA: Converter imagem para Base64 para persistência
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        console.log('📷 Imagem convertida para Base64, tamanho:', result.length, 'caracteres')
        resolve(result)
      }
      reader.onerror = () => {
        console.error('❌ Erro ao converter imagem para Base64')
        reject(new Error('Erro ao processar imagem'))
      }
      reader.readAsDataURL(file)
    })
  }

  // Profile functions - CORRIGIDO para persistir fotos corretamente
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem')
      return
    }

    console.log('📷 Processando upload de foto:', file.name, file.size, 'bytes')

    try {
      // Converter para Base64 para persistência
      const base64Image = await convertImageToBase64(file)
      console.log('📷 Foto convertida para Base64 com sucesso')
      
      setProfileForm(prev => ({ ...prev, foto_url: base64Image }))
      toast.success('Foto carregada!')
    } catch (error) {
      console.error('❌ Erro ao processar foto:', error)
      toast.error('Erro ao processar foto. Tente novamente.')
    }
  }

  const addTag = () => {
    if (!newTag.trim()) return
    
    const tag = newTag.trim().toLowerCase()
    if (profileForm.tags.includes(tag)) {
      toast.error('Esta especialidade já foi adicionada')
      return
    }
    
    setProfileForm(prev => ({
      ...prev,
      tags: [...prev.tags, tag]
    }))
    setNewTag('')
  }

  const removeTag = (tagToRemove: string) => {
    setProfileForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // FUNÇÃO DE SALVAR PERFIL CORRIGIDA PARA PERSISTIR FOTOS
  const saveProfile = async () => {
    try {
      // Validações
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

      console.log('💾 Salvando perfil com foto:', profileForm.foto_url ? 'SIM (Base64)' : 'NÃO')

      const userData = {
        nome: profileForm.nome.trim(),
        descricao: profileForm.descricao.trim(),
        tags: profileForm.tags,
        foto_url: profileForm.foto_url || null, // Base64 ou null
        localizacao: profileForm.localizacao?.trim() || null,
        status: profileForm.status,
        latitude: location.enabled ? location.latitude : null,
        longitude: location.enabled ? location.longitude : null
      }

      console.log('💾 Dados do usuário para salvar:', {
        ...userData,
        foto_url: userData.foto_url ? `Base64 (${userData.foto_url.length} chars)` : 'NULL'
      })

      let savedUser: Usuario

      if (isEditing && currentUser) {
        // EDITAR PERFIL EXISTENTE
        console.log('✏️ Atualizando perfil existente:', currentUser.id)
        savedUser = await DatabaseService.updateUsuario(currentUser.id, userData)
        toast.success('Perfil atualizado com sucesso!')
      } else {
        // CRIAR NOVO PERFIL
        console.log('📝 Criando novo perfil para WhatsApp:', whatsappNumber)
        const userId = crypto.randomUUID()
        savedUser = await DatabaseService.createUsuario({
          id: userId,
          whatsapp: whatsappNumber,
          ...userData
        })
        toast.success('Perfil criado com sucesso!')
      }

      console.log('✅ Perfil salvo com foto:', savedUser.foto_url ? 'SIM (Base64)' : 'NÃO')

      // Atualizar estado do usuário
      setCurrentUser(savedUser)
      setIsLoggedIn(true)
      setIsEditing(false)
      
      // Ir para o perfil
      navigateTo('my-profile')
    } catch (error) {
      console.error('❌ Erro ao salvar perfil:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar perfil')
    }
  }

  // FUNÇÃO DE EDITAR PERFIL CORRIGIDA
  const editProfile = () => {
    if (!currentUser) return
    
    console.log('✏️ Iniciando edição do perfil:', currentUser.nome)
    console.log('📷 Foto atual do perfil:', currentUser.foto_url ? 'PRESENTE (Base64)' : 'AUSENTE')
    
    // Preencher formulário com dados atuais
    setProfileForm({
      nome: currentUser.nome,
      descricao: currentUser.descricao || '',
      tags: currentUser.tags || [],
      foto_url: currentUser.foto_url || '', // IMPORTANTE: Manter a foto atual (Base64)
      localizacao: currentUser.localizacao || '',
      status: currentUser.status
    })
    
    // Definir como modo de edição
    setIsEditing(true)
    
    // Ir para tela de setup
    navigateTo('profile-setup')
  }

  // FUNÇÃO DE ATUALIZAR STATUS CORRIGIDA E OTIMIZADA
  const updateUserStatus = async (newStatus: 'available' | 'busy') => {
    if (!currentUser) return

    try {
      console.log('🔄 Atualizando status de', currentUser.status, 'para', newStatus)
      
      // Atualizar no banco de dados
      const updatedUser = await DatabaseService.updateStatus(currentUser.id, newStatus)
      
      // Atualizar estado local
      setCurrentUser(updatedUser)
      
      // Atualizar lista de usuários se estiver no feed
      if (navigation.currentScreen === 'feed') {
        console.log('🔄 Atualizando lista do feed após mudança de status')
        await searchUsers() // Recarregar a lista para refletir mudanças
      }
      
      const statusText = newStatus === 'available' ? 'Disponível' : 'Ocupado'
      toast.success(`Status alterado para ${statusText}`)
      
      console.log('✅ Status atualizado com sucesso:', updatedUser.status)
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const deleteProfile = async () => {
    if (!currentUser) return
    
    if (!confirm('Tem certeza que deseja excluir seu perfil? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      await DatabaseService.deleteUsuario(currentUser.id)
      setCurrentUser(null)
      setIsLoggedIn(false)
      setWhatsappNumber('')
      setProfileForm({
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
      console.error('Erro ao excluir perfil:', error)
      toast.error('Erro ao excluir perfil')
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setWhatsappNumber('')
    setProfileForm({
      nome: '',
      descricao: '',
      tags: [],
      foto_url: '',
      localizacao: '',
      status: 'available'
    })
    setIsEditing(false)
    navigateTo('home')
    toast.success('Logout realizado com sucesso')
  }

  // Load initial data - CORRIGIDO para recarregar quando necessário
  useEffect(() => {
    if (navigation.currentScreen === 'feed') {
      console.log('📱 Carregando feed de usuários')
      searchUsers('')
    }
  }, [navigation.currentScreen, proximityEnabled, proximityRadius])

  // Render functions
  const renderHeader = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between p-4">
        {/* Logo TEX à esquerda */}
        <div className="tex-logo-container tex-logo-normal">
          <div className="tex-logo-text">TEX</div>
        </div>

        {/* Botão de perfil à direita - CORRIGIDO */}
        {isLoggedIn && currentUser ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="profile-header-btn"
            >
              {currentUser.foto_url ? (
                <img 
                  src={currentUser.foto_url} 
                  alt="Perfil"
                  onError={(e) => {
                    console.log('❌ Erro ao carregar foto do header:', currentUser.foto_url ? 'Base64 presente' : 'Sem foto')
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <i className={`fas fa-user ${currentUser.foto_url ? 'hidden' : ''}`}></i>
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
                          <img 
                            src={currentUser.foto_url} 
                            alt="Perfil"
                            onError={(e) => {
                              console.log('❌ Erro ao carregar foto do menu:', currentUser.foto_url ? 'Base64 presente' : 'Sem foto')
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <i className={`fas fa-user ${currentUser.foto_url ? 'hidden' : ''}`}></i>
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
                          navigateTo('feed')
                        }}
                      >
                        <i className="fas fa-search"></i>
                        Explorar
                      </button>
                      
                      <div className="profile-menu-divider"></div>
                      
                      <button 
                        className="profile-menu-item"
                        onClick={() => {
                          setShowProfileMenu(false)
                          updateUserStatus(currentUser.status === 'available' ? 'busy' : 'available')
                        }}
                      >
                        <i className={`fas fa-circle ${currentUser.status === 'available' ? 'text-green-500' : 'text-red-500'}`}></i>
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
          // Espaço vazio quando não logado
          <div className="w-12"></div>
        )}
      </div>
    </header>
  )

  const renderBackButton = () => {
    if (navigation.currentScreen === 'home') return null
    
    return (
      <div className="back-button-container">
        <button onClick={goBack} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Voltar
        </button>
      </div>
    )
  }

  const renderHomeScreen = () => (
    <div className="screen active">
      <div className="hero-container">
        {/* LOGO TEX MOVIDO PARA DENTRO DO CONTAINER */}
        <div className="tex-logo-container-inside">
          <div className="tex-logo-text-inside">TEX</div>
        </div>
        
        <h1>
          Do trampo ao
          <br />
          encontro
          <span>TrampoExpress</span>
        </h1>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar profissionais, serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchTerm.trim() && (searchUsers(), navigateTo('feed'))}
          />
          
          <button 
            className="explore-btn"
            onClick={() => {
              if (searchTerm.trim()) {
                searchUsers()
              }
              navigateTo('feed')
            }}
          >
            <i className="fas fa-search"></i>
            EXPLORAR PROFISSIONAIS
          </button>
        </div>

        <div className="location-status">
          {location.enabled ? (
            <p className="text-cyan-400">
              <i className="fas fa-map-marker-alt"></i>
              Localização ativada
            </p>
          ) : (
            <button 
              onClick={enableLocation}
              disabled={location.loading}
              className="location-enable-btn"
            >
              <i className={`fas ${location.loading ? 'fa-spinner fa-spin' : 'fa-map-marker-alt'}`}></i>
              Ativar localização
            </button>
          )}
        </div>

        <button 
          onClick={() => navigateTo('verify')}
          className="whatsapp-login-btn"
        >
          <i className="fab fa-whatsapp"></i>
          Entrar com WhatsApp
        </button>
      </div>
    </div>
  )

  const renderVerifyScreen = () => (
    <div className="screen active">
      {renderBackButton()}
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
            maxLength={11}
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
          onClick={verifyWhatsApp}
          disabled={verifying || whatsappNumber.length < 10}
          className="verify-btn"
        >
          {verifying ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Verificando...
            </>
          ) : (
            <>
              <i className="fas fa-check"></i>
              Continuar
            </>
          )}
        </button>
      </div>
    </div>
  )

  const renderProfileSetupScreen = () => (
    <div className="screen active">
      {renderBackButton()}
      <div className="form-container">
        <h2>{isEditing ? 'Editar Perfil' : 'Criar Perfil'}</h2>
        <p>{isEditing ? 'Atualize suas informações' : 'Complete seu perfil para começar'}</p>
        
        <div className="profile-setup">
          {/* Upload de foto - CORRIGIDO PARA BASE64 */}
          <div className="photo-upload">
            <div className="photo-preview">
              {profileForm.foto_url ? (
                <img 
                  src={profileForm.foto_url} 
                  alt="Preview"
                  onError={(e) => {
                    console.log('❌ Erro ao carregar preview da foto:', profileForm.foto_url ? 'Base64 presente' : 'Sem foto')
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <i className={`fas fa-camera ${profileForm.foto_url ? 'hidden' : ''}`}></i>
            </div>
            <input
              type="file"
              id={isEditing ? 'edit-photo-input' : 'photo-input'}
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <label htmlFor={isEditing ? 'edit-photo-input' : 'photo-input'}>
              <i className="fas fa-upload"></i>
              {profileForm.foto_url ? 'Alterar Foto' : 'Adicionar Foto'}
            </label>
          </div>

          {/* Nome */}
          <div className="form-group">
            <label>Nome Completo *</label>
            <input
              type="text"
              value={profileForm.nome}
              onChange={(e) => setProfileForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Seu nome completo"
            />
          </div>

          {/* Descrição */}
          <div className="form-group">
            <label>Descrição dos Serviços *</label>
            <textarea
              value={profileForm.descricao}
              onChange={(e) => setProfileForm(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva seus serviços, experiência e diferenciais..."
              rows={4}
            />
          </div>

          {/* Tags */}
          <div className="form-group">
            <label>Especialidades *</label>
            <div className="tags-input">
              <div className="tags-container">
                {profileForm.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <i 
                      className="fas fa-times"
                      onClick={() => removeTag(tag)}
                    ></i>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ex: eletricista, design, programação..."
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
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Localização */}
          <div className="form-group">
            <label>Localização</label>
            <input
              type="text"
              value={profileForm.localizacao}
              onChange={(e) => setProfileForm(prev => ({ ...prev, localizacao: e.target.value }))}
              placeholder="Cidade, bairro ou região"
            />
            
            {/* Opção de usar GPS para localização */}
            <div className="location-gps-option">
              {location.enabled ? (
                <p className="location-gps-status">
                  <i className="fas fa-map-marker-alt text-cyan-400"></i>
                  Localização GPS ativada
                </p>
              ) : (
                <button 
                  type="button"
                  onClick={enableLocation}
                  disabled={location.loading}
                  className="location-gps-btn"
                >
                  <i className={`fas ${location.loading ? 'fa-spinner fa-spin' : 'fa-location-arrow'}`}></i>
                  {location.loading ? 'Obtendo localização...' : 'Usar minha localização atual'}
                </button>
              )}
            </div>
          </div>

          {/* REMOVIDO: Status inicial na criação de perfil */}
          {/* O status será sempre 'available' por padrão e pode ser alterado depois no perfil */}

          {/* Preview do WhatsApp */}
          <div className="whatsapp-preview">
            <h4>Como aparecerá no WhatsApp:</h4>
            <div className="contact-preview">
              <i className="fab fa-whatsapp"></i>
              <span>+55 {whatsappNumber}</span>
            </div>
          </div>

          {/* Botão salvar */}
          <button 
            onClick={saveProfile}
            className="save-profile-btn"
          >
            <i className="fas fa-save"></i>
            {isEditing ? 'Salvar Alterações' : 'Criar Perfil'}
          </button>

          {isEditing && (
            <div className="edit-actions">
              <button 
                onClick={() => {
                  setIsEditing(false)
                  navigateTo('my-profile')
                }}
                className="cancel-edit-btn"
              >
                <i className="fas fa-times"></i>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderFeedScreen = () => (
    <div className="screen active">
      {renderBackButton()}
      <div className="feed">
        {/* Header de busca */}
        <div className="search-header">
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar profissionais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
            />
            {searchTerm && (
              <button onClick={clearSearch} className="clear-search">
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          {/* Filtros de proximidade */}
          <div className="proximity-filters">
            <div className="filter-row">
              <button
                onClick={() => setProximityEnabled(!proximityEnabled)}
                disabled={!location.enabled}
                className={`proximity-toggle ${proximityEnabled ? 'active' : ''}`}
              >
                <i className="fas fa-map-marker-alt"></i>
                Busca por proximidade
              </button>
              
              {!location.enabled && (
                <button 
                  onClick={enableLocation}
                  disabled={location.loading}
                  className="enable-location-btn"
                >
                  <i className={`fas ${location.loading ? 'fa-spinner fa-spin' : 'fa-location-arrow'}`}></i>
                  Ativar GPS
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

          <div className="search-results-info">
            {loading ? (
              <p><i className="fas fa-spinner fa-spin"></i> Buscando...</p>
            ) : (
              <p>{users.length} profissionais encontrados</p>
            )}
          </div>
        </div>

        {/* Lista de usuários - CORRIGIDO para mostrar fotos Base64 */}
        <div className="users-list">
          {users.length === 0 && !loading ? (
            <div className="no-results">
              <i className="fas fa-search"></i>
              <h3>Nenhum profissional encontrado</h3>
              <p>Tente ajustar sua busca ou explorar outras especialidades</p>
              <div className="no-results-actions">
                <button 
                  onClick={() => searchUsers('')}
                  className="explore-all-btn"
                >
                  <i className="fas fa-globe"></i>
                  Ver Todos os Profissionais
                </button>
                <button 
                  onClick={() => navigateTo('home')}
                  className="back-home-btn"
                >
                  <i className="fas fa-home"></i>
                  Voltar ao Início
                </button>
              </div>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="profile-card">
                <div className="profile-header">
                  <div className="profile-pic">
                    {user.foto_url ? (
                      <img 
                        src={user.foto_url} 
                        alt={user.nome}
                        onError={(e) => {
                          console.log('❌ Erro ao carregar foto do feed:', user.nome, user.foto_url ? 'Base64 presente' : 'Sem foto')
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <i className={`fas fa-user ${user.foto_url ? 'hidden' : ''}`}></i>
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
                    {/* STATUS SEMPRE VISÍVEL NO FEED */}
                    <span className={`status status-${user.status}`}>
                      {user.status === 'available' ? 'Disponível' : 'Ocupado'}
                    </span>
                    {user.localizacao && (
                      <p className="location">
                        <i className="fas fa-map-marker-alt"></i>
                        {user.localizacao}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="hashtags">
                  {user.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="tag-clickable"
                      onClick={() => searchByTag(tag)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <a
                  href={`https://wa.me/55${user.whatsapp.replace(/\D/g, '')}?text=Olá! Vi seu perfil no TEX e gostaria de conversar sobre seus serviços.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-btn"
                >
                  <i className="fab fa-whatsapp"></i>
                  Entrar em Contato
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const renderMyProfileScreen = () => {
    if (!currentUser) {
      return (
        <div className="screen active">
          {renderBackButton()}
          <div className="no-profile">
            <h2>Perfil não encontrado</h2>
            <p>Você precisa estar logado para ver seu perfil</p>
            <button 
              onClick={() => navigateTo('verify')}
              className="create-profile-btn"
            >
              Fazer Login
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="screen active">
        {renderBackButton()}
        <div className="my-profile-content">
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-pic">
                {currentUser.foto_url ? (
                  <img 
                    src={currentUser.foto_url} 
                    alt={currentUser.nome}
                    onError={(e) => {
                      console.log('❌ Erro ao carregar foto do perfil:', currentUser.foto_url ? 'Base64 presente' : 'Sem foto')
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <i className={`fas fa-user ${currentUser.foto_url ? 'hidden' : ''}`}></i>
              </div>
              <div className="profile-info">
                <h2>{currentUser.nome}</h2>
                <p className="description">{currentUser.descricao}</p>
                
                {/* INTERRUPTOR DE STATUS DISPONÍVEL/OCUPADO - CORRIGIDO */}
                <div className="status-toggle-profile">
                  <button
                    onClick={() => updateUserStatus('available')}
                    className={`status-btn-profile ${currentUser.status === 'available' ? 'active' : ''}`}
                  >
                    <span className="dot available"></span>
                    Disponível
                  </button>
                  <button
                    onClick={() => updateUserStatus('busy')}
                    className={`status-btn-profile ${currentUser.status === 'busy' ? 'active' : ''}`}
                  >
                    <span className="dot busy"></span>
                    Ocupado
                  </button>
                </div>
                
                {currentUser.localizacao && (
                  <p className="location">
                    <i className="fas fa-map-marker-alt"></i>
                    {currentUser.localizacao}
                  </p>
                )}
              </div>
            </div>
            
            <div className="hashtags">
              {currentUser.tags.map((tag, index) => (
                <span key={index}>#{tag}</span>
              ))}
            </div>

            <div className="profile-stats">
              <div className="stat">
                <i className="fas fa-calendar"></i>
                <span>Membro desde {new Date(currentUser.criado_em).toLocaleDateString()}</span>
              </div>
              <div className="stat">
                <i className="fas fa-clock"></i>
                <span>Último acesso {new Date(currentUser.ultimo_acesso).toLocaleDateString()}</span>
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
              onClick={editProfile}
              className="edit-profile-btn"
            >
              <i className="fas fa-edit"></i>
              Editar Perfil
            </button>
            
            <button 
              onClick={deleteProfile}
              className="delete-profile-btn"
            >
              <i className="fas fa-trash"></i>
              Excluir Perfil
            </button>
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
              O TEX é a plataforma que conecta profissionais qualificados a pessoas que precisam de serviços de qualidade. 
              Nossa missão é facilitar essas conexões de forma rápida, segura e eficiente.
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
                <p>Experiência otimizada para dispositivos móveis com PWA instalável.</p>
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
            <h2><i className="fas fa-handshake"></i> Aceitação dos Termos</h2>
            <p>
              Ao usar o TEX, você concorda com estes termos de uso. 
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
              <li>Não usar para fins fraudulentos ou ilegais</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2><i className="fas fa-exclamation-circle"></i> Responsabilidades</h2>
            <p>O TEX não se responsabiliza por:</p>
            <ul>
              <li>Qualidade dos serviços prestados</li>
              <li>Disputas entre usuários</li>
              <li>Danos resultantes do uso da plataforma</li>
              <li>Conteúdo publicado pelos usuários</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2><i className="fas fa-user-shield"></i> Privacidade</h2>
            <p>
              Protegemos seus dados pessoais conforme nossa política de privacidade. 
              Coletamos apenas informações necessárias para o funcionamento da plataforma.
            </p>
          </div>

          <div className="terms-section coming-soon">
            <h2>
              <i className="fas fa-credit-card"></i> 
              Pagamentos 
              <span className="badge">Em Breve</span>
            </h2>
            <p>
              Sistema de pagamentos integrado será implementado em futuras versões, 
              oferecendo mais segurança nas transações.
            </p>
          </div>

          <div className="terms-section coming-soon">
            <h2>
              <i className="fas fa-star"></i> 
              Avaliações 
              <span className="badge">Em Breve</span>
            </h2>
            <p>
              Sistema de avaliações e comentários para ajudar na escolha dos melhores profissionais.
            </p>
          </div>

          <div className="terms-section">
            <h2><i className="fas fa-edit"></i> Modificações</h2>
            <p>
              Reservamos o direito de modificar estes termos. 
              Alterações importantes serão comunicadas aos usuários.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // Main render
  return (
    <div className="App">
      {renderHeader()}
      
      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
        {navigation.currentScreen === 'home' && renderHomeScreen()}
        {navigation.currentScreen === 'verify' && renderVerifyScreen()}
        {navigation.currentScreen === 'profile-setup' && renderProfileSetupScreen()}
        {navigation.currentScreen === 'feed' && renderFeedScreen()}
        {navigation.currentScreen === 'my-profile' && renderMyProfileScreen()}
        {navigation.currentScreen === 'about' && renderAboutScreen()}
        {navigation.currentScreen === 'terms' && renderTermsScreen()}
      </main>

      <footer>
        <nav className="footer-nav">
          <button onClick={() => navigateTo('home')}>Home</button>
          <button onClick={() => navigateTo('about')}>Sobre</button>
          <button onClick={() => navigateTo('terms')}>Termos</button>
          <a href="#" onClick={(e) => e.preventDefault()}>Instagram</a>
        </nav>
        <div className="copyright">
          © 2025 TrampoExpress. Todos os direitos reservados.
        </div>
      </footer>

      <PWAInstallPrompt />
      <Toaster 
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
          },
        }}
      />
    </div>
  )
}

export default App