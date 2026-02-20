import { supabase } from '../lib/supabase';
import { Holiday } from '../types';

export const holidayService = {
  async getAll(): Promise<Holiday[]> {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date');

    if (error) throw error;
    return data || [];
  },

  async create(holiday: { date: string; endDate?: string; reason: string }): Promise<Holiday> {
    const { data, error } = await supabase
      .from('holidays')
      .insert({
        date: holiday.date,
        end_date: holiday.endDate,
        reason: holiday.reason,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(holidayId: string): Promise<void> {
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', holidayId);

    if (error) throw error;
  },

  isHoliday(date: string, holidays: Holiday[]): boolean {
    return holidays.some(h => {
      const startDate = h.date;
      const endDate = h.end_date || h.date;
      return date >= startDate && date <= endDate;
    });
  },

  getHolidayForDate(date: string, holidays: Holiday[]): Holiday | undefined {
    return holidays.find(h => {
      const startDate = h.date;
      const endDate = h.end_date || h.date;
      return date >= startDate && date <= endDate;
    });
  },
};
