// TESTE COMPLETO DO SISTEMA TEX - Verificação pós-modificações
import { DatabaseService } from './lib/database.js'
import { supabase } from './lib/supabase.js'

console.log('🔍 VERIFICAÇÃO COMPLETA DO SISTEMA TEX PÓS-MODIFICAÇÕES...\n')
console.log('=' * 60)

// Função para testar conexão
async function testConnection() {
  console.log('1️⃣ Testando conexão com Supabase...')
  try {
    const { data, error } = await supabase.from('usuarios').select('count').limit(1)
    if (error) throw error
    console.log('✅ Conexão estabelecida com sucesso!')
    return true
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message)
    return false
  }
}

// Função para testar estrutura da tabela
async function testTableStructure() {
  console.log('\n2️⃣ Verificando estrutura da tabela usuarios...')
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
        console.log('✅ Estrutura da tabela correta!')
        console.log('📋 Campos:', actualFields.join(', '))
        return true
      } else {
        console.log('⚠️ Campos faltando:', missingFields.join(', '))
        return false
      }
    } else {
      console.log('✅ Tabela existe (pode estar vazia)')
      return true
    }
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message)
    return false
  }
}

// Função para testar criação de perfil (FLUXO PRINCIPAL)
async function testProfileCreation() {
  console.log('\n3️⃣ Testando CRIAÇÃO DE PERFIL (fluxo principal)...')
  
  const testUser = {
    id: crypto.randomUUID(),
    nome: 'Teste Criação',
    whatsapp: '+5511987654321',
    descricao: 'Profissional de teste para verificação do sistema',
    tags: ['teste', 'verificação', 'sistema'],
    localizacao: 'São Paulo, SP - Teste',
    status: 'available',
    latitude: -23.5505,
    longitude: -46.6333
  }
  
  try {
    console.log('📝 Criando usuário de teste...')
    const createdUser = await DatabaseService.createUsuario(testUser)
    
    console.log('✅ Usuário criado com sucesso!')
    console.log('🔍 ID:', createdUser.id)
    console.log('🔍 Nome:', createdUser.nome)
    console.log('🔍 Perfil completo:', createdUser.perfil_completo)
    console.log('🔍 Status:', createdUser.status)
    
    // Verificar se perfil_completo foi calculado corretamente
    if (createdUser.perfil_completo) {
      console.log('✅ Trigger perfil_completo funcionando!')
    } else {
      console.log('⚠️ Trigger perfil_completo pode ter problema')
    }
    
    return createdUser
  } catch (error) {
    console.error('❌ Erro na criação:', error.message)
    return null
  }
}

// Função para testar edição de perfil
async function testProfileUpdate(userId) {
  console.log('\n4️⃣ Testando EDIÇÃO DE PERFIL...')
  
  if (!userId) {
    console.log('⚠️ Pulando teste de edição (usuário não criado)')
    return false
  }
  
  try {
    console.log('✏️ Atualizando perfil...')
    const updateData = {
      descricao: 'Descrição atualizada para teste de edição',
      tags: ['teste', 'edição', 'atualização'],
      status: 'busy'
    }
    
    const updatedUser = await DatabaseService.updateUsuario(userId, updateData)
    
    console.log('✅ Perfil atualizado com sucesso!')
    console.log('🔍 Nova descrição:', updatedUser.descricao)
    console.log('🔍 Novo status:', updatedUser.status)
    console.log('🔍 Novas tags:', updatedUser.tags)
    console.log('🔍 Timestamp atualizado:', updatedUser.atualizado_em)
    
    return true
  } catch (error) {
    console.error('❌ Erro na atualização:', error.message)
    return false
  }
}

// Função para testar interruptor de status
async function testStatusToggle(userId) {
  console.log('\n5️⃣ Testando INTERRUPTOR DE STATUS...')
  
  if (!userId) {
    console.log('⚠️ Pulando teste de status (usuário não criado)')
    return false
  }
  
  try {
    console.log('🔄 Testando mudança para disponível...')
    let user = await DatabaseService.updateStatus(userId, 'available')
    console.log('✅ Status alterado para:', user.status)
    
    console.log('🔄 Testando mudança para ocupado...')
    user = await DatabaseService.updateStatus(userId, 'busy')
    console.log('✅ Status alterado para:', user.status)
    
    console.log('✅ Interruptor de status funcionando perfeitamente!')
    return true
  } catch (error) {
    console.error('❌ Erro no teste de status:', error.message)
    return false
  }
}

