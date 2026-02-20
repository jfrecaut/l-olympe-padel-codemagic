import { supabase } from '../lib/supabase';
import { Booking } from '../types';
import { sendUserNotification } from '../lib/emailService';

interface CreateBookingData {
  courtId: string;
  userId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  playersCount: number;
  totalAmount?: number;
  originalAmount?: number;
  promotionId?: string;
  promotionDiscount?: number;
}

interface BookingWithDetails extends Booking {
  court?: any;
  profile?: any;
  isParticipant?: boolean;
  participantStatus?: string;
  participantId?: string;
  participantsCount?: number;
  acceptedCount?: number;
}

export const bookingService = {
  async checkAndCancelExpiredBookings(): Promise<void> {
    const { error } = await supabase.rpc('check_and_cancel_my_expired_bookings');
    if (error) {
      console.error('Error checking expired bookings:', error);
    }
  },

  async create(bookingData: CreateBookingData): Promise<Booking> {
    const insertData: any = {
      court_id: bookingData.courtId,
      user_id: bookingData.userId,
      booking_date: bookingData.bookingDate,
      start_time: bookingData.startTime,
      end_time: bookingData.endTime,
      players_count: bookingData.playersCount,
      status: 'confirmed',
    };

    if (bookingData.promotionId) {
      insertData.promotion_id = bookingData.promotionId;
      insertData.promotion_discount = bookingData.promotionDiscount || 0;
      insertData.original_amount = bookingData.originalAmount || 0;
    }

    if (bookingData.totalAmount !== undefined) {
      insertData.total_amount = bookingData.totalAmount;
      insertData.payment_status = 'pending_payment';
      insertData.amount_paid = 0;
    } else {
      insertData.payment_status = 'confirmed';
      insertData.total_amount = 0;
      insertData.amount_paid = 0;
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getById(bookingId: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async updatePaymentStatus(
    bookingId: string,
    paymentStatus: 'pending_payment' | 'payment_completed' | 'payment_failed' | 'confirmed' | 'cancelled',
    amountPaid?: number
  ): Promise<void> {
    const updates: any = { payment_status: paymentStatus };
    if (amountPaid !== undefined) {
      updates.amount_paid = amountPaid;
    }

    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select();

    if (error) {
      throw error;
    }
  },

  async getUserBookings(userId: string): Promise<BookingWithDetails[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data: ownBookings, error: ownError } = await supabase
      .from('bookings')
      .select('id, court_id, user_id, booking_date, start_time, end_time, players_count, status, payment_status, total_amount, amount_paid, original_amount, promotion_id, promotion_discount, booking_code, created_by_admin, created_at, court:courts(*), profile:profiles(*), promotion:promotions(*)')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gte('booking_date', today)
      .order('booking_date')
      .order('start_time');

    if (ownError) throw ownError;

    const { data: participantBookings, error: participantError } = await supabase
      .from('booking_participants')
      .select('*, booking:bookings(id, court_id, user_id, booking_date, start_time, end_time, players_count, status, payment_status, total_amount, amount_paid, original_amount, promotion_id, promotion_discount, booking_code, created_by_admin, created_at, court:courts(*), profile:profiles(*), promotion:promotions(*))')
      .eq('user_id', userId)
      .in('status', ['pending', 'accepted'])
      .eq('booking.status', 'confirmed')
      .gte('booking.booking_date', today);

    if (participantError) throw participantError;

    const allBookings = [
      ...(ownBookings || []),
      ...(participantBookings?.filter(p => p.booking).map(p => ({
        ...p.booking,
        isParticipant: true,
        participantStatus: p.status,
        participantId: p.id,
      })) || []),
    ];

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

    const upcomingBookings = allBookings.filter((booking: any) => {
      if (booking.booking_date > today) {
        return true;
      }
      if (booking.booking_date === today) {
        return booking.end_time > currentTime;
      }
      return false;
    });

    upcomingBookings.sort((a: any, b: any) => {
      if (a.booking_date !== b.booking_date) {
        return a.booking_date.localeCompare(b.booking_date);
      }
      return a.start_time.localeCompare(b.start_time);
    });

    // Fetch all participants for all bookings in a single query (fixes N+1 problem)
    const bookingIds = upcomingBookings.map((b: any) => b.id);

    if (bookingIds.length > 0) {
      const { data: allParticipants } = await supabase
        .from('booking_participants')
        .select('booking_id, status')
        .in('booking_id', bookingIds);

      // Create a map of booking_id to participant counts
      const participantCounts = new Map<string, { total: number; accepted: number }>();

      if (allParticipants) {
        allParticipants.forEach((p: any) => {
          const counts = participantCounts.get(p.booking_id) || { total: 0, accepted: 0 };
          counts.total++;
          if (p.status === 'accepted') {
            counts.accepted++;
          }
          participantCounts.set(p.booking_id, counts);
        });
      }

      // Assign counts to bookings
      for (const booking of upcomingBookings) {
        const counts = participantCounts.get(booking.id) || { total: 0, accepted: 0 };
        booking.participantsCount = counts.total;
        booking.acceptedCount = counts.accepted;
      }
    }

    return upcomingBookings;
  },

  async countUpcomingBookings(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('count_upcoming_bookings', {
      p_user_id: userId
    });

    if (error) throw error;
    return data || 0;
  },

  async getExistingBookings(courtId: string, date: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('court_id', courtId)
      .eq('booking_date', date)
      .eq('status', 'confirmed');

    if (error) throw error;
    return data || [];
  },

  async getAllBookingsForDate(date: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_date', date)
      .eq('status', 'confirmed');

    if (error) throw error;
    return data || [];
  },

  async cancel(bookingId: string, cancelledBy: 'admin' | 'client' = 'client'): Promise<void> {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, total_amount, amount_paid')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!booking) throw new Error('Réservation non trouvée');

    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', payment_status: 'cancelled' })
      .eq('id', bookingId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!updatedBooking) throw new Error('Impossible de mettre à jour la réservation');

    if (booking.total_amount > 0 && booking.amount_paid > 0) {
      const { error: refundError } = await supabase
        .from('refunds')
        .insert({
          booking_id: booking.id,
          user_id: booking.user_id,
          amount: booking.amount_paid,
          cancelled_by: cancelledBy,
          status: 'pending',
        });

      if (refundError) {
        throw new Error(`Erreur lors de la création de la demande de remboursement: ${refundError.message}`);
      }
    }
  },

  async delete(bookingId: string): Promise<void> {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, total_amount, amount_paid')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!booking) throw new Error('Réservation non trouvée');

    if (booking.total_amount > 0 && booking.amount_paid > 0) {
      const { error: refundError } = await supabase
        .from('refunds')
        .insert({
          booking_id: booking.id,
          user_id: booking.user_id,
          amount: booking.amount_paid,
          cancelled_by: 'admin',
          status: 'pending',
        });

      if (refundError) {
        throw new Error(`Erreur lors de la création de la demande de remboursement: ${refundError.message}`);
      }
    }

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;
  },

  async sendCancellationEmails(
    booking: Booking,
    courtName: string,
    userId: string,
    userProfile: { first_name: string; last_name: string }
  ): Promise<void> {
    await sendUserNotification(userId, 'booking_cancelled', {
      court_name: courtName,
      booking_date: new Date(booking.booking_date).toLocaleDateString('fr-FR'),
      start_time: booking.start_time.slice(0, 5),
      end_time: booking.end_time.slice(0, 5),
      first_name: userProfile.first_name,
      last_name: userProfile.last_name,
    });

    const { data: bookingParticipants } = await supabase
      .from('booking_participants')
      .select('*, profile:profiles(*)')
      .eq('booking_id', booking.id);

    if (bookingParticipants) {
      for (const participant of bookingParticipants) {
        if (participant.profile) {
          await sendUserNotification(participant.user_id, 'booking_cancelled', {
            court_name: courtName,
            booking_date: new Date(booking.booking_date).toLocaleDateString('fr-FR'),
            start_time: booking.start_time.slice(0, 5),
            end_time: booking.end_time.slice(0, 5),
            first_name: participant.profile.first_name,
            last_name: participant.profile.last_name,
          });
        }
      }
    }
  },

  async sendConfirmationEmail(
    userId: string,
    courtName: string,
    bookingDate: string,
    startTime: string,
    endTime: string,
    userProfile: { first_name: string; last_name: string }
  ): Promise<void> {
    await sendUserNotification(userId, 'booking_created', {
      court_name: courtName,
      booking_date: new Date(bookingDate).toLocaleDateString('fr-FR'),
      start_time: startTime.slice(0, 5),
      end_time: endTime.slice(0, 5),
      first_name: userProfile.first_name,
      last_name: userProfile.last_name,
    });
  },
};
