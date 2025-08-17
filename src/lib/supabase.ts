import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file:\n\n' +
    '1. Create a .env file in the project root if it doesn\'t exist\n' +
    '2. Add these lines with your actual Supabase values:\n' +
    '   VITE_SUPABASE_URL=https://your-project-id.supabase.co\n' +
    '   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n' +
    '3. Restart your development server (npm run dev)\n\n' +
    'Get these values from: https://app.supabase.com/project/your-project/settings/api'
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
    'Invalid Supabase URL in your .env file. Please update it with your actual project URL:\n\n' +
    'VITE_SUPABASE_URL=https://your-project-id.supabase.co\n\n' +
    'Current value: ' + supabaseUrl + '\n\n' +
    'Find your project URL at: https://app.supabase.com/project/your-project/settings/api'
  )
}

if (supabaseAnonKey.includes('your_supabase_anon_key') || 
    supabaseAnonKey === 'your_supabase_anon_key' || 
    supabaseAnonKey.length < 100 ||
    !supabaseAnonKey.startsWith('eyJ')) {
  throw new Error(
    'Invalid Supabase anonymous key in your .env file. Please update it:\n\n' +
    'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n\n' +
    'The key should:\n' +
    '- Start with "eyJ"\n' +
    '- Be over 100 characters long\n' +
    '- Be your actual anon/public key from Supabase\n\n' +
    'Find your anon key at: https://app.supabase.com/project/your-project/settings/api'
  )
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (error) {
  throw new Error(
    `Invalid Supabase URL format: ${supabaseUrl}\n\n` +
    'Please ensure your VITE_SUPABASE_URL is a valid URL like:\n' +
    'https://your-project-id.supabase.co\n\n' +
    'Check your .env file and restart the development server.'
  )
}

// Test connection on initialization
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('usuarios').select('count').limit(1)
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message)
      console.log('💡 Check your Supabase configuration:')
      console.log('   - Project URL:', supabaseUrl)
      console.log('   - Key length:', supabaseAnonKey.length, 'characters')
      console.log('   - Visit: https://app.supabase.com/project/your-project/settings/api')
    } else {
      console.log('✅ Supabase connection successful')
    }
  } catch (fetchError) {
    console.error('❌ Network error connecting to Supabase:', fetchError.message)
    console.log('💡 Possible issues:')
    console.log('   - Check your internet connection')
    console.log('   - Verify Supabase project is active')
    console.log('   - Confirm URL and key are correct')
  }
}

// Run connection test (non-blocking)
testConnection()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)