import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please create a .env file in the project root with:\nVITE_SUPABASE_URL=your_actual_supabase_url\nVITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key'
  )
}

// Check if the URL is still using placeholder values
if (supabaseUrl.includes('your-project-id') || supabaseUrl === 'your_supabase_project_url' || supabaseUrl.includes('your_supabase_project_url')) {
  throw new Error(
    'Please replace the placeholder Supabase URL in your .env file with your actual Supabase project URL.\nExample: VITE_SUPABASE_URL=https://your-project-id.supabase.co'
  )
}

if (supabaseAnonKey.includes('your_supabase_anon_key') || supabaseAnonKey === 'your_supabase_anon_key' || supabaseAnonKey.length < 100) {
  throw new Error(
    'Please replace the placeholder Supabase anonymous key in your .env file with your actual Supabase anonymous key.\nExample: VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  )
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (error) {
  throw new Error(
    `Invalid Supabase URL format: ${supabaseUrl}\nPlease ensure your VITE_SUPABASE_URL is a valid URL like: https://your-project-id.supabase.co`
  )
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey)