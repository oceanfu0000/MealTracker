import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

export type QuickItem = Database['public']['Tables']['quick_items']['Row'];

export const QuickItemService = {
    async getQuickItems(userId: string) {
        const { data, error } = await supabase
            .from('quick_items')
            .select('*')
            .eq('user_id', userId)
            .order('name');

        if (error) {
            console.error('Error fetching quick items:', error);
            return [];
        }
        return data || [];
    },

    async createQuickItem(item: Omit<QuickItem, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('quick_items')
            .insert(item as any) // suppress TS error for omitted fields on insert if needed, or precise type
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
