import { useState, useEffect } from 'react';
import { Search, UserPlus, X, Users } from 'lucide-react';
import { Profile } from '../../types';
import { profileService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';

interface PreBookingParticipantsProps {
  courtCapacity: number;
  selectedParticipants: string[];
  onParticipantsChange: (participantIds: string[]) => void;
}

export function PreBookingParticipants({
  courtCapacity,
  selectedParticipants,
  onParticipantsChange,
}: PreBookingParticipantsProps) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPlayers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadParticipants();
  }, [selectedParticipants]);

  const loadParticipants = async () => {
    if (selectedParticipants.length === 0) {
      setParticipants([]);
      return;
    }

    try {
      const profiles = await Promise.all(
        selectedParticipants.map(id => profileService.getById(id))
      );
      setParticipants(profiles.filter(Boolean) as Profile[]);
    } catch (err) {
      console.error('Error loading participants:', err);
    }
  };

  const searchPlayers = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const data = await profileService.searchPlayers(
        searchQuery,
        profile.id,
        selectedParticipants
      );
      setSearchResults(data);
    } catch (err) {
      console.error('Error searching players:', err);
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = (userId: string) => {
    if (selectedParticipants.length >= courtCapacity - 1) {
      return;
    }
    onParticipantsChange([...selectedParticipants, userId]);
    setSearchQuery('');
  };

  const removeParticipant = (userId: string) => {
    onParticipantsChange(selectedParticipants.filter(id => id !== userId));
  };

  const getPlayerDisplayName = (profile: Profile) => {
    const fullName = `${profile.first_name} ${profile.last_name}`.trim();
    return fullName || profile.username;
  };

  const canAddMore = selectedParticipants.length < courtCapacity - 1;
  const spotsRemaining = courtCapacity - 1 - selectedParticipants.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-neutral-300 flex items-center gap-2">
          <Users size={16} />
          Participants
        </label>
        <span className="text-xs text-neutral-400">
          {selectedParticipants.length} / {courtCapacity - 1} invités
        </span>
      </div>

      {participants.length > 0 && (
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between bg-neutral-800/50 border border-neutral-700 rounded-lg p-3"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {getPlayerDisplayName(participant)}
                </p>
                <p className="text-xs text-neutral-400">@{participant.username}</p>
              </div>
              <button
                type="button"
                onClick={() => removeParticipant(participant.id)}
                className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <div>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Rechercher des joueurs (${spotsRemaining} place${spotsRemaining > 1 ? 's' : ''} restante${spotsRemaining > 1 ? 's' : ''})`}
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent placeholder-neutral-500 text-sm"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 border border-neutral-700 bg-neutral-800 rounded-lg divide-y divide-neutral-700 max-h-48 overflow-y-auto">
              {searchResults.map((player) => (
                <div
                  key={player.id}
                  className="p-3 hover:bg-neutral-700/50 flex items-center justify-between transition"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {getPlayerDisplayName(player)}
                    </p>
                    <p className="text-xs text-neutral-400">@{player.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addParticipant(player.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gradient-to-r from-[#866733] to-[#c4ab63] text-black rounded-lg hover:from-[#6b5229] hover:to-[#866733] transition font-semibold"
                  >
                    <UserPlus size={14} />
                    Ajouter
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-xs text-neutral-500 mt-1">
              Tapez au moins 2 caractères pour rechercher
            </p>
          )}
        </div>
      )}

      {!canAddMore && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
          <p className="text-xs text-amber-300">
            Le nombre maximum de participants pour ce terrain a été atteint.
          </p>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Vous pouvez inviter des joueurs maintenant ou après la réservation. Les invitations seront envoyées par email.
      </p>
    </div>
  );
}
