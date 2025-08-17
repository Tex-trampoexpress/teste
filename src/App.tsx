import React, { useState, useEffect } from 'react'
import { DatabaseService, type Usuario } from './lib/database'
import { MercadoPagoService } from './lib/mercadopago'
import PagamentoPix from './components/PagamentoPix'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import toast, { Toaster } from 'react-hot-toast'

interface AppState {
  currentScreen: 'home' | 'verify' | 'profile-setup' | 'my-profile' | 'edit-profile' | 'feed' | 'view-profile'
  currentUser: Usuario | null
  isLoggedIn: boolean
  users: Usuario[]
  searchTerm: string
  selectedTags: string[]
  userLocation: { latitude: number; longitude: number } | null
  proximityEnabled: boolean
  proximityRadius: number
  viewingUser: Usuario | null
  showProfileMenu: boolean
  showPaymentModal: boolean
  paymentPrestador: Usuario | null
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentScreen: 'home',
    currentUser: null,
    isLoggedIn: false,
    users: [],
    searchTerm: '',
    selectedTags: [],
    userLocation: null,
    proximityEnabled: false,
    proximityRadius: 10,
    viewingUser: null,
    showProfileMenu: false,
    showPaymentModal: false,
    paymentPrestador: null
  })

  // Navigation history for back button
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['home'])

  useEffect(() => {
    checkLoginStatus()
    loadUsers()
  }, [])

  const checkLoginStatus = async () => {
    const savedUser = localStorage.getItem('tex-current-user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        const user = await DatabaseService.getUsuario(userData.id)
        if (user) {
          setState(prev => ({
            ...prev,
            currentUser: user,
            isLoggedIn: true
          }))
        } else {
          localStorage.removeItem('tex-current-user')
        }
      } catch (error) {
        console.error('Erro ao verificar login:', error)
        localStorage.removeItem('tex-current-user')
      }
    }
  }

  const loadUsers = async () => {
    try {
      const users = await DatabaseService.getUsuarios({
        search: state.searchTerm,
        tags: state.selectedTags,
        status: 'available',
        limit: 50
      })
      setState(prev => ({ ...prev, users }))
    } catch (error) {
      console.error('❌ Erro na busca de usuários:', error)
      // Show configuration help instead of error
      toast.error('Configure o Supabase para ver dados reais', {
        duration: 6000,
        icon: '⚙️'
      })
      console.log('💡 Para configurar o Supabase:')
      console.log('1. Crie um arquivo .env na raiz do projeto')
      console.log('2. Adicione suas credenciais do Supabase:')
      console.log('   VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co')
      console.log('   VITE_SUPABASE_ANON_KEY=sua_chave_anonima')
      console.log('3. Reinicie o servidor: npm run dev')
      console.log('4. Obtenha as credenciais em: https://app.supabase.com/project/seu-projeto/settings/api')
    }
  }

  const navigateTo = (screen: string, addToHistory: boolean = true) => {
    setState(prev => ({ ...prev, currentScreen: screen as any }))
    
    if (addToHistory) {
      setNavigationHistory(prev => [...prev, screen])
    }
  }

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory]
      newHistory.pop() // Remove current screen
      const previousScreen = newHistory[newHistory.length - 1]
      
      setNavigationHistory(newHistory)
      setState(prev => ({ 
        ...prev, 
        currentScreen: previousScreen as any,
        showProfileMenu: false 
      }))
    }
  }

  const handleWhatsAppClick = async (e: React.MouseEvent, user: Usuario) => {
    e.preventDefault()
    
    // Verificar se está logado
    if (!state.isLoggedIn || !state.currentUser) {
      toast.error('Você precisa estar logado para entrar em contato')
      navigateTo('verify')
      return
    }

    // Verificar se não está tentando contatar a si mesmo
    if (state.currentUser.id === user.id) {
      toast.error('Você não pode entrar em contato consigo mesmo')
      return
    }

    // Abrir modal de pagamento
    setState(prev => ({
      ...prev,
      showPaymentModal: true,
      paymentPrestador: user
    }))
  }

  const handlePaymentSuccess = (whatsappUrl: string) => {
    // Fechar modal
    setState(prev => ({
      ...prev,
      showPaymentModal: false,
      paymentPrestador: null
    }))

    // Redirecionar para WhatsApp
    window.open(whatsappUrl, '_blank')
    toast.success('Redirecionando para WhatsApp...')
  }

  const handlePaymentClose = () => {
    setState(prev => ({
      ...prev,
      showPaymentModal: false,
      paymentPrestador: null
    }))
  }

  const handleLogin = async (whatsapp: string) => {
    try {
      toast.loading('Verificando usuário...')
      
      const existingUser = await DatabaseService.getUsuarioByWhatsApp(whatsapp)
      
      toast.dismiss()
      
      if (existingUser) {
        // Usuário existe, fazer login
        setState(prev => ({
          ...prev,
          currentUser: existingUser,
          isLoggedIn: true
        }))
        localStorage.setItem('tex-current-user', JSON.stringify(existingUser))
        
        if (existingUser.perfil_completo) {
          navigateTo('feed')
          toast.success(`Bem-vindo de volta, ${existingUser.nome}!`)
        } else {
          navigateTo('profile-setup')
          toast.success('Complete seu perfil para continuar')
        }
      } else {
        // Usuário não existe, criar novo
        const newUserId = crypto.randomUUID()
        setState(prev => ({
          ...prev,
          currentUser: {
            id: newUserId,
            whatsapp,
            nome: '',
            descricao: '',
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
          } as Usuario,
          isLoggedIn: true
        }))
        
        navigateTo('profile-setup')
        toast.success('Vamos criar seu perfil!')
      }
    } catch (error) {
      toast.dismiss()
      console.error('Erro no login:', error)
      toast.error('Erro ao fazer login. Tente novamente.')
    }
  }

  const handleLogout = () => {
    setState(prev => ({
      ...prev,
      currentUser: null,
      isLoggedIn: false,
      showProfileMenu: false
    }))
    localStorage.removeItem('tex-current-user')
    navigateTo('home')
    toast.success('Logout realizado com sucesso')
  }

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'home':
        return (
          <div className="screen active">
            <div className="hero-container">
              <div className="tex-logo-container-inside">
                <div className="tex-logo-text-inside">TEX</div>
              </div>
              
              <h1>
                Do trampo
                <span>ao encontro</span>
              </h1>
              
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Buscar profissionais, serviços ou localização..."
                  value={state.searchTerm}
                  onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && navigateTo('feed')}
                />
                <button 
                  className="explore-btn"
                  onClick={() => navigateTo('feed')}
                >
                  Explorar Profissionais
                </button>
              </div>

              {!state.isLoggedIn && (
                <button 
                  className="whatsapp-login-btn"
                  onClick={() => navigateTo('verify')}
                >
                  <i className="fab fa-whatsapp"></i>
                  Entrar com WhatsApp
                </button>
              )}

              <div className="hero-footer-info">
                <nav className="hero-footer-nav">
                  <a href="#" onClick={(e) => { e.preventDefault(); /* Navigate to about */ }}>Sobre</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); /* Navigate to terms */ }}>Termos</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); /* Navigate to contact */ }}>Contato</a>
                </nav>
                <div className="hero-copyright">
                  © 2025 TrampoExpress. Todos os direitos reservados.
                </div>
              </div>
            </div>
          </div>
        )

      case 'verify':
        return (
          <div className="screen active">
            {navigationHistory.length > 1 && (
              <div className="back-button-container">
                <button className="back-button" onClick={goBack}>
                  <i className="fas fa-arrow-left"></i>
                  Voltar
                </button>
              </div>
            )}
            
            <div className="form-container">
              <h2>Entrar no TEX</h2>
              <p>Digite seu WhatsApp para entrar ou criar sua conta</p>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                const whatsapp = formData.get('whatsapp') as string
                if (whatsapp) {
                  handleLogin(whatsapp.trim())
                }
              }}>
                <div className="phone-input">
                  <div className="country-code">+55</div>
                  <input
                    type="tel"
                    name="whatsapp"
                    placeholder="11999887766"
                    required
                    pattern="[0-9]{10,11}"
                    title="Digite apenas números (10 ou 11 dígitos)"
                  />
                </div>
                
                <div className="info-box">
                  <i className="fab fa-whatsapp"></i>
                  <p>
                    Usamos seu WhatsApp apenas para identificação e contato direto. 
                    Não enviamos spam nem compartilhamos seus dados.
                  </p>
                </div>
                
                <button type="submit" className="verify-btn">
                  <i className="fab fa-whatsapp"></i>
                  Continuar
                </button>
              </form>
            </div>
          </div>
        )

      case 'feed':
        return (
          <div className="screen active">
            {navigationHistory.length > 1 && (
              <div className="back-button-container">
                <button className="back-button" onClick={goBack}>
                  <i className="fas fa-arrow-left"></i>
                  Voltar
                </button>
              </div>
            )}
            
            <div className="feed">
              <div className="search-header">
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Buscar profissionais..."
                    value={state.searchTerm}
                    onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && loadUsers()}
                  />
                  {state.searchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => {
                        setState(prev => ({ ...prev, searchTerm: '' }))
                        loadUsers()
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>

              {state.users.length === 0 ? (
                <div className="no-results">
                  <i className="fas fa-search"></i>
                  <h3>Nenhum profissional encontrado</h3>
                  <p>Tente ajustar sua busca ou explore todos os profissionais disponíveis</p>
                  <div className="no-results-actions">
                    <button 
                      className="explore-all-btn"
                      onClick={() => {
                        setState(prev => ({ ...prev, searchTerm: '', selectedTags: [] }))
                        loadUsers()
                      }}
                    >
                      Ver Todos os Profissionais
                    </button>
                    <button className="back-home-btn" onClick={() => navigateTo('home')}>
                      <i className="fas fa-home"></i>
                      Voltar ao Início
                    </button>
                  </div>
                </div>
              ) : (
                <div className="users-grid">
                  {state.users.map((user) => (
                    <div key={user.id} className="profile-card">
                      <div className="profile-header">
                        <div className="profile-pic">
                          {user.foto_url ? (
                            <img 
                              src={user.foto_url} 
                              alt={user.nome}
                              onError={(e) => {
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
                              <div className="distance-badge">
                                <i className="fas fa-map-marker-alt"></i>
                                {user.distancia.toFixed(1)}km
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
                          {user.tags.slice(0, 4).map((tag, index) => (
                            <span 
                              key={index} 
                              className="tag-clickable"
                              onClick={() => {
                                setState(prev => ({ ...prev, searchTerm: tag }))
                                loadUsers()
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                          {user.tags.length > 4 && (
                            <span>+{user.tags.length - 4}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="profile-actions">
                        <button 
                          className="whatsapp-btn"
                          onClick={(e) => handleWhatsAppClick(e, user)}
                        >
                          <i className="fab fa-whatsapp"></i>
                          Entrar em Contato
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      default:
        return (
          <div className="screen active">
            <div className="hero-container">
              <h2>Tela em desenvolvimento</h2>
              <button className="back-home-btn" onClick={() => navigateTo('home')}>
                <i className="fas fa-home"></i>
                Voltar ao Início
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="app">
      {/* Profile Header Button */}
      {state.isLoggedIn && state.currentUser && (
        <button 
          className="profile-header-btn"
          onClick={() => setState(prev => ({ ...prev, showProfileMenu: !prev.showProfileMenu }))}
        >
          {state.currentUser.foto_url ? (
            <img 
              src={state.currentUser.foto_url} 
              alt={state.currentUser.nome}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <i className={`fas fa-user ${state.currentUser.foto_url ? 'hidden' : ''}`}></i>
        </button>
      )}

      {/* Profile Menu Dropdown */}
      {state.showProfileMenu && (
        <>
          <div 
            className="profile-menu-overlay"
            onClick={() => setState(prev => ({ ...prev, showProfileMenu: false }))}
          ></div>
          <div className="profile-menu">
            <div className="profile-menu-content">
              <div className="profile-menu-header">
                <div className="profile-menu-avatar">
                  {state.currentUser?.foto_url ? (
                    <img 
                      src={state.currentUser.foto_url} 
                      alt={state.currentUser.nome}
                    />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>
                <div className="profile-menu-info">
                  <h4>{state.currentUser?.nome || 'Usuário'}</h4>
                  <p>{state.currentUser?.whatsapp}</p>
                </div>
              </div>
              
              <div className="profile-menu-actions">
                <button 
                  className="profile-menu-item"
                  onClick={() => {
                    setState(prev => ({ ...prev, showProfileMenu: false }))
                    navigateTo('my-profile')
                  }}
                >
                  <i className="fas fa-user"></i>
                  Meu Perfil
                </button>
                
                <button 
                  className="profile-menu-item"
                  onClick={() => {
                    setState(prev => ({ ...prev, showProfileMenu: false }))
                    navigateTo('feed')
                  }}
                >
                  <i className="fas fa-search"></i>
                  Buscar Profissionais
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

      {/* Main Content */}
      <main>
        {renderScreen()}
      </main>

      {/* Payment Modal */}
      {state.showPaymentModal && state.paymentPrestador && state.currentUser && (
        <PagamentoPix
          prestadorId={state.paymentPrestador.id}
          prestadorNome={state.paymentPrestador.nome}
          prestadorWhatsapp={state.paymentPrestador.whatsapp}
          clienteId={state.currentUser.id}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Toast Notifications */}
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
    </div>
  )
}

export default App