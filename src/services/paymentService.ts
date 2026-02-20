import { supabase } from '../lib/supabase';
import { PaymentLog } from '../types';

export const paymentService = {
  async createPaymentIntent(data: {
    bookingId: string;
    userId: string;
    amount: number;
    paymentType: 'partial' | 'full';
    metadata?: Record<string, any>;
  }): Promise<{ clientSecret: string; paymentLogId: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment intent');
    }

    const result = await response.json();
    return result;
  },

  async confirmPayment(paymentLogId: string): Promise<void> {
    const { error } = await supabase
      .from('payment_logs')
      .update({ status: 'succeeded' })
      .eq('id', paymentLogId);

    if (error) throw error;
  },

  async getPaymentLogs(bookingId?: string): Promise<PaymentLog[]> {
    let query = supabase
      .from('payment_logs')
      .select('*, booking:bookings(*, court:courts(*)), profile:profiles(*)')
      .order('created_at', { ascending: false });

    if (bookingId) {
      query = query.eq('booking_id', bookingId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getAllPaymentLogs(limit: number = 50): Promise<PaymentLog[]> {
    const { data, error } = await supabase
      .from('payment_logs')
      .select('*, booking:bookings(*, court:courts(*)), profile:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getFilteredPaymentLogs(filters: {
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
    userSearch?: string;
    courtId?: string;
    status?: string;
  }): Promise<{ data: PaymentLog[]; count: number }> {
    const { page, pageSize, startDate, endDate, userSearch, courtId, status } = filters;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let userIds: string[] | undefined;

    if (userSearch && userSearch.trim()) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .or(`first_name.ilike.%${userSearch}%,last_name.ilike.%${userSearch}%,username.ilike.%${userSearch}%`);

      if (users && users.length > 0) {
        userIds = users.map(u => u.id);
      } else {
        return { data: [], count: 0 };
      }
    }

    let query = supabase
      .from('payment_logs')
      .select('*, booking:bookings(*, court:courts(*)), profile:profiles(*)', { count: 'exact' });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDateTime.toISOString());
    }

    if (userIds) {
      query = query.in('user_id', userIds);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (courtId) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('court_id', courtId);

      if (bookings && bookings.length > 0) {
        const bookingIds = bookings.map(b => b.id);
        query = query.in('booking_id', bookingIds);
      } else {
        return { data: [], count: 0 };
      }
    }

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  },

  async getUserPaymentLogs(userId: string): Promise<PaymentLog[]> {
    const { data, error } = await supabase
      .from('payment_logs')
      .select('*, booking:bookings(*, court:courts(*)), profile:profiles(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updatePaymentStatus(
    paymentLogId: string,
    status: 'pending' | 'succeeded' | 'failed' | 'refunded',
    errorMessage?: string
  ): Promise<void> {
    const updates: any = { status };
    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('payment_logs')
      .update(updates)
      .eq('id', paymentLogId)
      .select();

    if (error) {
      throw error;
    }
  },
};
