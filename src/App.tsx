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

  // Criar usuários de Florianópolis com coordenadas reais
  const createFlorianopolisUsers = () => {
    const profissionais = [
      // CENTRO DE FLORIANÓPOLIS
      {
        id: 'floripa1',
        nome: 'Carlos Mendes',
        whatsapp: '48999887766',
        descricao: 'Pintor residencial e comercial com 15 anos de experiência. Especialista em texturas, grafiato e pintura decorativa. Atendo toda Grande Florianópolis.',
        tags: ['pintor', 'textura', 'decoração'],
        foto_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Centro, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5954,
        longitude: -48.5480
      },
      {
        id: 'floripa2',
        nome: 'Marina Silva',
        whatsapp: '48988776655',
        descricao: 'Acompanhante executiva discreta e elegante. Atendo eventos sociais, jantares de negócios e viagens. Formada em administração.',
        tags: ['acompanhante', 'executiva', 'eventos'],
        foto_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Centro, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5969,
        longitude: -48.5495
      },
      
      // TRINDADE
      {
        id: 'floripa3',
        nome: 'João Pedreiro',
        whatsapp: '48977665544',
        descricao: 'Pedreiro especializado em construção e reforma. Trabalho com alvenaria, reboco, azulejo e pisos. 20 anos de experiência na construção civil.',
        tags: ['pedreiro', 'construção', 'reforma'],
        foto_url: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Trindade, Florianópolis - SC',
        status: 'busy',
        criado_em: new Date().toISOString(),
        latitude: -27.6021,
        longitude: -48.5194
      },
      {
        id: 'floripa4',
        nome: 'Ana Professora',
        whatsapp: '48966554433',
        descricao: 'Professora particular de matemática, física e química. Atendo ensino fundamental, médio e pré-vestibular. Aulas presenciais e online.',
        tags: ['professora', 'matemática', 'vestibular'],
        foto_url: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Trindade, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.6010,
        longitude: -48.5180
      },

      // LAGOA DA CONCEIÇÃO
      {
        id: 'floripa5',
        nome: 'Pedro Desenvolvedor',
        whatsapp: '48955443322',
        descricao: 'Desenvolvedor full-stack especializado em React, Node.js e Python. Criação de sites, e-commerce e sistemas web. Trabalho remoto e presencial.',
        tags: ['programador', 'website', 'ecommerce'],
        foto_url: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Lagoa da Conceição, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.6109,
        longitude: -48.4577
      },
      {
        id: 'floripa6',
        nome: 'Lucia Cabeleireira',
        whatsapp: '48944332211',
        descricao: 'Cabeleireira e designer de sobrancelhas. Especialista em cortes modernos, coloração e tratamentos capilares. Atendimento domiciliar disponível.',
        tags: ['cabeleireira', 'sobrancelha', 'domiciliar'],
        foto_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Lagoa da Conceição, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.6095,
        longitude: -48.4590
      },

      // CANASVIEIRAS
      {
        id: 'floripa7',
        nome: 'Roberto Eletricista',
        whatsapp: '48933221100',
        descricao: 'Eletricista residencial e predial. Instalações elétricas, manutenção, quadros de força e automação residencial. Atendimento 24h para emergências.',
        tags: ['eletricista', 'instalação', '24h'],
        foto_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Canasvieiras, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4389,
        longitude: -48.4644
      },
      {
        id: 'floripa8',
        nome: 'Fernanda Personal',
        whatsapp: '48922110099',
        descricao: 'Personal trainer e nutricionista esportiva. Treinos personalizados, acompanhamento nutricional e consultoria fitness. Atendo em casa ou academia.',
        tags: ['personal', 'nutrição', 'fitness'],
        foto_url: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Canasvieiras, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4375,
        longitude: -48.4630
      },

      // INGLESES
      {
        id: 'floripa9',
        nome: 'Marcos Encanador',
        whatsapp: '48911009988',
        descricao: 'Encanador especializado em vazamentos, desentupimentos e instalações hidráulicas. Serviço de emergência 24h. Trabalho com garantia.',
        tags: ['encanador', 'vazamento', 'emergência'],
        foto_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Ingleses, Florianópolis - SC',
        status: 'busy',
        criado_em: new Date().toISOString(),
        latitude: -27.4308,
        longitude: -48.3917
      },
      {
        id: 'floripa10',
        nome: 'Juliana Fotógrafa',
        whatsapp: '48900998877',
        descricao: 'Fotógrafa profissional especializada em casamentos, ensaios e eventos. Trabalho com fotografia social e corporativa. Portfolio disponível.',
        tags: ['fotógrafa', 'casamento', 'ensaios'],
        foto_url: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Ingleses, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4295,
        longitude: -48.3905
      },

      // BARRA DA LAGOA
      {
        id: 'floripa11',
        nome: 'Diego Surfista',
        whatsapp: '48899887766',
        descricao: 'Instrutor de surf e stand up paddle. Aulas para iniciantes e avançados. Aluguel de pranchas e equipamentos. Conheço os melhores picos da ilha.',
        tags: ['surf', 'sup', 'instrutor'],
        foto_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Barra da Lagoa, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5742,
        longitude: -48.4217
      },
      {
        id: 'floripa12',
        nome: 'Camila Massagista',
        whatsapp: '48888776655',
        descricao: 'Massoterapeuta especializada em massagem relaxante, terapêutica e drenagem linfática. Atendimento domiciliar e em clínica própria.',
        tags: ['massagem', 'terapêutica', 'drenagem'],
        foto_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Barra da Lagoa, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5730,
        longitude: -48.4205
      },

      // JURERÊ
      {
        id: 'floripa13',
        nome: 'Ricardo Chef',
        whatsapp: '48877665544',
        descricao: 'Chef de cozinha especializado em culinária brasileira e internacional. Serviços de buffet, jantares especiais e aulas de culinária.',
        tags: ['chef', 'buffet', 'culinária'],
        foto_url: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Jurerê, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4542,
        longitude: -48.4992
      },
      {
        id: 'floripa14',
        nome: 'Bianca Arquiteta',
        whatsapp: '48866554433',
        descricao: 'Arquiteta e urbanista especializada em projetos residenciais e comerciais. Design de interiores, reformas e acompanhamento de obras.',
        tags: ['arquiteta', 'design', 'interiores'],
        foto_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Jurerê, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4555,
        longitude: -48.5005
      },

      // SANTO ANTÔNIO DE LISBOA
      {
        id: 'floripa15',
        nome: 'Gustavo Jardineiro',
        whatsapp: '48855443322',
        descricao: 'Paisagista e jardineiro especializado em jardins residenciais e comerciais. Manutenção, poda, plantio e projetos paisagísticos.',
        tags: ['jardineiro', 'paisagismo', 'poda'],
        foto_url: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Santo Antônio de Lisboa, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5008,
        longitude: -48.5447
      },
      {
        id: 'floripa16',
        nome: 'Patrícia Advogada',
        whatsapp: '48844332211',
        descricao: 'Advogada especializada em direito civil, trabalhista e previdenciário. Consultoria jurídica, contratos e acompanhamento processual.',
        tags: ['advogada', 'civil', 'trabalhista'],
        foto_url: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Santo Antônio de Lisboa, Florianópolis - SC',
        status: 'busy',
        criado_em: new Date().toISOString(),
        latitude: -27.4995,
        longitude: -48.5435
      },

      // SAMBAQUI
      {
        id: 'floripa17',
        nome: 'André Mecânico',
        whatsapp: '48833221100',
        descricao: 'Mecânico automotivo especializado em carros nacionais e importados. Diagnóstico computadorizado, manutenção preventiva e corretiva.',
        tags: ['mecânico', 'automotivo', 'diagnóstico'],
        foto_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Sambaqui, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4889,
        longitude: -48.5342
      },
      {
        id: 'floripa18',
        nome: 'Carla Psicóloga',
        whatsapp: '48822110099',
        descricao: 'Psicóloga clínica especializada em terapia cognitivo-comportamental. Atendimento presencial e online para adolescentes e adultos.',
        tags: ['psicóloga', 'terapia', 'online'],
        foto_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Sambaqui, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4875,
        longitude: -48.5330
      },

      // CÓRREGO GRANDE
      {
        id: 'floripa19',
        nome: 'Felipe Veterinário',
        whatsapp: '48811009988',
        descricao: 'Médico veterinário especializado em clínica geral e cirurgia. Atendimento domiciliar disponível. Cuidado com cães, gatos e pets exóticos.',
        tags: ['veterinário', 'domiciliar', 'cirurgia'],
        foto_url: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Córrego Grande, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5889,
        longitude: -48.5056
      },
      {
        id: 'floripa20',
        nome: 'Renata Dentista',
        whatsapp: '48800998877',
        descricao: 'Cirurgiã-dentista especializada em odontologia estética e implantes. Clareamento, facetas, próteses e tratamentos preventivos.',
        tags: ['dentista', 'estética', 'implantes'],
        foto_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Córrego Grande, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5875,
        longitude: -48.5045
      },

      // PANTANO DO SUL
      {
        id: 'floripa21',
        nome: 'Thiago Pescador',
        whatsapp: '48799887766',
        descricao: 'Pescador artesanal e guia de pesca esportiva. Passeios de barco, pesca oceânica e venda de peixes frescos. Conheço os melhores pesqueiros.',
        tags: ['pescador', 'pesca', 'passeios'],
        foto_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Pantano do Sul, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.7808,
        longitude: -48.5089
      },
      {
        id: 'floripa22',
        nome: 'Isabela Nutricionista',
        whatsapp: '48788776655',
        descricao: 'Nutricionista especializada em nutrição esportiva e emagrecimento. Consultas presenciais e online, planos alimentares personalizados.',
        tags: ['nutricionista', 'esportiva', 'emagrecimento'],
        foto_url: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Pantano do Sul, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.7795,
        longitude: -48.5075
      },

      // RIBEIRÃO DA ILHA
      {
        id: 'floripa23',
        nome: 'Eduardo Marceneiro',
        whatsapp: '48777665544',
        descricao: 'Marceneiro especializado em móveis sob medida e restauração. Trabalho com madeira maciça, MDF e compensado. Projetos residenciais e comerciais.',
        tags: ['marceneiro', 'móveis', 'restauração'],
        foto_url: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Ribeirão da Ilha, Florianópolis - SC',
        status: 'busy',
        criado_em: new Date().toISOString(),
        latitude: -27.7089,
        longitude: -48.5647
      },
      {
        id: 'floripa24',
        nome: 'Vanessa Esteticista',
        whatsapp: '48766554433',
        descricao: 'Esteticista facial e corporal. Limpeza de pele, tratamentos anti-idade, massagem modeladora e depilação. Atendimento em clínica própria.',
        tags: ['esteticista', 'facial', 'corporal'],
        foto_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Ribeirão da Ilha, Florianópolis - SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.7075,
        longitude: -48.5635
      },

      // REGIÃO CONTINENTAL (SÃO JOSÉ)
      {
        id: 'floripa25',
        nome: 'Bruno Soldador',
        whatsapp: '48755443322',
        descricao: 'Soldador especializado em estruturas metálicas, portões, grades e serralheria em geral. Trabalho com solda elétrica, MIG e TIG.',
        tags: ['soldador', 'serralheria', 'estruturas'],
        foto_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'São José, SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5969,
        longitude: -48.6394
      },
      {
        id: 'floripa26',
        nome: 'Larissa Designer',
        whatsapp: '48744332211',
        descricao: 'Designer gráfica freelancer especializada em identidade visual, marketing digital e criação de conteúdo. Trabalho com pequenas e médias empresas.',
        tags: ['designer', 'marketing', 'identidade'],
        foto_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'São José, SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.5955,
        longitude: -48.6380
      },

      // PALHOÇA
      {
        id: 'floripa27',
        nome: 'Rafael Contador',
        whatsapp: '48733221100',
        descricao: 'Contador especializado em contabilidade para pequenas empresas e MEI. Abertura de empresa, declaração de IR e consultoria fiscal.',
        tags: ['contador', 'mei', 'fiscal'],
        foto_url: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Palhoça, SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.6386,
        longitude: -48.6703
      },
      {
        id: 'floripa28',
        nome: 'Priscila Manicure',
        whatsapp: '48722110099',
        descricao: 'Manicure e pedicure especializada em nail art e alongamento de unhas. Atendimento domiciliar e em salão próprio. Produtos de qualidade.',
        tags: ['manicure', 'nailart', 'alongamento'],
        foto_url: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Palhoça, SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.6375,
        longitude: -48.6690
      },

      // BIGUAÇU
      {
        id: 'floripa29',
        nome: 'Leandro Motorista',
        whatsapp: '48711009988',
        descricao: 'Motorista particular e transfer para aeroporto. Veículo próprio, ar condicionado, viagens para outras cidades. Disponível 24h.',
        tags: ['motorista', 'transfer', 'aeroporto'],
        foto_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Biguaçu, SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4947,
        longitude: -48.6589
      },
      {
        id: 'floripa30',
        nome: 'Tatiane Pedagoga',
        whatsapp: '48700998877',
        descricao: 'Pedagoga especializada em reforço escolar e alfabetização. Aulas particulares para crianças com dificuldades de aprendizagem.',
        tags: ['pedagoga', 'reforço', 'alfabetização'],
        foto_url: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        localizacao: 'Biguaçu, SC',
        status: 'available',
        criado_em: new Date().toISOString(),
        latitude: -27.4935,
        longitude: -48.6575
      }
    ]
    
    return profissionais
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

    // Filtrar por raio se especificado
    const filtered = usersWithDistance.filter(user => 
      user.distancia === undefined || user.distancia <= searchRadius
    )

    // Ordenar por distância
    return filtered.sort((a, b) => (a.distancia || 999) - (b.distancia || 999))
  }

  useEffect(() => {
    // Carregar usuários de Florianópolis imediatamente
    const florianopolisUsers = createFlorianopolisUsers()
    setUsuarios(florianopolisUsers)
    setUsuariosFiltrados(florianopolisUsers)
    
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
      // Mesclar com usuários de Florianópolis, evitando duplicatas
      setUsuarios(prev => {
        const existingIds = prev.map(u => u.id)
        const newUsers = data.filter(user => !existingIds.includes(user.id))
        return [...prev, ...newUsers]
      })
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      // Se der erro, manter apenas os usuários de Florianópolis
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

      const novoUsuario = {
        id: currentUser.id,
        nome: name,
        whatsapp: phone,
        descricao: description,
        tags,
        foto_url: fotoUrl,
        localizacao: location,
        status,
        latitude: userLocation?.lat || null,
        longitude: userLocation?.lng || null
      }

      // Adicionar à lista local
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
      
      {/* Logo TEX fixo no canto superior esquerdo */}
      <div className="fixed top-6 left-6 z-50">
        <div 
          className="tex-logo-container tex-logo-normal cursor-pointer transition-all duration-300"
          onClick={handleBackToHome}
        >
          <div className="tex-logo-text">TEX</div>
        </div>
      </div>

      {/* Ícones do header no canto superior direito */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-4">
        <button
          onClick={getUserLocation}
          className={`text-xl cursor-pointer hover:scale-110 transition-transform ${
            locationPermission === 'granted' ? 'text-green-400' : 'text-yellow-400'
          }`}
          title={locationPermission === 'granted' ? 'Localização ativa' : 'Ativar localização'}
        >
          <i className="fas fa-map-marker-alt"></i>
        </button>
        <div className="text-yellow-400 text-xl cursor-pointer hover:scale-110 transition-transform">
          <i className="fas fa-search"></i>
        </div>
      </div>

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
                  Localização ativa - encontre profissionais próximos em Florianópolis
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
                  placeholder="Sua cidade/região em Florianópolis"
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
              {searchTerm ? 'Resultados da Busca' : sortByDistance ? 'Profissionais Próximos' : 'Profissionais em Florianópolis'}
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

      {/* About Screen */}
      {currentScreen === 'about' && (
        <main className="screen active">
          <div className="content-container">
            <div className="back-button-container">
              <button 
                className="back-button"
                onClick={handleBackToPrevious}
              >
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
            
            <h1 className="page-title">
              <i className="fas fa-info-circle"></i>
              Sobre a TEX Conecta
            </h1>
            
            <div className="about-content">
              <div className="content-section">
                <p className="intro-text">
                  A TEX Conecta é uma plataforma digital feita para conectar clientes a prestadores de serviços autônomos, com foco em praticidade, agilidade e liberdade.
                </p>

                <div className="features-grid">
                  <div className="feature-card">
                    <i className="fas fa-bolt"></i>
                    <h3>Simples e rápida</h3>
                    <p>Encontre profissionais em segundos</p>
                  </div>
                  <div className="feature-card">
                    <i className="fas fa-handshake"></i>
                    <h3>Sem burocracia</h3>
                    <p>Contato direto entre cliente e profissional</p>
                  </div>
                  <div className="feature-card">
                    <i className="fas fa-users"></i>
                    <h3>Sem intermediação</h3>
                    <p>Negociação livre entre as partes</p>
                  </div>
                </div>

                <div className="warning-box">
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>
                    <strong>Atenção:</strong> A TEX Conecta não intermedia e não assume qualquer responsabilidade sobre os serviços prestados. Toda responsabilidade pelo serviço é do profissional contratado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Terms Screen */}
      {currentScreen === 'terms' && (
        <main className="screen active">
          <div className="content-container">
            <div className="back-button-container">
              <button 
                className="back-button"
                onClick={handleBackToPrevious}
              >
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
            </div>
            
            <h1 className="page-title">
              <i className="fas fa-gavel"></i>
              Termos de Uso
            </h1>
            
            <div className="terms-content">
              <div className="terms-section">
                <h2><i className="fas fa-link"></i> Conexão entre as partes</h2>
                <p>A TEX Conecta atua apenas como um canal de contato. Não participa das negociações nem das execuções de serviço.</p>
              </div>

              <div className="terms-section">
                <h2><i className="fas fa-tools"></i> Prestadores de Serviços</h2>
                <ul>
                  <li>São autônomos e independentes</li>
                  <li>Não possuem vínculo com a plataforma</li>
                  <li>Devem manter seus dados e conduta profissional atualizados</li>
                </ul>
              </div>

              <div className="terms-section">
                <h2><i className="fas fa-users"></i> Clientes</h2>
                <ul>
                  <li>Não precisam se cadastrar</li>
                  <li>Contratam livremente os serviços</li>
                  <li>São responsáveis por suas escolhas e avaliações</li>
                </ul>
              </div>

              <div className="terms-section coming-soon">
                <h2>
                  <i className="fas fa-star"></i> 
                  Sistema de Avaliação
                  <span className="badge">Em Breve</span>
                </h2>
                <p>Após o serviço, os clientes poderão:</p>
                <ul>
                  <li>Avaliar o prestador com 1 a 5 estrelas</li>
                  <li>Deixar um comentário sobre a experiência</li>
                </ul>
                <p>Essas avaliações ajudarão outros usuários a fazerem boas escolhas!</p>
              </div>

              <div className="terms-section">
                <h2><i className="fas fa-shield-alt"></i> Política de Privacidade</h2>
                <p>A TEX Conecta respeita a privacidade dos usuários. Os dados fornecidos são usados exclusivamente para:</p>
                <ul>
                  <li>Exibir perfis</li>
                  <li>Permitir o contato via WhatsApp</li>
                </ul>
                <p><span className="highlight">Não vendemos, alugamos ou compartilhamos dados com terceiros.</span></p>
              </div>

              <div className="terms-section">
                <h2><i className="fas fa-undo"></i> Cancelamentos e Reembolsos</h2>
                <p>A TEX Conecta não se responsabiliza por cancelamentos ou reembolsos. Esses acordos devem ser tratados diretamente entre o cliente e o prestador.</p>
              </div>
            </div>
          </div>
        </main>
      )}

      <footer className="bg-black/80 backdrop-blur-md p-6 text-center">
        <nav className="footer-nav">
          <button onClick={handleBackToHome}>Home</button>
          <button onClick={() => navigateToScreen('feed')}>Feed</button>
          <button onClick={() => navigateToScreen('about')}>Sobre</button>
          <button onClick={() => navigateToScreen('terms')}>Termos</button>
        </nav>
        <div className="copyright">
          © 2025 TrampoExpress. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}

export default App