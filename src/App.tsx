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
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [previousScreen, setPreviousScreen] = useState('home')

  const dbService = new DatabaseService()

  // Criar usuários de exemplo
  const createExampleUsers = () => {
    const exemplos = [
      {
        id: 'exemplo1',
        nome: 'João Silva',
        whatsapp: '11999887766',
        descricao: 'Eletricista com 10 anos de experiência. Atendo residencial e comercial com garantia.',
        tags: ['eletricista', 'residencial', 'comercial'],
        foto_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'São Paulo, SP',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo2',
        nome: 'Maria Santos',
        whatsapp: '11988776655',
        descricao: 'Designer gráfica freelancer. Criação de logos, cartões e materiais publicitários.',
        tags: ['design', 'logo', 'publicidade'],
        foto_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Rio de Janeiro, RJ',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo3',
        nome: 'Carlos Pereira',
        whatsapp: '11977665544',
        descricao: 'Encanador especializado em vazamentos e instalações. Atendimento 24h emergencial.',
        tags: ['encanador', 'vazamento', '24h'],
        foto_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Belo Horizonte, MG',
        status: 'busy',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo4',
        nome: 'Ana Costa',
        whatsapp: '11966554433',
        descricao: 'Professora particular de matemática e física. Ensino fundamental e médio.',
        tags: ['professora', 'matemática', 'física'],
        foto_url: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Curitiba, PR',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo5',
        nome: 'Pedro Oliveira',
        whatsapp: '11955443322',
        descricao: 'Desenvolvedor web especializado em React e Node.js. Criação de sites e sistemas.',
        tags: ['programador', 'website', 'sistema'],
        foto_url: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'São Paulo, SP',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo6',
        nome: 'Lucia Fernandes',
        whatsapp: '11944332211',
        descricao: 'Cabeleireira e manicure. Atendimento domiciliar e no salão. Especialista em cortes modernos.',
        tags: ['cabeleireira', 'manicure', 'domiciliar'],
        foto_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Salvador, BA',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo7',
        nome: 'Roberto Machado',
        whatsapp: '11933221100',
        descricao: 'Mecânico automotivo com 15 anos de experiência. Especialista em carros nacionais e importados.',
        tags: ['mecânico', 'automotivo', 'carros'],
        foto_url: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Porto Alegre, RS',
        status: 'busy',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo8',
        nome: 'Fernanda Lima',
        whatsapp: '11922110099',
        descricao: 'Personal trainer e nutricionista. Treinos personalizados e acompanhamento nutricional.',
        tags: ['personal', 'nutrição', 'fitness'],
        foto_url: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Brasília, DF',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo9',
        nome: 'Marcos Souza',
        whatsapp: '11911009988',
        descricao: 'Pintor residencial e comercial. Trabalho com texturas, grafiato e pintura decorativa.',
        tags: ['pintor', 'textura', 'decoração'],
        foto_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Recife, PE',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo10',
        nome: 'Juliana Rocha',
        whatsapp: '11900998877',
        descricao: 'Fotógrafa profissional. Casamentos, eventos, ensaios e fotos corporativas.',
        tags: ['fotógrafa', 'casamento', 'eventos'],
        foto_url: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Florianópolis, SC',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo11',
        nome: 'André Barbosa',
        whatsapp: '11899887766',
        descricao: 'Chef de cozinha. Buffets para eventos, aulas de culinária e consultoria gastronômica.',
        tags: ['chef', 'buffet', 'culinária'],
        foto_url: 'https://images.pexels.com/photos/1367269/pexels-photo-1367269.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'São Paulo, SP',
        status: 'busy',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo12',
        nome: 'Camila Alves',
        whatsapp: '11888776655',
        descricao: 'Psicóloga clínica. Atendimento presencial e online. Especialista em ansiedade e depressão.',
        tags: ['psicóloga', 'online', 'terapia'],
        foto_url: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Rio de Janeiro, RJ',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo13',
        nome: 'Diego Santos',
        whatsapp: '11877665544',
        descricao: 'Jardineiro e paisagista. Manutenção de jardins, poda de árvores e projetos paisagísticos.',
        tags: ['jardineiro', 'paisagismo', 'poda'],
        foto_url: 'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Campinas, SP',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo14',
        nome: 'Beatriz Cardoso',
        whatsapp: '11866554433',
        descricao: 'Advogada especialista em direito trabalhista e previdenciário. Consultoria jurídica.',
        tags: ['advogada', 'trabalhista', 'consultoria'],
        foto_url: 'https://images.pexels.com/photos/1181562/pexels-photo-1181562.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Belo Horizonte, MG',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo15',
        nome: 'Rafael Mendes',
        whatsapp: '11855443322',
        descricao: 'Técnico em informática. Manutenção de computadores, instalação de redes e suporte técnico.',
        tags: ['informática', 'computador', 'suporte'],
        foto_url: 'https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Fortaleza, CE',
        status: 'busy',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo16',
        nome: 'Patrícia Gomes',
        whatsapp: '11844332211',
        descricao: 'Veterinária. Consultas, vacinas e cirurgias. Atendimento domiciliar para pets.',
        tags: ['veterinária', 'pets', 'domiciliar'],
        foto_url: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Curitiba, PR',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo17',
        nome: 'Thiago Costa',
        whatsapp: '11833221100',
        descricao: 'Personal organizer. Organização de ambientes residenciais e comerciais.',
        tags: ['organização', 'ambientes', 'consultoria'],
        foto_url: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'São Paulo, SP',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo18',
        nome: 'Vanessa Silva',
        whatsapp: '11822110099',
        descricao: 'Esteticista e micropigmentadora. Limpeza de pele, massagens e procedimentos estéticos.',
        tags: ['estética', 'micropigmentação', 'massagem'],
        foto_url: 'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Goiânia, GO',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo19',
        nome: 'Lucas Ferreira',
        whatsapp: '11811009988',
        descricao: 'Professor de música. Aulas de violão, piano e canto. Presencial e online.',
        tags: ['música', 'violão', 'piano'],
        foto_url: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Natal, RN',
        status: 'available',
        criado_em: new Date().toISOString()
      },
      {
        id: 'exemplo20',
        nome: 'Gabriela Martins',
        whatsapp: '11800998877',
        descricao: 'Arquiteta e urbanista. Projetos residenciais, comerciais e acompanhamento de obras.',
        tags: ['arquiteta', 'projetos', 'obras'],
        foto_url: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Vitória, ES',
        status: 'busy',
        criado_em: new Date().toISOString()
      }
    ]
    
    return exemplos
  }

  useEffect(() => {
    // Carregar usuários de exemplo imediatamente
    const exampleUsers = createExampleUsers()
    setUsuarios(exampleUsers)
    setUsuariosFiltrados(exampleUsers)
    
    // Tentar carregar usuários do banco também
    loadUsuarios()
  }, [])

  useEffect(() => {
    // Filtrar usuários baseado no termo de busca
    if (searchTerm.trim() === '') {
      setUsuariosFiltrados(usuarios)
    } else {
      const filtered = usuarios.filter(usuario => 
        usuario.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.localizacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setUsuariosFiltrados(filtered)
    }
  }, [searchTerm, usuarios])

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
        status
      }

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
      <header className="fixed top-0 w-full bg-black/80 backdrop-blur-md p-6 flex justify-between items-center z-50">
        <div 
          className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-cyan-400 bg-clip-text text-transparent cursor-pointer"
          onClick={handleBackToHome}
        >
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
                placeholder="(11) 99999-9999"
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
              {searchTerm && (
                <div className="search-results-info">
                  <p>{usuariosFiltrados.length} resultado(s) para "{searchTerm}"</p>
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-yellow-400 to-cyan-400 bg-clip-text text-transparent">
              {searchTerm ? 'Resultados da Busca' : 'Profissionais Disponíveis'}
            </h2>
            
            {usuariosFiltrados.length === 0 ? (
              <div className="no-results">
                <i className="fas fa-search"></i>
                <h3>Nenhum resultado encontrado</h3>
                <p>Tente buscar por outros termos ou explore todos os profissionais</p>
                <div className="no-results-actions">
                  <button 
                    className="explore-all-btn"
                    onClick={() => setSearchTerm('')}
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