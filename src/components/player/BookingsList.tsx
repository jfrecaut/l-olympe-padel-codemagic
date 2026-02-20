import { Clock } from 'lucide-react';
import { Booking, Settings } from '../../types';
import { BookingCard } from './BookingCard';

interface BookingsListProps {
  bookings: any[];
  currentUserId: string;
  settings: Settings | null;
  error?: string;
  success?: string;
  onManageParticipants: (booking: any) => void;
  onCancelBooking: (bookingId: string) => void;
  onAcceptParticipation: (participantId: string) => void;
  onDeclineParticipation: (participantId: string) => void;
  onPayBooking?: (booking: any) => void;
}

export function BookingsList({
  bookings,
  currentUserId,
  settings,
  error,
  success,
  onManageParticipants,
  onCancelBooking,
  onAcceptParticipation,
  onDeclineParticipation,
  onPayBooking,
}: BookingsListProps) {
  const canCancelBooking = (booking: Booking): boolean => {
    if (!settings || booking.status === 'cancelled') return false;

    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilBooking >= settings.cancellation_hours;
  };

  return (
    <div className="bg-neutral-900 rounded-xl shadow-lg p-6 border border-neutral-800">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Clock className="text-[#c4ab63]" size={24} />
        Vos réservations
      </h2>

      {error && (
        <div className="mb-4 bg-red-900/30 text-red-300 px-4 py-3 rounded-lg text-sm border border-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-[#866733]/30 text-[#ecd88e] px-4 py-3 rounded-lg text-sm border border-[#866733]">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-neutral-400 text-center py-8">Aucune réservation à venir</p>
        ) : (
          bookings.map((booking: any) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              currentUserId={currentUserId}
              canCancel={canCancelBooking(booking)}
              paymentTimeoutHours={settings?.payment_timeout_hours || 1}
              onManageParticipants={
                booking.user_id === currentUserId && booking.status === 'confirmed'
                  ? () => onManageParticipants(booking)
                  : undefined
              }
              onCancel={
                booking.user_id === currentUserId && booking.status === 'confirmed' && canCancelBooking(booking)
                  ? () => onCancelBooking(booking.id)
                  : undefined
              }
              onAcceptParticipation={
                booking.isParticipant && booking.participantStatus === 'pending'
                  ? () => onAcceptParticipation(booking.participantId)
                  : undefined
              }
              onDeclineParticipation={
                booking.isParticipant
                  ? () => onDeclineParticipation(booking.participantId)
                  : undefined
              }
              onPayBooking={
                booking.user_id === currentUserId &&
                (booking.payment_status === 'pending_payment' || booking.payment_status === 'payment_failed' || booking.payment_status === 'partial_payment_completed') &&
                onPayBooking
                  ? () => onPayBooking(booking)
                  : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
