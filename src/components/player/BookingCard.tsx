import { Calendar, Clock, Users, UserCog, X, Check, CreditCard, AlertCircle, Timer, Hash, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Booking } from '../../types';

interface BookingCardProps {
  booking: any;
  currentUserId: string;
  canCancel: boolean;
  paymentTimeoutHours?: number;
  onManageParticipants?: () => void;
  onCancel?: () => void;
  onAcceptParticipation?: () => void;
  onDeclineParticipation?: () => void;
  onPayBooking?: () => void;
}

export function BookingCard({
  booking,
  currentUserId,
  canCancel,
  paymentTimeoutHours = 1,
  onManageParticipants,
  onCancel,
  onAcceptParticipation,
  onDeclineParticipation,
  onPayBooking,
}: BookingCardProps) {
  const isCreator = booking.user_id === currentUserId;
  const isParticipant = booking.isParticipant;
  const needsPayment = isCreator && !booking.created_by_admin && (booking.payment_status === 'pending_payment' || booking.payment_status === 'payment_failed' || booking.payment_status === 'partial_payment_completed');
  const canBeAutoCancelled = isCreator && !booking.created_by_admin && (booking.payment_status === 'pending_payment' || booking.payment_status === 'payment_failed');
  const hasAmount = booking.total_amount !== null && booking.total_amount !== undefined && booking.total_amount > 0;

  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!canBeAutoCancelled || !hasAmount || booking.created_by_admin) {
      return;
    }

    const calculateTimeRemaining = () => {
      const createdAt = new Date(booking.created_at);
      const expiresAt = new Date(createdAt.getTime() + paymentTimeoutHours * 60 * 60 * 1000);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Expiré');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [canBeAutoCancelled, hasAmount, booking.created_at, booking.created_by_admin, paymentTimeoutHours]);

  const getPaymentStatusBadge = () => {
    if (!hasAmount) return null;
    if (booking.created_by_admin) return null;

    switch (booking.payment_status) {
      case 'pending_payment':
        return (
          <span className="text-xs px-2 py-1 bg-yellow-900/40 text-yellow-300 border border-yellow-700 rounded flex items-center gap-1">
            <AlertCircle size={12} />
            Paiement en attente
          </span>
        );
      case 'payment_failed':
        return (
          <span className="text-xs px-2 py-1 bg-red-900/40 text-red-300 border border-red-700 rounded flex items-center gap-1">
            <AlertCircle size={12} />
            Paiement échoué
          </span>
        );
      case 'partial_payment_completed':
        return (
          <span className="text-xs px-2 py-1 bg-teal-900/40 text-teal-300 border border-teal-700 rounded flex items-center gap-1">
            <Check size={12} />
            Paiement partiel effectué
          </span>
        );
      case 'payment_completed':
        return (
          <span className="text-xs px-2 py-1 bg-green-900/40 text-green-300 border border-green-700 rounded flex items-center gap-1">
            <Check size={12} />
            Payé
          </span>
        );
      default:
        return null;
    }
  };

  const getCardStyle = () => {
    if (booking.status === 'cancelled') return 'border-red-800 bg-red-900/20';
    if (isParticipant) return 'border-blue-700 bg-blue-900/20';
    if (hasAmount && !booking.created_by_admin) {
      switch (booking.payment_status) {
        case 'pending_payment':
          return 'border-yellow-700 bg-yellow-900/20';
        case 'payment_failed':
          return 'border-red-800 bg-red-900/20';
        case 'partial_payment_completed':
          return 'border-teal-700 bg-teal-900/20';
        case 'payment_completed':
          return 'border-green-700 bg-green-900/20';
      }
    }
    return 'border-neutral-700 bg-neutral-800/50';
  };

  return (
    <div
      className={`border rounded-lg p-4 hover:shadow-md transition ${getCardStyle()}`}
    >
      <div className="flex flex-col">
        <div className="flex-1">
          {booking.booking_code && (
            <div className="mb-3 bg-black rounded-lg p-3 border border-neutral-700">
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-neutral-400" />
                <div>
                  <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">
                    Code de réservation
                  </p>
                  <p className="text-base font-mono font-bold text-white tracking-widest">
                    {booking.booking_code}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white">
              {booking.court?.name}
            </h3>
            {booking.status === 'cancelled' && (
              <span className="text-xs px-2 py-1 bg-red-900/40 text-red-300 border border-red-700 rounded">
                Annulée
              </span>
            )}
            {isParticipant && (
              <span className="text-xs px-2 py-1 bg-blue-900/40 text-blue-300 border border-blue-700 rounded">
                Participant {booking.participantStatus === 'pending' ? '(en attente)' : '(accepté)'}
              </span>
            )}
            {isCreator && (
              <span className="text-xs px-2 py-1 bg-gradient-to-r from-[#866733]/50 to-[#c4ab63]/50 text-[#ecd88e] border border-[#866733] rounded shadow-md shadow-[#866733]/30">
                Organisateur
              </span>
            )}
            {getPaymentStatusBadge()}
          </div>
          {isParticipant && booking.profile && (
            <p className="text-xs text-neutral-400 mt-1">
              Organisé par: {booking.profile.first_name} {booking.profile.last_name} (@{booking.profile.username})
            </p>
          )}
          <div className="mt-2 space-y-1 text-sm text-neutral-300">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              {new Date(booking.booking_date).toLocaleDateString('fr-FR')}
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              {booking.court?.capacity === 2 ? 'Terrain simple' : 'Terrain double'}
            </div>
            {booking.total_amount !== null && booking.total_amount !== undefined && (
              <div className="space-y-2 mt-3 p-3 bg-black/40 rounded-lg border border-neutral-700">
                {booking.court && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">Prix du terrain:</span>
                    <span className="text-sm font-semibold text-neutral-200">
                      {(booking.court.price / 100).toFixed(2)} €
                    </span>
                  </div>
                )}

                {((booking.promotion_id && booking.promotion_discount_amount !== null && booking.promotion_discount_amount > 0) ||
                  (booking.court && booking.court.price > booking.total_amount)) && (
                  <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-300 flex items-center gap-1">
                        <Tag size={14} />
                        Promotion:
                      </span>
                      <span className="text-sm font-bold text-emerald-400">
                        -{((booking.promotion_discount_amount || (booking.court ? booking.court.price - booking.total_amount : 0)) / 100).toFixed(2)} €
                      </span>
                    </div>
                    {booking.promotion_name && (
                      <div className="mt-1">
                        <span className="text-xs text-emerald-400/80 italic">{booking.promotion_name}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-neutral-700">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-[#c4ab63]" />
                    <span className="text-xs font-semibold text-neutral-200">Montant total:</span>
                  </div>
                  {hasAmount ? (
                    <span className="text-[#c4ab63] font-bold drop-shadow-[0_0_4px_rgba(196,171,99,0.4)]">
                      {(booking.total_amount / 100).toFixed(2)} €
                    </span>
                  ) : (
                    <span className="text-[#c4ab63] font-bold drop-shadow-[0_0_4px_rgba(196,171,99,0.4)]">
                      GRATUIT
                    </span>
                  )}
                </div>

                {hasAmount && booking.amount_paid > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Montant payé:</span>
                    <span className="text-emerald-400 font-semibold">
                      {(booking.amount_paid / 100).toFixed(2)} €
                    </span>
                  </div>
                )}

                {hasAmount && booking.amount_paid > 0 && booking.amount_paid < booking.total_amount && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-700">
                    <span className="text-neutral-400">Reste à payer:</span>
                    <span className="text-orange-400 font-semibold">
                      {((booking.total_amount - booking.amount_paid) / 100).toFixed(2)} €
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {canBeAutoCancelled && hasAmount && !booking.created_by_admin && timeRemaining && (
            <div className={`mt-3 p-3 rounded-lg border ${isExpired ? 'bg-red-900/30 border-red-700' : 'bg-orange-900/30 border-orange-700'}`}>
              <div className="flex items-center gap-2 text-sm">
                <Timer size={16} className={isExpired ? 'text-red-400' : 'text-orange-400'} />
                <span className={isExpired ? 'text-red-300' : 'text-orange-300'}>
                  {isExpired ? (
                    'Délai de paiement expiré - Cette réservation sera annulée automatiquement'
                  ) : (
                    <>
                      <span className="font-semibold">Temps restant pour payer: {timeRemaining}</span>
                      <span className="block text-xs mt-1 text-orange-400/80">
                        Cette réservation sera annulée automatiquement si le paiement n'est pas effectué
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {(needsPayment || (isCreator && booking.status === 'confirmed') || isParticipant) && (
          <div className="mt-4 pt-4 border-t border-neutral-700 flex flex-wrap items-center gap-2">
            {needsPayment && onPayBooking && (
              <button
                onClick={onPayBooking}
                className="px-4 py-2 text-sm font-semibold text-black bg-gradient-to-r from-[#866733] via-[#c4ab63] to-[#ecd88e] hover:from-[#6b5229] hover:via-[#866733] hover:to-[#c4ab63] rounded-lg transition shadow-xl shadow-[#866733]/50 hover:shadow-2xl hover:shadow-[#c4ab63]/70 flex items-center gap-2 ring-2 ring-[#866733]/30 hover:ring-[#c4ab63]/50"
              >
                <CreditCard size={16} />
                {booking.payment_status === 'partial_payment_completed' ? 'Payer le solde' : 'Payer'}
              </button>
            )}

            {isCreator && booking.status === 'confirmed' && (
              <>
                <button
                  onClick={onManageParticipants}
                  className="px-4 py-2 text-sm font-medium text-[#ecd88e] bg-[#866733]/30 hover:bg-[#866733]/50 border border-[#866733]/50 hover:border-[#c4ab63] rounded-lg transition flex items-center gap-2 hover:shadow-md hover:shadow-[#866733]/30"
                >
                  <UserCog size={16} />
                  Gérer les participants
                  <span className="text-xs bg-gradient-to-r from-[#866733]/60 to-[#c4ab63]/60 px-2 py-0.5 rounded-full font-semibold">
                    {booking.acceptedCount || 0}/{booking.participantsCount || 0}
                  </span>
                </button>

                {canCancel && (
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-red-400 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition flex items-center gap-2"
                  >
                    <X size={16} />
                    Annuler ma réservation
                  </button>
                )}
              </>
            )}

            {isParticipant && booking.participantStatus === 'pending' && (
              <>
                <button
                  onClick={onAcceptParticipation}
                  className="px-4 py-2 text-sm font-medium text-green-400 bg-green-900/30 hover:bg-green-900/50 rounded-lg transition flex items-center gap-2"
                >
                  <Check size={16} />
                  Accepter l'invitation
                </button>
                <button
                  onClick={onDeclineParticipation}
                  className="px-4 py-2 text-sm font-medium text-red-400 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition flex items-center gap-2"
                >
                  <X size={16} />
                  Refuser
                </button>
              </>
            )}

            {isParticipant && booking.participantStatus === 'accepted' && (
              <button
                onClick={onDeclineParticipation}
                className="px-4 py-2 text-sm font-medium text-red-400 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition flex items-center gap-2"
              >
                <X size={16} />
                Se désister
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