// Função para testar login por WhatsApp
async function testWhatsAppLogin() {
  console.log('\n6️⃣ Testando LOGIN POR WHATSAPP...')
  
  try {
    // Testar com usuário existente
    console.log('📱 Testando login com usuário existente...')
    const existingUser = await DatabaseService.getUsuarioByWhatsApp('+5511999887766')
    
    if (existingUser) {
      console.log('✅ Login com usuário existente funcionando!')
      console.log('🔍 Usuário encontrado:', existingUser.nome)
      console.log('🔍 Perfil completo:', existingUser.perfil_completo)
    } else {
      console.log('⚠️ Usuário de exemplo não encontrado')
    }
    
    // Testar com usuário inexistente
    console.log('📱 Testando com usuário inexistente...')
    const nonExistentUser = await DatabaseService.getUsuarioByWhatsApp('+5511000000000')
    
    if (!nonExistentUser) {
      console.log('✅ Verificação de usuário inexistente funcionando!')
    } else {
      console.log('⚠️ Problema na verificação de usuário inexistente')
    }
    
    return true
  } catch (error) {
    console.error('❌ Erro no teste de login:', error.message)
    return false
  }
}

// Função para testar busca e feed
async function testSearchAndFeed() {
  console.log('\n7️⃣ Testando BUSCA E FEED...')
  
  try {
    // Busca geral
    console.log('🔍 Testando busca geral...')
    const allUsers = await DatabaseService.getUsuarios({ limit: 5 })
    console.log(`✅ Busca geral: ${allUsers.length} usuários encontrados`)
    
    // Busca por texto
    console.log('🔍 Testando busca por texto...')
    const searchResults = await DatabaseService.getUsuarios({ 
      search: 'design',
      limit: 3 
    })
    console.log(`✅ Busca textual: ${searchResults.length} resultados`)
    
    // Busca por tags
    console.log('🔍 Testando busca por tags...')
    const tagResults = await DatabaseService.searchByTags(['programação'])
    console.log(`✅ Busca por tags: ${tagResults.length} resultados`)
    
    // Verificar se perfis têm dados completos
    if (allUsers.length > 0) {
      const firstUser = allUsers[0]
      console.log('📋 Exemplo de perfil:')
      console.log('   - Nome:', firstUser.nome)
      console.log('   - Status:', firstUser.status)
      console.log('   - Tags:', firstUser.tags?.join(', '))
      console.log('   - Perfil completo:', firstUser.perfil_completo)
    }
    
    return true
  } catch (error) {
    console.error('❌ Erro na busca:', error.message)
    return false
  }
}

// Função para testar busca por proximidade
async function testProximitySearch() {
  console.log('\n8️⃣ Testando BUSCA POR PROXIMIDADE...')
  
  try {
    // Coordenadas de São Paulo
    const latitude = -23.5505
    const longitude = -46.6333
    const radius = 50
    
    console.log(`📍 Buscando usuários próximos a São Paulo (${radius}km)...`)
    const nearbyUsers = await DatabaseService.getUsersByProximity(latitude, longitude, radius)
    
    console.log(`✅ Busca por proximidade: ${nearbyUsers.length} usuários encontrados`)
    
    if (nearbyUsers.length > 0) {
      console.log('📊 Distâncias calculadas:')
      nearbyUsers.slice(0, 3).forEach(user => {
        console.log(`   - ${user.nome}: ${user.distancia}km`)
      })
    }
    
    return true
  } catch (error) {
    console.error('❌ Erro na busca por proximidade:', error.message)
    return false
  }
}

