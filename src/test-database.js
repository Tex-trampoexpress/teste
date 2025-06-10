// Teste completo do banco de dados TEX
import { DatabaseService } from './lib/database.js'
import { supabase } from './lib/supabase.js'

console.log('🔍 INICIANDO TESTES DO BANCO DE DADOS TEX...\n')

async function testDatabaseConnection() {
  console.log('1️⃣ Testando conexão com Supabase...')
  try {
    const { data, error } = await supabase.from('usuarios').select('count').single()
    if (error) throw error
    console.log('✅ Conexão com Supabase estabelecida com sucesso!')
    return true
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message)
    return false
  }
}

async function testTableStructure() {
  console.log('\n2️⃣ Testando estrutura da tabela usuarios...')
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1)
    
    if (error) throw error
    
    const expectedFields = [
      'id', 'nome', 'whatsapp', 'descricao', 'tags', 'foto_url',
      'localizacao', 'status', 'latitude', 'longitude', 'criado_em',
      'atualizado_em', 'ultimo_acesso', 'perfil_completo', 'verificado'
    ]
    
    if (data && data.length > 0) {
      const actualFields = Object.keys(data[0])
      const missingFields = expectedFields.filter(field => !actualFields.includes(field))
      
      if (missingFields.length === 0) {
        console.log('✅ Estrutura da tabela está correta!')
        console.log('📋 Campos encontrados:', actualFields.join(', '))
        return true
      } else {
        console.log('⚠️ Campos faltando:', missingFields.join(', '))
        return false
      }
    } else {
      console.log('✅ Tabela existe mas está vazia (normal)')
      return true
    }
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message)
    return false
  }
}

async function testCRUDOperations() {
  console.log('\n3️⃣ Testando operações CRUD...')
  
  const testUser = {
    id: crypto.randomUUID(),
    nome: 'Teste Usuario',
    whatsapp: '+5511999999999',
    descricao: 'Usuário de teste para validação do sistema',
    tags: ['teste', 'validacao'],
    localizacao: 'São Paulo, SP',
    status: 'available',
    latitude: -23.5505,
    longitude: -46.6333
  }
  
  try {
    // CREATE
    console.log('📝 Testando criação de usuário...')
    const createdUser = await DatabaseService.createUsuario(testUser)
    console.log('✅ Usuário criado com sucesso!')
    console.log('🔍 Perfil completo automaticamente:', createdUser.perfil_completo)
    
    // READ
    console.log('📖 Testando leitura de usuário...')
    const readUser = await DatabaseService.getUsuario(testUser.id)
    if (readUser && readUser.id === testUser.id) {
      console.log('✅ Usuário lido com sucesso!')
    } else {
      throw new Error('Usuário não encontrado na leitura')
    }
    
    // UPDATE
    console.log('✏️ Testando atualização de usuário...')
    const updatedUser = await DatabaseService.updateUsuario(testUser.id, {
      descricao: 'Descrição atualizada para teste',
      status: 'busy'
    })
    console.log('✅ Usuário atualizado com sucesso!')
    console.log('🔍 Status atualizado:', updatedUser.status)
    
    // DELETE
    console.log('🗑️ Testando exclusão de usuário...')
    await DatabaseService.deleteUsuario(testUser.id)
    console.log('✅ Usuário excluído com sucesso!')
    
    return true
  } catch (error) {
    console.error('❌ Erro nas operações CRUD:', error.message)
    return false
  }
}

async function testSearchFunctions() {
  console.log('\n4️⃣ Testando funções de busca...')
  
  try {
    // Busca geral
    console.log('🔍 Testando busca geral...')
    const allUsers = await DatabaseService.getUsuarios({ limit: 5 })
    console.log(`✅ Busca geral retornou ${allUsers.length} usuários`)
    
    // Busca por tags
    console.log('🏷️ Testando busca por tags...')
    const usersByTags = await DatabaseService.searchByTags(['design'])
    console.log(`✅ Busca por tags retornou ${usersByTags.length} usuários`)
    
    // Busca textual
    console.log('📝 Testando busca textual...')
    const searchResults = await DatabaseService.getUsuarios({ 
      search: 'desenvolvedor',
      limit: 3 
    })
    console.log(`✅ Busca textual retornou ${searchResults.length} usuários`)
    
    return true
  } catch (error) {
    console.error('❌ Erro nas funções de busca:', error.message)
    return false
  }
}

