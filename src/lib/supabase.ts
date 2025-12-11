import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

// Fallback to placeholders if env vars are missing to prevent crash during dev
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
