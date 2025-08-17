import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

// Check if the URL is still using placeholder values
if (supabaseUrl.includes('your-project-id') || supabaseUrl === 'your_supabase_project_url') {
  throw new Error(
    'Please replace the placeholder Supabase URL in your .env file with your actual Supabase project URL (https://your-project-id.supabase.co)'
  )
}

if (supabaseAnonKey.includes('your_supabase_anon_key') || supabaseAnonKey === 'your_supabase_anon_key') {
  throw new Error(
    'Please replace the placeholder Supabase anonymous key in your .env file with your actual Supabase anonymous key'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)