import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { DatabaseService, Usuario } from './lib/database'
import { toast, Toaster } from 'react-hot-toast'

function App() {
  const [currentScreen, setCurrentScreen] = useState('home')
  const [user, setUser] = useState<any>(null)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [status, setStatus] = useState<'available' | 'busy'>('available')
  const [location, setLocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
        loadUsuarios()
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
        loadUsuarios()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await DatabaseService.getUsuario(userId)
      if (profile) {
        setName(profile.nome || '')
        setPhone(profile.whatsapp || '')
        setDescription(profile.descricao || '')
        setTags(profile.tags || [])
        setStatus(profile.status)
        setLocation(profile.localizacao || '')
        setAvatarUrl(profile.foto_url || '')
      }
    } catch (error) {
      console.log('Profile not found, will create new one')
    }
  }

  const loadUsuarios = async () => {
    try {
      const data = await DatabaseService.getUsuarios({ status: 'available' })
      setUsuarios(data)
    } catch (error) {
      console.error('Error loading usuarios:', error)
    }
  }

  const handlePhoneAuth = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Por favor, insira um número de telefone válido')
      return
    }

    setLoading(true)
    try {
      // For demo purposes, we'll create a mock user
      // In production, you'd implement proper phone authentication
      const mockUser = {
        id: `user_${Date.now()}`,
        phone: phone,
        email: `${phone}@temp.com`
      }
      
      setUser(mockUser)
      setCurrentScreen('profile')
      toast.success('Número verificado com sucesso!')
    } catch (error) {
      toast.error('Erro na verificação do número')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Por favor, preencha seu nome')
      return
    }

    if (tags.length === 0) {
      toast.error('Por favor, adicione pelo menos uma tag de serviço')
      return
    }

    setLoading(true)
    try {
      const profileData: Partial<Usuario> = {
        id: user.id,
        nome: name.trim(),
        whatsapp: phone,
        descricao: description.trim(),
        tags: tags,
        foto_url: avatarUrl,
        localizacao: location.trim(),
        status: status
      }

      await DatabaseService.upsertUsuario(profileData)
      await loadUsuarios()
      
      toast.success('Perfil salvo com sucesso!')
      setCurrentScreen('feed')
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Erro ao salvar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      loadUsuarios()
      return
    }

    try {
      const data = await DatabaseService.getUsuarios({ 
        search: searchTerm.trim(),
        status: 'available' 
      })
      setUsuarios(data)
    } catch (error) {
      console.error('Error searching:', error)
      toast.error('Erro na busca')
    }
  }

  const formatWhatsAppLink = (whatsapp: string, nome: string) => {
    const cleanPhone = whatsapp.replace(/\D/g, '')
    const message = `Olá ${nome}, vi seu perfil no TEX e gostaria de conversar sobre seus serviços!`
    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  return (
    <>
      <Toaster position="top-center" />
      
      <header>
        <div className="logo">TEX</div>
        <div className="search-icon">
          <i className="fas fa-search"></i>
        </div>
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
                onChange={(e) => handleSearch(e.target.value)}
              />
              <button 
                className="explore-btn" 
                onClick={() => user ? setCurrentScreen('feed') : setCurrentScreen('verify')}
              >
                {user ? 'Ver Perfis' : 'Explorar Agora'}
              </button>
            </div>
            {!user && (
              <button 
                className="whatsapp-login-btn"
                onClick={() => setCurrentScreen('verify')}
              >
                <i className="fab fa-whatsapp"></i>
                Entrar com WhatsApp
              </button>
            )}
          </div>
        </main>
      )}

      {/* Verify Screen */}
      {currentScreen === 'verify' && (
        <main className="screen active">
          <div className="form-container">
            <h2>Verificação WhatsApp</h2>
            <p>Digite seu número para continuar</p>
            <div className="phone-input">
              <span className="country-code">+55</span>
              <input 
                type="tel" 
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button 
              className="verify-btn"
              onClick={handlePhoneAuth}
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Verificar Número'}
            </button>
          </div>
        </main>
      )}

      {/* Profile Setup Screen */}
      {currentScreen === 'profile' && (
        <main className="screen active">
          <div className="form-container">
            <h2>Configure seu Perfil</h2>
            <div className="profile-setup">
              <div className="photo-upload">
                <div className="photo-preview">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" />
                  ) : (
                    <i className="fas fa-camera"></i>
                  )}
                </div>
                <input 
                  type="url" 
                  placeholder="URL da foto (opcional)"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>Nome</label>
                <input 
                  type="text" 
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea 
                  placeholder="Conte sobre você e seus serviços..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Localização</label>
                <input 
                  type="text" 
                  placeholder="Sua cidade/região"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Tags de Serviço (até 3)</label>
                <div className="tags-input">
                  <input 
                    type="text" 
                    placeholder="Digite uma tag e pressione Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const tag = e.currentTarget.value.trim()
                        if (tag && tags.length < 3 && !tags.includes(tag)) {
                          setTags([...tags, tag])
                          e.currentTarget.value = ''
                        }
                      }
                    }}
                  />
                  <div className="tags-container">
                    {tags.map(tag => (
                      <div key={tag} className="tag">
                        #{tag}
                        <i 
                          className="fas fa-times" 
                          onClick={() => setTags(tags.filter(t => t !== tag))}
                        />
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
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
              Profissionais Disponíveis
            </h2>
            {usuarios.map(usuario => (
              <div key={usuario.id} className="profile-card">
                <div className="profile-header">
                  <div className="profile-pic">
                    {usuario.foto_url ? (
                      <img src={usuario.foto_url} alt={usuario.nome || 'Usuário'} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--gradient)', borderRadius: '50%' }} />
                    )}
                  </div>
                  <div className="profile-info">
                    <h2>{usuario.nome}</h2>
                    {usuario.descricao && (
                      <p className="description">{usuario.descricao}</p>
                    )}
                    {usuario.localizacao && (
                      <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                        📍 {usuario.localizacao}
                      </p>
                    )}
                    <span className={`status status-${usuario.status}`}>
                      {usuario.status === 'available' ? 'Disponível' : 'Ocupado'}
                    </span>
                  </div>
                </div>
                
                {usuario.tags && usuario.tags.length > 0 && (
                  <div className="hashtags">
                    {usuario.tags.map(tag => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                )}

                {usuario.whatsapp && (
                  <a 
                    href={formatWhatsAppLink(usuario.whatsapp, usuario.nome || 'Usuário')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-btn"
                  >
                    <i className="fab fa-whatsapp"></i>
                    Conversar no WhatsApp
                  </a>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      <footer>
        <nav className="footer-nav">
          <a href="#" onClick={() => setCurrentScreen('home')}>Home</a>
          {user && <a href="#" onClick={() => setCurrentScreen('feed')}>Feed</a>}
          {user && <a href="#" onClick={() => setCurrentScreen('profile')}>Perfil</a>}
          <a href="/src/pages/about.html">Sobre</a>
          <a href="/src/pages/terms.html">Termos</a>
        </nav>
        <div className="copyright">
          © 2025 TrampoExpress. Todos os direitos reservados.
        </div>
      </footer>
    </>
  )
}

export default App