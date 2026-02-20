import { supabase } from '../lib/supabase';
import { Promotion } from '../types';

export const promotionService = {
  async getActivePromotions(): Promise<Promotion[]> {
    const now = new Date().toISOString().slice(0, 19);
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAllPromotions(): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPromotionById(id: string): Promise<Promotion | null> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPromotionForCourt(courtId: string): Promise<Promotion | null> {
    const now = new Date().toISOString().slice(0, 19);
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .contains('court_ids', [courtId])
      .order('discount_value', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPromotionForBookingSlot(courtId: string, bookingDateTime: string): Promise<Promotion | null> {
    const bookingStr = bookingDateTime.slice(0, 19);
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', bookingStr)
      .gte('end_date', bookingStr)
      .contains('court_ids', [courtId])
      .order('discount_value', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createPromotion(promotion: Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<Promotion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('promotions')
      .insert({
        ...promotion,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePromotion(id: string, updates: Partial<Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'created_by'>>): Promise<Promotion> {
    const { data, error } = await supabase
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePromotion(id: string): Promise<void> {
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  calculateDiscountedPrice(originalPrice: number, promotion: Promotion): number {
    if (promotion.discount_type === 'percentage') {
      const discount = (originalPrice * promotion.discount_value) / 100;
      return Math.max(0, originalPrice - discount);
    } else {
      return Math.max(0, originalPrice - promotion.discount_value);
    }
  },

  async getArchivedPromotions(): Promise<Promotion[]> {
    const now = new Date().toISOString().slice(0, 19);
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .or(`end_date.lt.${now},is_active.eq.false`)
      .order('end_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  isPromotionActive(promotion: Promotion): boolean {
    const now = new Date();
    const currentStr = now.toISOString().slice(0, 16);
    const startStr = promotion.start_date.slice(0, 16);
    const endStr = promotion.end_date.slice(0, 16);
    return promotion.is_active && currentStr >= startStr && currentStr <= endStr;
  },

  isPromotionExpired(promotion: Promotion): boolean {
    const now = new Date();
    const currentStr = now.toISOString().slice(0, 16);
    const endStr = promotion.end_date.slice(0, 16);
    return currentStr > endStr;
  }
};
