export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    updated_at: string | null
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    target_calories: number
                    target_protein: number
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    target_calories?: number
                    target_protein?: number
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    target_calories?: number
                    target_protein?: number
                }
            }
            meal_logs: {
                Row: {
                    id: string
                    user_id: string
                    created_at: string
                    name: string
                    calories: number
                    protein: number
                    carbs: number
                    fat: number
                    image_url: string | null
                    notes: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    created_at?: string
                    name: string
                    calories: number
                    protein: number
                    carbs?: number
                    fat?: number
                    image_url?: string | null
                    notes?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    created_at?: string
                    name?: string
                    calories?: number
                    protein?: number
                    carbs?: number
                    fat?: number
                    image_url?: string | null
                    notes?: string | null
                }
            }
            quick_items: {
                Row: {
                    id: string
                    user_id: string
                    created_at: string
                    name: string
                    default_calories: number
                    default_protein: number
                    default_unit: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    created_at?: string
                    name: string
                    default_calories: number
                    default_protein: number
                    default_unit?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    created_at?: string
                    name?: string
                    default_calories?: number
                    default_protein?: number
                    default_unit?: string
                }
            }
        }
    }
}
