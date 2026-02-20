import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, Check, XCircle, AlertCircle, UserCog, Trash2, CreditCard, Hash, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Booking, BookingParticipant, Profile, PaymentLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ParticipantManager } from './ParticipantManager';
import { sendUserNotification } from '../lib/emailService';
import { bookingService } from '../services';

interface BookingDetailsProps {
  booking: Booking;
  onClose: () => void;
  onUpdate?: () => void;
  onRefundCreated?: () => void;
}

export function BookingDetails({ booking, onClose, onUpdate, onRefundCreated }: BookingDetailsProps) {
  const { profile } = useAuth();
  const [participants, setParticipants] = useState<BookingParticipant[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showParticipantManager, setShowParticipantManager] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    fetchParticipants();
    if (profile?.role === 'admin') {
      fetchPaymentLogs();
    }
  }, [booking.id, profile?.role]);

  const copyBookingCode = async () => {
    if (booking.booking_code) {
      await navigator.clipboard.writeText(booking.booking_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const fetchParticipants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('booking_participants')
      .select('*, profile:profiles(*)')
      .eq('booking_id', booking.id)
      .order('created_at');

    if (data) {
      setParticipants(data as any);
    }
    setLoading(false);
  };

  const fetchPaymentLogs = async () => {
    const { data } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false });

    if (data) {
      setPaymentLogs(data);
    }
  };

  const getPlayerDisplayName = (profile?: Profile) => {
    if (!profile) return 'Utilisateur inconnu';
    const fullName = `${profile.first_name} ${profile.last_name}`.trim();
    return fullName || profile.username;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
            <Check size={14} />
            Accepté
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
            <AlertCircle size={14} />
            En attente
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
            <XCircle size={14} />
            Refusé
          </span>
        );
      default:
        return null;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
            <AlertCircle size={14} />
            Paiement en attente
          </span>
        );
      case 'payment_failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-full font-medium">
            <XCircle size={14} />
            Paiement échoué
          </span>
        );
      case 'partial_payment_completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full font-medium">
            <Check size={14} />
            Paiement partiel effectué
          </span>
        );
      case 'payment_completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-full font-medium">
            <Check size={14} />
            Payé intégralement
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium">
            <Check size={14} />
            Confirmé
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full font-medium">
            <XCircle size={14} />
            Annulé
          </span>
        );
      default:
        return null;
    }
  };

  const getPaymentLogStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
            <Check size={12} />
            Réussi
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
            <Clock size={12} />
            En cours
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
            <XCircle size={12} />
            Échoué
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
            <AlertCircle size={12} />
            Remboursé
          </span>
        );
      default:
        return null;
    }
  };

  const isAdmin = profile?.role === 'admin';

  const handleDeleteBooking = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return;

    setDeleting(true);
    try {
      const { data: bookingParticipants } = await supabase
        .from('booking_participants')
        .select('*, profile:profiles(*)')
        .eq('booking_id', booking.id);

      await bookingService.cancel(booking.id, 'admin');

      if (booking.amount_paid > 0 && onRefundCreated) {
        onRefundCreated();
      }

      if (booking.profile) {
        await sendUserNotification(booking.user_id, 'booking_cancelled', {
          court_name: booking.court?.name || '',
          booking_date: new Date(booking.booking_date).toLocaleDateString('fr-FR'),
          start_time: booking.start_time.slice(0, 5),
          end_time: booking.end_time.slice(0, 5),
          first_name: booking.profile.first_name,
          last_name: booking.profile.last_name,
        });
      }

      if (bookingParticipants) {
        for (const participant of bookingParticipants) {
          if (participant.profile) {
            await sendUserNotification(participant.user_id, 'booking_cancelled', {
              court_name: booking.court?.name || '',
              booking_date: new Date(booking.booking_date).toLocaleDateString('fr-FR'),
              start_time: booking.start_time.slice(0, 5),
              end_time: booking.end_time.slice(0, 5),
              first_name: participant.profile.first_name,
              last_name: participant.profile.last_name,
            });
          }
        }
      }

      if (onUpdate) {
        await onUpdate();
      }
      onClose();
    } catch (error: any) {
      alert('Erreur lors de l\'annulation: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleParticipantManagerClose = () => {
    setShowParticipantManager(false);
    fetchParticipants();
    if (onUpdate) onUpdate();
  };

  const acceptedCount = participants.filter(p => p.status === 'accepted').length;
  const pendingCount = participants.filter(p => p.status === 'pending').length;
  const courtCapacity = booking.court?.capacity || 4;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Détails de la réservation
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isAdmin && booking.booking_code && (
            <div className="bg-slate-900 rounded-lg p-4 border-2 border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hash size={20} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                      Code de réservation
                    </p>
                    <p className="text-xl font-mono font-bold text-white tracking-widest">
                      {booking.booking_code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={copyBookingCode}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm font-medium"
                >
                  {codeCopied ? 'Copié !' : 'Copier'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-700">
              <strong className="font-semibold">Terrain:</strong> {booking.court?.name}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar size={18} />
              <span>{new Date(booking.booking_date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock size={18} />
              <span>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Users size={18} />
              <span>Type: {courtCapacity === 2 ? 'Terrain simple' : 'Terrain double'}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-900">{1 + acceptedCount}</div>
                <div className="text-xs text-blue-700">Confirmés</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-700">{pendingCount}</div>
                <div className="text-xs text-yellow-700">En attente</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{courtCapacity - 1 - acceptedCount}</div>
                <div className="text-xs text-gray-600">Places restantes</div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard size={18} />
                Détails de la tarification
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                {booking.court && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Prix du terrain:</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {(booking.court.price / 100).toFixed(2)} €
                    </span>
                  </div>
                )}

                {((booking.promotion_id && booking.promotion_discount_amount !== null && booking.promotion_discount_amount > 0) ||
                  (booking.court && booking.court.price > booking.total_amount)) && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 -mx-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-800 flex items-center gap-1">
                        <Tag size={16} />
                        Montant promotion:
                      </span>
                      <span className="text-lg font-bold text-emerald-700">
                        -{((booking.promotion_discount_amount || (booking.court ? booking.court.price - booking.total_amount : 0)) / 100).toFixed(2)} €
                      </span>
                    </div>
                    {booking.promotion_name && (
                      <div className="mt-1">
                        <span className="text-xs text-emerald-700 italic">{booking.promotion_name}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                  <span className="text-sm text-gray-600">Montant payé:</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {(booking.amount_paid / 100).toFixed(2)} €
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                  <span className="text-sm text-gray-600">Reste à payer:</span>
                  <span className="text-lg font-bold text-orange-600">
                    {((booking.total_amount - booking.amount_paid) / 100).toFixed(2)} €
                  </span>
                </div>

                {booking.total_amount === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 -mx-1">
                    <p className="text-sm text-blue-800">
                      <strong>Réservation gratuite</strong> - Aucun paiement requis
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                  <span className="text-sm text-gray-600">Statut:</span>
                  {getPaymentStatusBadge(booking.payment_status)}
                </div>
              </div>

              {paymentLogs.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Historique des paiements ({paymentLogs.length})
                  </h4>
                  <div className="space-y-2">
                    {paymentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard size={14} className="text-gray-500" />
                            <span className="font-medium text-gray-900">
                              {(log.amount / 100).toFixed(2)} €
                            </span>
                            <span className="text-xs text-gray-500">
                              ({log.payment_type === 'partial' ? 'Partiel' : 'Complet'})
                            </span>
                          </div>
                          {getPaymentLogStatusBadge(log.status)}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </div>
                          {log.stripe_payment_intent_id && (
                            <div className="font-mono text-xs text-gray-500">
                              PI: {log.stripe_payment_intent_id.substring(0, 20)}...
                            </div>
                          )}
                          {log.error_message && (
                            <div className="text-red-600 mt-1">
                              Erreur: {log.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Organisateur</h3>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{getPlayerDisplayName(booking.profile)}</p>
                  <p className="text-sm text-gray-600">@{booking.profile?.username}</p>
                  {booking.profile?.phone && (
                    <p className="text-sm text-gray-600 mt-1">{booking.profile.phone}</p>
                  )}
                </div>
                <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                  Organisateur
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement des participants...
            </div>
          ) : participants.length > 0 ? (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Participants ({participants.length})
              </h3>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {getPlayerDisplayName(participant.profile)}
                        </p>
                        <p className="text-sm text-gray-600">@{participant.profile?.username}</p>
                        {participant.profile?.phone && (
                          <p className="text-sm text-gray-600 mt-1">{participant.profile.phone}</p>
                        )}
                      </div>
                      <div>{getStatusBadge(participant.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users size={48} className="mx-auto mb-2 text-gray-400" />
              <p>Aucun participant invité pour le moment</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t">
          {isAdmin && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setShowParticipantManager(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
              >
                <UserCog size={18} />
                Gérer les participants
              </button>
              <button
                onClick={handleDeleteBooking}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium disabled:opacity-50"
              >
                <Trash2 size={18} />
                {deleting ? 'Annulation...' : 'Annuler la réservation'}
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Fermer
          </button>
        </div>
      </div>

      {showParticipantManager && (
        <ParticipantManager
          booking={booking}
          onClose={handleParticipantManagerClose}
          onUpdate={fetchParticipants}
          context="admin"
        />
      )}
    </div>
  );
}
