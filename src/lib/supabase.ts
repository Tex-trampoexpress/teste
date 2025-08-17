import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '🔥 ERRO CRÍTICO: Variáveis do Supabase não configuradas!\n\n' +
    '❌ O sistema não pode funcionar sem configuração do banco de dados.\n\n' +
    '✅ SOLUÇÃO:\n' +
    '1. Configure seu arquivo .env com as credenciais reais do Supabase\n' +
    '2. VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co\n' +
    '3. VITE_SUPABASE_ANON_KEY=sua_chave_real\n' +
    '4. Reinicie o servidor: npm run dev\n\n' +
    '🔗 Obtenha as credenciais em: https://app.supabase.com/project/seu-projeto/settings/api'
  )
}

// Check if the URL is still using placeholder values or common mistakes
if (supabaseUrl.includes('your-project-id') || 
    supabaseUrl === 'your_supabase_project_url' || 
    supabaseUrl.includes('your_supabase_project_url') ||
    supabaseUrl.includes('localhost') ||
    supabaseUrl.includes('127.0.0.1') ||
    !supabaseUrl.includes('.supabase.co')) {
  throw new Error(
    '🔥 ERRO: URL do Supabase inválida!\n\n' +
    '❌ URL atual: ' + supabaseUrl + '\n\n' +
    '✅ CORRIJA AGORA:\n' +
    'VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co\n\n' +
    '🔗 Encontre sua URL em: https://app.supabase.com/project/seu-projeto/settings/api'
  )
}

if (supabaseAnonKey.includes('your_supabase_anon_key') || 
    supabaseAnonKey === 'your_supabase_anon_key' || 
    supabaseAnonKey.length < 100 ||
    !supabaseAnonKey.startsWith('eyJ')) {
  throw new Error(
    '🔥 ERRO: Chave do Supabase inválida!\n\n' +
    '❌ A chave deve:\n' +
    '- Começar com "eyJ"\n' +
    '- Ter mais de 100 caracteres\n' +
    '- Ser sua chave real do Supabase\n\n' +
    '✅ CORRIJA AGORA:\n' +
    'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n\n' +
    '🔗 Encontre sua chave em: https://app.supabase.com/project/seu-projeto/settings/api'
  )
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (error) {
  throw new Error(
    `🔥 ERRO: Formato de URL inválido: ${supabaseUrl}\n\n` +
    '✅ FORMATO CORRETO:\n' +
    'https://seu-projeto-id.supabase.co\n\n' +
    '🔧 Verifique seu arquivo .env e reinicie o servidor.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection on initialization
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('usuarios').select('count').limit(1)
    if (error) {
      console.error('🔥 FALHA NA CONEXÃO COM SUPABASE:', error.message)
      console.error('❌ O sistema não pode funcionar sem banco de dados!')
      console.error('🔧 Verifique sua configuração:')
      console.error('   - URL do projeto:', supabaseUrl)
      console.error('   - Tamanho da chave:', supabaseAnonKey.length, 'caracteres')
      console.error('   - Acesse: https://app.supabase.com/project/seu-projeto/settings/api')
    } else {
      console.log('✅ CONEXÃO COM SUPABASE ESTABELECIDA - SISTEMA OPERACIONAL')
    }
  } catch (fetchError) {
    console.error('🔥 ERRO DE REDE COM SUPABASE:', fetchError.message)
    console.error('❌ SISTEMA INOPERANTE!')
    console.error('🔧 Possíveis problemas:')
    console.error('   - Verifique sua conexão com a internet')
    console.error('   - Confirme se o projeto Supabase está ativo')
    console.error('   - Verifique se URL e chave estão corretos')
  }
}

// Run connection test (non-blocking)
testConnection()