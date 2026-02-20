import { supabase } from '../lib/supabase';
import { Refund } from '../types';

export const refundService = {
  async getAll(): Promise<Refund[]> {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(
          id,
          booking_date,
          start_time,
          end_time,
          total_amount,
          amount_paid,
          created_at,
          court:courts(name)
        ),
        profile:profiles!refunds_user_id_fkey(
          id,
          username,
          first_name,
          last_name
        ),
        reviewer:profiles!refunds_reviewed_by_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPending(): Promise<Refund[]> {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(
          id,
          booking_date,
          start_time,
          end_time,
          total_amount,
          amount_paid,
          created_at,
          court:courts(name)
        ),
        profile:profiles!refunds_user_id_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getArchived(): Promise<Refund[]> {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(
          id,
          booking_date,
          start_time,
          end_time,
          total_amount,
          amount_paid,
          created_at,
          court:courts(name)
        ),
        profile:profiles!refunds_user_id_fkey(
          id,
          username,
          first_name,
          last_name
        ),
        reviewer:profiles!refunds_reviewed_by_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(refund: {
    booking_id: string;
    user_id: string;
    amount: number;
    cancelled_by: 'admin' | 'client';
  }): Promise<Refund> {
    const { data, error } = await supabase
      .from('refunds')
      .insert({
        booking_id: refund.booking_id,
        user_id: refund.user_id,
        amount: refund.amount,
        cancelled_by: refund.cancelled_by,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async approve(refundId: string, reviewerId: string): Promise<void> {
    const { error } = await supabase
      .from('refunds')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (error) throw error;
  },

  async reject(refundId: string, reviewerId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('refunds')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (error) throw error;
  },

  async updateStripeRefundId(refundId: string, stripeRefundId: string): Promise<void> {
    const { error } = await supabase
      .from('refunds')
      .update({
        stripe_refund_id: stripeRefundId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (error) throw error;
  },

  async getByBookingId(bookingId: string): Promise<Refund | null> {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