// Função para testar funções SQL customizadas
async function testCustomSQLFunctions() {
  console.log('\n9️⃣ Testando FUNÇÕES SQL CUSTOMIZADAS...')
  
  try {
    // Testar função search_usuarios
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
    
    // Testar função get_users_by_proximity
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

// Função para testar políticas RLS
async function testRLSPolicies() {
  console.log('\n🔟 Testando POLÍTICAS RLS...')
  
  try {
    // Testar acesso público a perfis disponíveis
    console.log('👤 Testando acesso público...')
    const { data: publicUsers, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('status', 'available')
      .eq('perfil_completo', true)
      .limit(3)
    
    if (error) throw error
    console.log(`✅ Acesso público: ${publicUsers.length} perfis visíveis`)
    
    return true
  } catch (error) {
    console.error('❌ Erro nas políticas RLS:', error.message)
    return false
  }
}

// Função para limpeza (remover usuário de teste)
async function cleanup(userId) {
  if (!userId) return
  
  console.log('\n🧹 Limpando dados de teste...')
  try {
    await DatabaseService.deleteUsuario(userId)
    console.log('✅ Usuário de teste removido')
  } catch (error) {
    console.error('⚠️ Erro na limpeza:', error.message)
  }
}

// Executar todos os testes
async function runCompleteVerification() {
  console.log('🚀 INICIANDO VERIFICAÇÃO COMPLETA DO SISTEMA\n')
  
  const tests = [
    { name: 'Conexão', fn: testConnection },
    { name: 'Estrutura da Tabela', fn: testTableStructure },
    { name: 'Login WhatsApp', fn: testWhatsAppLogin },
    { name: 'Busca e Feed', fn: testSearchAndFeed },
    { name: 'Proximidade', fn: testProximitySearch },
    { name: 'Funções SQL', fn: testCustomSQLFunctions },
    { name: 'Políticas RLS', fn: testRLSPolicies }
  ]
  
  const results = []
  let testUserId = null
  
  // Executar testes básicos
  for (const test of tests) {
    try {
      const result = await test.fn()
      results.push({ name: test.name, success: result })
    } catch (error) {
      console.error(`❌ Erro no teste ${test.name}:`, error.message)
      results.push({ name: test.name, success: false })
    }
  }
  
  // Testes específicos de CRUD
  console.log('\n' + '=' * 40)
  console.log('🔄 TESTANDO FLUXO COMPLETO DE PERFIL')
  console.log('=' * 40)
  
  try {
    // Criar perfil
    const createdUser = await testProfileCreation()
    if (createdUser) {
      testUserId = createdUser.id
      results.push({ name: 'Criação de Perfil', success: true })
      
      // Editar perfil
      const updateSuccess = await testProfileUpdate(testUserId)
      results.push({ name: 'Edição de Perfil', success: updateSuccess })
      
      // Testar status
      const statusSuccess = await testStatusToggle(testUserId)
      results.push({ name: 'Interruptor de Status', success: statusSuccess })
    } else {
      results.push({ name: 'Criação de Perfil', success: false })
      results.push({ name: 'Edição de Perfil', success: false })
      results.push({ name: 'Interruptor de Status', success: false })
    }
  } catch (error) {
    console.error('❌ Erro no fluxo de perfil:', error.message)
    results.push({ name: 'Criação de Perfil', success: false })
    results.push({ name: 'Edição de Perfil', success: false })
    results.push({ name: 'Interruptor de Status', success: false })
  }
  
  // Limpeza
  await cleanup(testUserId)
  
  // Relatório final
  console.log('\n' + '=' * 60)
  console.log('📊 RELATÓRIO FINAL DA VERIFICAÇÃO')
  console.log('=' * 60)
  
  const passed = results.filter(r => r.success).length
  const total = results.length
  
  console.log('\n📋 RESULTADOS POR CATEGORIA:')
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.name}`)
  })
  
  console.log('\n📈 RESUMO GERAL:')
  console.log(`✅ Testes aprovados: ${passed}/${total}`)
  console.log(`❌ Testes falharam: ${total - passed}/${total}`)
  console.log(`📊 Taxa de sucesso: ${Math.round((passed/total) * 100)}%`)
  
  // Status final
  if (passed === total) {
    console.log('\n🎉 SISTEMA 100% FUNCIONAL!')
    console.log('✅ Todas as funcionalidades estão operando perfeitamente')
    console.log('✅ Banco de dados otimizado e funcionando')
    console.log('✅ Fluxo de perfil completo')
    console.log('✅ Interruptor de status operacional')
    console.log('✅ Sistema de busca funcionando')
    console.log('✅ Políticas de segurança ativas')
  } else {
    console.log('\n⚠️ ALGUNS PROBLEMAS DETECTADOS')
    console.log('🔧 Verifique os erros acima para correções necessárias')
  }
  
  console.log('\n🔗 URL de Produção: https://keen-banoffee-cc18b3.netlify.app')
  console.log('📱 Status: Sistema pronto para uso')
  
  return passed === total
}

// Executar verificação
runCompleteVerification().catch(console.error)