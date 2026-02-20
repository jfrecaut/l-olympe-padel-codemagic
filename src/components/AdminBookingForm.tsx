import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, UserPlus, Trash2, AlertTriangle, CreditCard, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Court, Profile, OpeningHours, Promotion } from '../types';
import { UserSearchSelect } from './UserSearchSelect';
import { sendUserNotification } from '../lib/emailService';
import { promotionService } from '../services';

interface AdminBookingFormProps {
  court: Court;
  date: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParticipantInput {
  userId: string;
  tempId: string;
}

export function AdminBookingForm({ court, date, startTime, endTime, onClose, onSuccess }: AdminBookingFormProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loadingPromotion, setLoadingPromotion] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchOpeningHours();
    fetchPromotion();
  }, []);

  useEffect(() => {
    checkIfClosed();
  }, [date, openingHours]);

  useEffect(() => {
    fetchPromotion();
  }, [date, startTime, court.id]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('username');

    if (data) {
      setUsers(data);
    }
  };

  const fetchOpeningHours = async () => {
    const { data } = await supabase
      .from('opening_hours')
      .select('*')
      .order('day_of_week');

    if (data) {
      const sortedData = data.sort((a, b) => {
        const dayA = a.day_of_week === 0 ? 7 : a.day_of_week;
        const dayB = b.day_of_week === 0 ? 7 : b.day_of_week;
        return dayA - dayB;
      });
      setOpeningHours(sortedData);
    }
  };

  const fetchPromotion = async () => {
    setLoadingPromotion(true);
    try {
      const bookingDateTime = `${date}T${startTime}`;
      const promo = await promotionService.getPromotionForBookingSlot(court.id, bookingDateTime);
      setPromotion(promo);
    } catch (error) {
      console.error('Error fetching promotion:', error);
      setPromotion(null);
    } finally {
      setLoadingPromotion(false);
    }
  };

  const checkIfClosed = () => {
    if (openingHours.length === 0) return;

    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay();
    const hours = openingHours.find(h => h.day_of_week === dayOfWeek);

    setIsClosed(hours?.is_closed || false);
  };

  const addParticipant = () => {
    setParticipants([...participants, { userId: '', tempId: Math.random().toString() }]);
  };

  const removeParticipant = (tempId: string) => {
    setParticipants(participants.filter(p => p.tempId !== tempId));
  };

  const updateParticipant = (tempId: string, userId: string) => {
    setParticipants(participants.map(p =>
      p.tempId === tempId ? { ...p, userId } : p
    ));
  };

  const getAvailableUsers = (currentTempId?: string) => {
    const selectedIds = [selectedUserId, ...participants.filter(p => p.tempId !== currentTempId).map(p => p.userId)];
    return users.filter(u => !selectedIds.includes(u.id));
  };

  const getUserDisplayName = (user: Profile) => {
    const fullName = `${user.first_name} ${user.last_name}`.trim();
    return fullName || user.username;
  };

  const calculateFinalPrice = () => {
    if (promotion) {
      return promotionService.calculateDiscountedPrice(court.price, promotion);
    }
    return court.price;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isClosed) {
      setError('Impossible de créer une réservation : le club est fermé ce jour-là');
      return;
    }

    if (!selectedUserId) {
      setError('Veuillez sélectionner un organisateur');
      return;
    }

    const validParticipants = participants.filter(p => p.userId);
    if (validParticipants.length + 1 > court.capacity) {
      setError(`Le nombre total de personnes (organisateur + participants) ne peut pas dépasser ${court.capacity}`);
      return;
    }

    setLoading(true);

    try {
      const finalPrice = calculateFinalPrice();

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: selectedUserId,
          court_id: court.id,
          booking_date: date,
          start_time: startTime,
          end_time: endTime,
          players_count: court.capacity,
          status: 'confirmed',
          created_by_admin: true,
          total_amount: finalPrice,
          amount_paid: 0,
          payment_status: 'confirmed',
          original_amount: promotion ? court.price : undefined,
          promotion_id: promotion?.id,
          promotion_discount: promotion ? (court.price - finalPrice) : undefined,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const organizer = users.find(u => u.id === selectedUserId);
      if (organizer) {
        await sendUserNotification(organizer.id, 'booking_created', {
          court_name: court.name,
          booking_date: new Date(date).toLocaleDateString('fr-FR'),
          start_time: startTime.slice(0, 5),
          end_time: endTime.slice(0, 5),
          first_name: organizer.first_name,
          last_name: organizer.last_name,
        });
      }

      if (validParticipants.length > 0 && booking) {
        const participantInserts = validParticipants.map(p => ({
          booking_id: booking.id,
          user_id: p.userId,
          status: 'pending',
        }));

        const { error: participantsError } = await supabase
          .from('booking_participants')
          .insert(participantInserts);

        if (participantsError) throw participantsError;

        for (const p of validParticipants) {
          const participant = users.find(u => u.id === p.userId);
          if (participant && organizer) {
            await sendUserNotification(participant.id, 'participant_added', {
              court_name: court.name,
              booking_date: new Date(date).toLocaleDateString('fr-FR'),
              start_time: startTime.slice(0, 5),
              end_time: endTime.slice(0, 5),
              organizer_first_name: organizer.first_name,
              organizer_last_name: organizer.last_name,
              participant_first_name: participant.first_name,
              participant_last_name: participant.last_name,
            });
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la réservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Créer une réservation
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <strong className="font-semibold">Terrain:</strong> {court.name}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar size={18} />
              <span>{new Date(date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock size={18} />
              <span>{startTime.slice(0, 5)} - {endTime.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Users size={18} />
              <span>Type: {court.capacity === 2 ? 'Terrain simple' : 'Terrain double'}</span>
            </div>
          </div>

          {isClosed && (
            <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Attention : Jour de fermeture</p>
                <p className="text-sm mt-1">Le club est fermé ce jour-là. Vous ne pouvez pas créer de réservation.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organisateur de la réservation *
            </label>
            <UserSearchSelect
              users={users}
              selectedUserId={selectedUserId}
              onSelect={setSelectedUserId}
              placeholder="Rechercher un organisateur..."
              required
              excludeUserIds={participants.map(p => p.userId).filter(Boolean)}
              excludeRoles={['admin']}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Participants (optionnel)
              </label>
              <button
                type="button"
                onClick={addParticipant}
                className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                disabled={participants.length + 1 >= court.capacity}
              >
                <UserPlus size={16} />
                Ajouter un participant
              </button>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                Aucun participant ajouté
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.tempId} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <UserSearchSelect
                        users={users}
                        selectedUserId={participant.userId}
                        onSelect={(userId) => updateParticipant(participant.tempId, userId)}
                        placeholder="Rechercher un participant..."
                        excludeUserIds={[
                          selectedUserId,
                          ...participants
                            .filter(p => p.tempId !== participant.tempId)
                            .map(p => p.userId)
                            .filter(Boolean)
                        ]}
                        excludeRoles={['admin']}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParticipant(participant.tempId)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              Places occupées: {1 + participants.filter(p => p.userId).length} / {court.capacity}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard size={18} />
              Tarification
            </h3>
            {loadingPromotion ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                Chargement...
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Prix du terrain:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {(court.price / 100).toFixed(2)} €
                  </span>
                </div>

                {promotion && (
                  <>
                    <div className="flex items-center justify-between text-emerald-600">
                      <span className="text-sm flex items-center gap-1">
                        <Tag size={16} />
                        Promotion appliquée:
                      </span>
                      <span className="text-lg font-semibold">
                        -{(promotion.discount_type === 'percentage'
                          ? `${promotion.discount_value}%`
                          : `${(promotion.discount_value / 100).toFixed(2)} €`
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-600 text-xs">
                      <span>{promotion.name}</span>
                      <span>
                        -{((court.price - calculateFinalPrice()) / 100).toFixed(2)} €
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm font-semibold text-gray-900">Montant total:</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {(calculateFinalPrice() / 100).toFixed(2)} €
                  </span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Cette réservation sera créée gratuitement (réservation admin).
                    Aucun paiement ne sera demandé à l'organisateur.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !selectedUserId || isClosed}
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer la réservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
