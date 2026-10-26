import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Read before createClient, which consumes the hash. True when the user arrived from a
// "reset password" email link and should be asked for a new password.
export const isPasswordRecoveryRedirect = window.location.hash.includes('type=recovery');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});
