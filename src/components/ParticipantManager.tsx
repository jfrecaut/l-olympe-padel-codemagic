import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Check, XCircle, Trash2 } from 'lucide-react';
import { Profile, BookingParticipant, Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { participantService, profileService } from '../services';
import { sendUserNotification } from '../lib/emailService';

interface ParticipantManagerProps {
  booking: Booking;
  onClose: () => void;
  onUpdate: () => void;
  context?: 'admin' | 'player';
}

export function ParticipantManager({ booking, onClose, onUpdate, context = 'player' }: ParticipantManagerProps) {
  const { profile } = useAuth();
  const [participants, setParticipants] = useState<BookingParticipant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isCreator = profile?.id === booking.user_id;
  const isAdmin = profile?.role === 'admin';
  const canManage = isCreator || isAdmin;
  const courtCapacity = booking.court?.capacity || 4;

  const colors = context === 'admin'
    ? {
        bg: 'bg-white',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
        info: 'bg-gray-50 border-gray-200 text-gray-700',
        infoText: 'text-gray-700',
        organizer: 'bg-blue-50 border-blue-200',
        organizerText: 'text-gray-900',
        organizerSecondary: 'text-gray-600',
        organizerBadge: 'bg-blue-500 text-white',
        button: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        focus: 'focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
        border: 'border-gray-300',
        hoverBg: 'hover:bg-gray-100',
        cardBg: 'bg-white border-gray-200',
        cardHover: 'hover:bg-gray-50',
        inputBg: 'bg-white',
        footerBg: 'bg-white border-gray-200',
        closeButton: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
        overlay: 'bg-black bg-opacity-50',
        warningBg: 'bg-yellow-50 border-yellow-300',
        warningText: 'text-yellow-700',
      }
    : {
        bg: 'bg-neutral-900',
        text: 'text-white',
        textSecondary: 'text-neutral-400',
        info: 'bg-[#866733]/20 border-[#866733]/50 text-[#ecd88e]',
        infoText: 'text-[#ecd88e]',
        organizer: 'bg-gradient-to-r from-[#866733]/30 to-[#c4ab63]/30 border-[#866733]/50',
        organizerText: 'text-white',
        organizerSecondary: 'text-neutral-400',
        organizerBadge: 'bg-gradient-to-r from-[#866733]/50 to-[#c4ab63]/50 text-[#ecd88e] border border-[#866733]',
        button: 'bg-gradient-to-r from-[#866733] via-[#c4ab63] to-[#ecd88e] hover:from-[#6b5229] hover:via-[#866733] hover:to-[#c4ab63] text-black shadow-xl hover:shadow-2xl shadow-[#866733]/30 hover:shadow-[#866733]/50',
        focus: 'focus:ring-2 focus:ring-[#c4ab63] focus:border-[#c4ab63]',
        border: 'border-neutral-700',
        hoverBg: 'hover:bg-neutral-800',
        cardBg: 'bg-neutral-800/50 border-neutral-700',
        cardHover: 'hover:bg-neutral-700/50',
        inputBg: 'bg-neutral-800',
        footerBg: 'bg-neutral-900 border-neutral-800',
        closeButton: 'bg-neutral-800 hover:bg-neutral-700 text-white',
        overlay: 'bg-black/80',
        warningBg: 'bg-yellow-900/30 border-yellow-700',
        warningText: 'text-yellow-300',
      };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [booking.id]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPlayers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchParticipants = async () => {
    try {
      const data = await participantService.getByBooking(booking.id);
      setParticipants(data as any);
    } catch (err) {
    }
  };

  const searchPlayers = async () => {
    try {
      const alreadyAdded = participants.map(p => p.user_id);
      const data = await profileService.searchPlayers(searchQuery, booking.user_id, alreadyAdded);
      setSearchResults(data);
    } catch (err) {
    }
  };

  const addParticipant = async (userId: string) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const activeParticipants = participants.filter(p => p.status !== 'declined').length;
      if (activeParticipants >= courtCapacity - 1) {
        throw new Error(`Ce ${courtCapacity === 2 ? 'terrain simple' : 'terrain double'} ne peut accueillir que ${courtCapacity} joueurs (incluant vous-même)`);
      }

      await participantService.add(booking.id, userId);

      const participant = await profileService.getById(userId);

      if (participant && booking.profile) {
        await sendUserNotification(userId, 'participant_added', {
          court_name: booking.court?.name || '',
          booking_date: new Date(booking.booking_date).toLocaleDateString('fr-FR'),
          start_time: booking.start_time.slice(0, 5),
          end_time: booking.end_time.slice(0, 5),
          organizer_first_name: booking.profile.first_name,
          organizer_last_name: booking.profile.last_name,
          participant_first_name: participant.first_name,
          participant_last_name: participant.last_name,
        });
      }

      setSuccess('Participant ajouté avec succès');
      setSearchQuery('');
      await fetchParticipants();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const removeParticipant = async (participantId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce participant ?')) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await participantService.remove(participantId);
      setSuccess('Participant retiré avec succès');
      await fetchParticipants();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const updateParticipantStatus = async (participantId: string, status: 'accepted' | 'declined') => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await participantService.updateStatus(participantId, status);

      const participant = participants.find(p => p.id === participantId);

      if (booking.profile && participant?.profile) {
        const eventType = status === 'accepted' ? 'participant_accepted' : 'participant_declined';
        await sendUserNotification(booking.user_id, eventType, {
          court_name: booking.court?.name || '',
          booking_date: new Date(booking.booking_date).toLocaleDateString('fr-FR'),
          start_time: booking.start_time.slice(0, 5),
          end_time: booking.end_time.slice(0, 5),
          organizer_first_name: booking.profile.first_name,
          organizer_last_name: booking.profile.last_name,
          participant_first_name: participant.profile.first_name,
          participant_last_name: participant.profile.last_name,
        });
      }

      setSuccess(status === 'accepted' ? 'Invitation acceptée' : 'Invitation refusée');
      await fetchParticipants();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerDisplayName = (profile?: Profile) => {
    if (!profile) return 'Utilisateur inconnu';
    const fullName = `${profile.first_name} ${profile.last_name}`.trim();
    return fullName || profile.username;
  };

  const getStatusBadge = (status: string) => {
    if (context === 'admin') {
      switch (status) {
        case 'accepted':
          return <span className="text-xs px-2 py-1 bg-green-100 text-green-700 border border-green-300 rounded">Accepté</span>;
        case 'pending':
          return <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded">En attente</span>;
        case 'declined':
          return <span className="text-xs px-2 py-1 bg-red-100 text-red-700 border border-red-300 rounded">Refusé</span>;
        default:
          return null;
      }
    } else {
      switch (status) {
        case 'accepted':
          return <span className="text-xs px-2 py-1 bg-green-900/40 text-green-300 border border-green-700 rounded">Accepté</span>;
        case 'pending':
          return <span className="text-xs px-2 py-1 bg-yellow-900/40 text-yellow-300 border border-yellow-700 rounded">En attente</span>;
        case 'declined':
          return <span className="text-xs px-2 py-1 bg-red-900/40 text-red-300 border border-red-700 rounded">Refusé</span>;
        default:
          return null;
      }
    }
  };

  const activeParticipantsCount = participants.filter(p => p.status !== 'declined').length;
  const canAddMore = activeParticipantsCount < courtCapacity - 1;

  return (
    <div className={`fixed inset-0 ${colors.overlay} flex items-center justify-center p-4 z-50`}>
      <div className={`${colors.bg} rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border ${colors.border}`}>
        <div className={`sticky top-0 ${colors.bg} border-b ${colors.border} px-6 py-4 flex items-center justify-between`}>
          <h2 className={`text-xl font-semibold ${colors.text}`}>
            Gérer les participants
          </h2>
          <button
            onClick={onClose}
            className={`p-2 ${colors.hoverBg} rounded-lg transition ${colors.textSecondary} hover:${colors.text}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className={`${colors.info} rounded-lg p-4`}>
            <p className={`text-sm ${colors.infoText}`}>
              <strong>Terrain:</strong> {booking.court?.name} ({courtCapacity === 2 ? 'Terrain simple' : 'Terrain double'} - {courtCapacity} joueurs maximum)
            </p>
            <p className={`text-sm ${colors.infoText} mt-1`}>
              <strong>Participants actuels:</strong> {activeParticipantsCount + 1} / {courtCapacity} (incluant vous-même)
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 text-red-300 px-4 py-3 rounded-lg text-sm border border-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/30 text-green-300 px-4 py-3 rounded-lg text-sm border border-green-700">
              {success}
            </div>
          )}

          <div>
            <h3 className={`font-semibold ${colors.text} mb-3`}>Organisateur</h3>
            <div className={`${colors.organizer} rounded-lg p-3 border`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${colors.organizerText}`}>{getPlayerDisplayName(booking.profile)}</p>
                  <p className={`text-sm ${colors.organizerSecondary}`}>@{booking.profile?.username}</p>
                </div>
                <span className={`text-xs px-2 py-1 ${colors.organizerBadge} rounded`}>Organisateur</span>
              </div>
            </div>
          </div>

          {participants.length > 0 && (
            <div>
              <h3 className={`font-semibold ${colors.text} mb-3`}>Participants</h3>
              <div className="space-y-2">
                {participants.map((participant) => {
                  const isMyParticipation = participant.user_id === profile?.id;
                  return (
                    <div
                      key={participant.id}
                      className={`border ${colors.cardBg} rounded-lg p-3`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-medium ${colors.text}`}>
                            {getPlayerDisplayName(participant.profile)}
                          </p>
                          <p className={`text-sm ${colors.textSecondary}`}>@{participant.profile?.username}</p>
                          <div className="mt-2">{getStatusBadge(participant.status)}</div>
                        </div>
                        <div className="flex gap-2">
                          {isMyParticipation && participant.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateParticipantStatus(participant.id, 'accepted')}
                                disabled={loading}
                                className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition disabled:opacity-50"
                                title="Accepter l'invitation"
                              >
                                <Check size={20} />
                              </button>
                              <button
                                onClick={() => updateParticipantStatus(participant.id, 'declined')}
                                disabled={loading}
                                className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition disabled:opacity-50"
                                title="Refuser l'invitation"
                              >
                                <XCircle size={20} />
                              </button>
                            </>
                          )}
                          {canManage && (
                            <button
                              onClick={() => removeParticipant(participant.id)}
                              disabled={loading}
                              className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition disabled:opacity-50"
                              title="Retirer le participant"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {canManage && canAddMore && (
            <div>
              <h3 className={`font-semibold ${colors.text} mb-3`}>Ajouter des participants</h3>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textSecondary}`} size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom ou pseudo..."
                  className={`w-full pl-10 pr-4 py-2 ${colors.inputBg} border ${colors.border} ${colors.text} rounded-lg ${colors.focus} placeholder:${colors.textSecondary}`}
                />
              </div>

              {searchResults.length > 0 && (
                <div className={`mt-2 border ${colors.border} rounded-lg divide-y divide-${colors.border} max-h-60 overflow-y-auto ${colors.inputBg}`}>
                  {searchResults.map((player) => (
                    <div
                      key={player.id}
                      className={`p-3 ${colors.cardHover} flex items-center justify-between`}
                    >
                      <div>
                        <p className={`font-medium ${colors.text}`}>{getPlayerDisplayName(player)}</p>
                        <p className={`text-sm ${colors.textSecondary}`}>@{player.username}</p>
                      </div>
                      <button
                        onClick={() => addParticipant(player.id)}
                        disabled={loading}
                        className={`flex items-center gap-1 px-3 py-1 text-sm ${colors.button} font-semibold rounded-lg transition disabled:opacity-50`}
                      >
                        <UserPlus size={16} />
                        Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {canManage && !canAddMore && (
            <div className={`${colors.warningBg} border rounded-lg p-4`}>
              <p className={`text-sm ${colors.warningText}`}>
                Le nombre maximum de participants pour ce terrain a été atteint.
              </p>
            </div>
          )}
        </div>

        <div className={`sticky bottom-0 ${colors.footerBg} px-6 py-4 border-t`}>
          <button
            onClick={onClose}
            className={`w-full px-4 py-2 ${colors.closeButton} rounded-lg transition`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
