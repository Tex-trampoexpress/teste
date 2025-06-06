import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { DatabaseService } from './lib/database'
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
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const dbService = new DatabaseService()

  useEffect(() => {
    checkUser()
    loadUsuarios()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const loadUsuarios = async () => {
    try {
      const data = await dbService.getUsuarios()
      setUsuarios(data)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    }
  }

  const handleLogin = async () => {
    if (!phone || phone.length < 10) {
      alert('Por favor, insira um número de telefone válido')
      return
    }
    
    setLoading(true)
    try {
      // Simulate phone verification - in real app, use proper auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${phone}@temp.com`,
        password: phone
      })
      
      if (error) {
        // If user doesn't exist, create account
        const { error: signUpError } = await supabase.auth.signUp({
          email: `${phone}@temp.com`,
          password: phone
        })
        if (signUpError) throw signUpError
      }
      
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
    if (tagInput.trim() && tags.length < 3 && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
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
    
    if (tags.length === 0) {
      alert('Por favor, adicione pelo menos uma tag de serviço')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      let fotoUrl = ''
      if (photoFile) {
        fotoUrl = await dbService.uploadPhoto(photoFile, user.id)
      }

      await dbService.createUsuario({
        id: user.id,
        nome: name,
        whatsapp: phone,
        descricao: description,
        tags,
        foto_url: fotoUrl,
        localizacao: location,
        status
      })

      alert('Perfil salvo com sucesso!')
      setCurrentScreen('feed')
      loadUsuarios()
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

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 w-full bg-black/80 backdrop-blur-md p-6 flex justify-between items-center z-50">
        <div className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-cyan-400 bg-clip-text text-transparent">
          TEX
        </div>
        <div className="text-yellow-400 text-xl cursor-pointer hover:scale-110 transition-transform">
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
                aria-label="Campo de busca"
              />
              <button 
                className="explore-btn" 
                type="button"
                onClick={() => setCurrentScreen('feed')}
              >
                Explorar Agora
              </button>
            </div>
            <button 
              className="whatsapp-login-btn"
              onClick={() => setCurrentScreen('verify')}
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
              onClick={handleLogin}
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
              </div>

              <div className="form-group">
                <label>Tags de Serviço (até 3)</label>
                <div className="tags-input">
                  <input 
                    type="text" 
                    placeholder="Digite uma tag e pressione Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
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
            <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-yellow-400 to-cyan-400 bg-clip-text text-transparent">
              Profissionais Disponíveis
            </h2>
            {usuarios.map(usuario => (
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
                    <h2>{usuario.nome}</h2>
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
                      <span key={tag}>#{tag}</span>
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
            ))}
          </div>
        </main>
      )}

      <footer className="bg-black/80 backdrop-blur-md p-6 text-center">
        <nav className="footer-nav">
          <button onClick={() => setCurrentScreen('home')}>Home</button>
          <button onClick={() => setCurrentScreen('feed')}>Feed</button>
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