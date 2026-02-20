import { supabase } from '../lib/supabase';
import { Court } from '../types';

export const courtService = {
  async getAll(): Promise<Court[]> {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActive(): Promise<Court[]> {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async create(court: { name: string; capacity: number; price: number; image_url?: string }): Promise<Court> {
    const { data, error } = await supabase
      .from('courts')
      .insert({
        name: court.name,
        capacity: court.capacity,
        price: court.price,
        image_url: court.image_url,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(courtId: string, updates: { name?: string; capacity?: number; price?: number; image_url?: string }): Promise<void> {
    const { error } = await supabase
      .from('courts')
      .update(updates)
      .eq('id', courtId);

    if (error) throw error;
  },

  async deactivate(courtId: string): Promise<void> {
    const { error } = await supabase
      .from('courts')
      .update({ is_active: false })
      .eq('id', courtId);

    if (error) throw error;
  },
};