async function testProximitySearch() {
  console.log('\n5️⃣ Testando busca por proximidade...')
  
  try {
    // Coordenadas de São Paulo
    const latitude = -23.5505
    const longitude = -46.6333
    const radius = 50 // 50km
    
    console.log(`📍 Buscando usuários próximos a São Paulo (${radius}km)...`)
    const nearbyUsers = await DatabaseService.getUsersByProximity(latitude, longitude, radius)
    console.log(`✅ Busca por proximidade retornou ${nearbyUsers.length} usuários`)
    
    if (nearbyUsers.length > 0) {
      console.log('📊 Distâncias encontradas:')
      nearbyUsers.forEach(user => {
        console.log(`   - ${user.nome}: ${user.distancia}km`)
      })
    }
    
    return true
  } catch (error) {
    console.error('❌ Erro na busca por proximidade:', error.message)
    return false
  }
}

async function testAdvancedFeatures() {
  console.log('\n6️⃣ Testando recursos avançados...')
  
  try {
    // Usuários recentes
    console.log('⏰ Testando busca de usuários recentes...')
    const recentUsers = await DatabaseService.getRecentUsers(3)
    console.log(`✅ Usuários recentes: ${recentUsers.length}`)
    
    // Usuários em destaque
    console.log('⭐ Testando busca de usuários em destaque...')
    const featuredUsers = await DatabaseService.getFeaturedUsers(3)
    console.log(`✅ Usuários em destaque: ${featuredUsers.length}`)
    
    // Verificar WhatsApp registrado
    console.log('📱 Testando verificação de WhatsApp...')
    const isRegistered = await DatabaseService.isWhatsAppRegistered('+5511999887766')
    console.log(`✅ WhatsApp registrado: ${isRegistered}`)
    
    return true
  } catch (error) {
    console.error('❌ Erro nos recursos avançados:', error.message)
    return false
  }
}

async function testRLSPolicies() {
  console.log('\n7️⃣ Testando políticas RLS...')
  
  try {
    // Testar acesso anônimo (deve funcionar para perfis completos e disponíveis)
    console.log('👤 Testando acesso anônimo...')
    const { data: publicUsers, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('status', 'available')
      .eq('perfil_completo', true)
      .limit(3)
    
    if (error) throw error
    console.log(`✅ Acesso anônimo funcionando: ${publicUsers.length} perfis públicos`)
    
    return true
  } catch (error) {
    console.error('❌ Erro nas políticas RLS:', error.message)
    return false
  }
}

async function testDatabaseFunctions() {
  console.log('\n8️⃣ Testando funções SQL customizadas...')
  
  try {
    // Testar função de busca otimizada
    console.log('🔧 Testando função search_usuarios...')
    const { data: searchData, error: searchError } = await supabase
      .rpc('search_usuarios', {
        search_term: 'design',
        filter_tags: [],
        filter_status: 'available',
        limit_results: 5
      })
    
    if (searchError) throw searchError
    console.log(`✅ Função search_usuarios: ${searchData.length} resultados`)
    
    // Testar função de proximidade
    console.log('📍 Testando função get_users_by_proximity...')
    const { data: proximityData, error: proximityError } = await supabase
      .rpc('get_users_by_proximity', {
        user_lat: -23.5505,
        user_lon: -46.6333,
        radius_km: 100
      })
    
    if (proximityError) throw proximityError
    console.log(`✅ Função get_users_by_proximity: ${proximityData.length} resultados`)
    
    return true
  } catch (error) {
    console.error('❌ Erro nas funções SQL:', error.message)
    return false
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 EXECUTANDO BATERIA COMPLETA DE TESTES\n')
  console.log('=' * 50)
  
  const tests = [
    { name: 'Conexão', fn: testDatabaseConnection },
    { name: 'Estrutura', fn: testTableStructure },
    { name: 'CRUD', fn: testCRUDOperations },
    { name: 'Busca', fn: testSearchFunctions },
    { name: 'Proximidade', fn: testProximitySearch },
    { name: 'Recursos Avançados', fn: testAdvancedFeatures },
    { name: 'RLS', fn: testRLSPolicies },
    { name: 'Funções SQL', fn: testDatabaseFunctions }
  ]
  
  const results = []
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      results.push({ name: test.name, success: result })
    } catch (error) {
      console.error(`❌ Erro no teste ${test.name}:`, error.message)
      results.push({ name: test.name, success: false })
    }
  }
  
  // Relatório final
  console.log('\n' + '=' * 50)
  console.log('📊 RELATÓRIO FINAL DOS TESTES')
  console.log('=' * 50)
  
  const passed = results.filter(r => r.success).length
  const total = results.length
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.name}`)
  })
  
  console.log('\n📈 RESUMO:')
  console.log(`✅ Testes aprovados: ${passed}/${total}`)
  console.log(`❌ Testes falharam: ${total - passed}/${total}`)
  console.log(`📊 Taxa de sucesso: ${Math.round((passed/total) * 100)}%`)
  
  if (passed === total) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Banco de dados está funcionando perfeitamente!')
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os erros acima.')
  }
  
  return passed === total
}

// Executar testes
runAllTests().catch(console.error)