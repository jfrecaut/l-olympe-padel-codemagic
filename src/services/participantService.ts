import { supabase } from '../lib/supabase';

export const participantService = {
  async getByBooking(bookingId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('booking_participants')
      .select('*, profile:profiles(*)')
      .eq('booking_id', bookingId)
      .order('created_at');

    if (error) throw error;
    return data || [];
  },

  async add(bookingId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('booking_participants')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        status: 'pending',
      });

    if (error) throw error;
  },

  async remove(participantId: string): Promise<void> {
    const { error } = await supabase
      .from('booking_participants')
      .delete()
      .eq('id', participantId);

    if (error) throw error;
  },

  async updateStatus(participantId: string, status: 'pending' | 'accepted' | 'declined'): Promise<void> {
    const { error } = await supabase
      .from('booking_participants')
      .update({ status })
      .eq('id', participantId);

    if (error) throw error;
  },

  async accept(participantId: string): Promise<void> {
    await this.updateStatus(participantId, 'accepted');
  },

  async decline(participantId: string): Promise<void> {
    await this.updateStatus(participantId, 'declined');
  },
};
