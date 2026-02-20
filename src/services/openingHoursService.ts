import { supabase } from '../lib/supabase';
import { OpeningHours } from '../types';

export const openingHoursService = {
  async getAll(): Promise<OpeningHours[]> {
    const { data, error } = await supabase
      .from('opening_hours')
      .select('*')
      .order('day_of_week');

    if (error) throw error;

    if (!data) return [];

    return data.sort((a, b) => {
      const dayA = a.day_of_week === 0 ? 7 : a.day_of_week;
      const dayB = b.day_of_week === 0 ? 7 : b.day_of_week;
      return dayA - dayB;
    });
  },

  async update(dayOfWeek: number, updates: Partial<OpeningHours>): Promise<void> {
    const { error } = await supabase
      .from('opening_hours')
      .update(updates)
      .eq('day_of_week', dayOfWeek);

    if (error) throw error;
  },
};
