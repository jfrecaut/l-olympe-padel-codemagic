import { supabase } from '../lib/supabase';
import { Settings } from '../types';

export const settingsService = {
  async get(): Promise<Settings | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async update(updates: Partial<Settings>): Promise<void> {
    const { error } = await supabase
      .from('settings')
      .update(updates)
      .eq('id', 1);

    if (error) throw error;
  },
};
