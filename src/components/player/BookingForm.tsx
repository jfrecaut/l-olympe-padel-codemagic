import { Zap, Users } from 'lucide-react';
import { Court, Settings, OpeningHours, Holiday, Promotion } from '../../types';
import { TimeSlotPicker } from './TimeSlotPicker';
import { DatePicker } from './DatePicker';
import { CourtSelector } from './CourtSelector';
import { PreBookingParticipants } from './PreBookingParticipants';

interface TimeSlot {
  time: string;
  available: boolean;
}

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

interface BookingFormProps {
  playersCount: number;
  bookingDate: string;
  selectedSlot: string;
  selectedCourt: string;
  availableCourts: Court[];
  settings: Settings | null;
  timeSlots: TimeSlot[];
  loading: boolean;
  loadingSlots?: boolean;
  error: string;
  success: string;
  upcomingBookingsCount: number;
  openingHours: OpeningHours[];
  holidays: Holiday[];
  stripeConfigured?: boolean;
  selectedParticipants: string[];
  getPromotionForCourt?: (court: Court) => { promotion: Promotion; discountedPrice: number } | null;
  onPlayersCountChange: (count: number) => void;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: string) => void;
  onCourtChange: (courtId: string) => void;
  onParticipantsChange: (participantIds: string[]) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function BookingForm({
  playersCount,
  bookingDate,
  selectedSlot,
  selectedCourt,
  availableCourts,
  settings,
  timeSlots,
  loading,
  loadingSlots = false,
  error,
  success,
  upcomingBookingsCount,
  openingHours,
  holidays,
  stripeConfigured = false,
  selectedParticipants,
  getPromotionForCourt,
  onPlayersCountChange,
  onDateChange,
  onSlotChange,
  onCourtChange,
  onParticipantsChange,
  onSubmit,
}: BookingFormProps) {
  const minDate = new Date().toISOString().split('T')[0];

  const isHoliday = (date: string) => {
    return holidays.some(h => {
      const startDate = h.date;
      const endDate = h.end_date || h.date;
      return date >= startDate && date <= endDate;
    });
  };

  const getHolidayForDate = (date: string): Holiday | undefined => {
    return holidays.find(h => {
      const startDate = h.date;
      const endDate = h.end_date || h.date;
      return date >= startDate && date <= endDate;
    });
  };

  const getDateInfo = () => {
    if (!bookingDate) return null;

    const selectedDate = new Date(bookingDate);
    const dayOfWeek = selectedDate.getDay();
    const hours = openingHours.find(h => h.day_of_week === dayOfWeek);

    if (isHoliday(bookingDate)) {
      const holiday = getHolidayForDate(bookingDate);
      return <div className="text-red-400 text-sm">Fermé - {holiday?.reason}</div>;
    }

    if (hours?.is_closed) {
      return <div className="text-red-400 text-sm">Fermé le {DAYS[dayOfWeek]}</div>;
    }

    if (hours) {
      return (
        <div className="text-neutral-400 text-sm">
          Ouvert : {hours.open_time.slice(0, 5)} - {hours.close_time.slice(0, 5)}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-neutral-900 rounded-xl shadow-lg p-6 border border-neutral-800">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="text-[#c4ab63] drop-shadow-[0_0_8px_rgba(196,171,99,0.6)]" size={24} />
        Nouvelle réservation
      </h2>

      {settings && (
        <div className="mb-4 p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg">
          <p className="text-sm text-neutral-300">
            <strong>{upcomingBookingsCount}</strong> sur <strong>{settings.max_bookings_per_user}</strong> réservations à venir utilisées
            {upcomingBookingsCount >= settings.max_bookings_per_user && (
              <span className="block mt-1 text-red-400 font-medium">
                Vous avez atteint le nombre maximum de réservations. Annulez une réservation existante pour en créer une nouvelle.
              </span>
            )}
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1 flex items-center gap-2">
            <Users size={16} />
            Type de terrain
          </label>
          <select
            value={playersCount}
            onChange={(e) => onPlayersCountChange(Number(e.target.value))}
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent focus:shadow-lg focus:shadow-[#c4ab63]/20"
            required
          >
            <option value={2}>Terrain simple</option>
            <option value={4}>Terrain double</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">
            Date
          </label>
          <DatePicker
            value={bookingDate}
            onChange={onDateChange}
            minDate={minDate}
          />
          {bookingDate && <div className="mt-2">{getDateInfo()}</div>}
        </div>

        {loadingSlots ? (
          <div className="text-neutral-400 text-sm text-center py-4">
            Chargement des créneaux disponibles...
          </div>
        ) : timeSlots.length > 0 ? (
          <TimeSlotPicker
            timeSlots={timeSlots}
            selectedSlot={selectedSlot}
            onSelectSlot={onSlotChange}
          />
        ) : (
          bookingDate && (
            <div className="text-neutral-400 text-sm text-center py-4">
              Aucun créneau disponible pour cette date
            </div>
          )
        )}

        {selectedSlot && availableCourts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Sélectionner un terrain disponible
            </label>
            <CourtSelector
              courts={availableCourts}
              selectedCourtId={selectedCourt}
              onSelectCourt={onCourtChange}
              getPromotionForCourt={getPromotionForCourt}
            />
            {selectedCourt && availableCourts.find(c => c.id === selectedCourt) && (
              <>
                <div className="mt-2 p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg">
                  {(() => {
                    const court = availableCourts.find(c => c.id === selectedCourt);
                    if (!court) return null;

                    const promotionData = getPromotionForCourt ? getPromotionForCourt(court) : null;
                    const finalPrice = promotionData ? promotionData.discountedPrice : court.price;

                    if (finalPrice === 0) {
                      return (
                        <div>
                          {promotionData && (
                            <div className="mb-2 text-[#c4ab63] font-semibold text-sm">
                              {promotionData.promotion.label}
                            </div>
                          )}
                          <p className="text-sm text-neutral-300">
                            {promotionData ? (
                              <>
                                Prix: <span className="line-through text-neutral-500">{(court.price / 100).toFixed(2)} €</span>{' '}
                                <strong className="text-green-400">GRATUIT</strong> pour un {court.capacity === 2 ? 'terrain simple' : 'terrain double'}
                              </>
                            ) : (
                              <>Ce terrain est <strong>gratuit</strong></>
                            )}
                          </p>
                        </div>
                      );
                    }

                    if (finalPrice > 0) {
                      return (
                        <div>
                          {promotionData && (
                            <div className="mb-2 text-[#c4ab63] font-semibold text-sm">
                              {promotionData.promotion.label}
                            </div>
                          )}
                          <p className="text-sm text-neutral-300">
                            Prix: {promotionData && (
                              <span className="line-through text-neutral-500 mr-2">
                                {(court.price / 100).toFixed(2)} €
                              </span>
                            )}
                            <strong className={promotionData ? 'text-[#c4ab63]' : ''}>
                              {(finalPrice / 100).toFixed(2)} €
                            </strong> pour un {court.capacity === 2 ? 'terrain simple' : 'terrain double'}
                            <span className="block mt-1">
                              Soit <strong className={promotionData ? 'text-[#c4ab63]' : ''}>
                                {(finalPrice / court.capacity / 100).toFixed(2)} €
                              </strong> par joueur
                            </span>
                            {promotionData && (
                              <span className="block mt-1 text-xs text-green-400">
                                Vous économisez {((court.price - finalPrice) / 100).toFixed(2)} €
                              </span>
                            )}
                          </p>
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
                {(() => {
                  const court = availableCourts.find(c => c.id === selectedCourt);
                  if (!court) return null;

                  const promotionData = getPromotionForCourt ? getPromotionForCourt(court) : null;
                  const finalPrice = promotionData ? promotionData.discountedPrice : court.price;

                  if (finalPrice > 0 && !stripeConfigured) {
                    return (
                      <div className="mt-2 p-3 bg-orange-900/30 border border-orange-700 rounded-lg">
                        <p className="text-sm text-orange-300">
                          <strong>Attention:</strong> Le paiement en ligne n'est pas encore configuré. Les réservations seront créées sans paiement.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </div>
        )}

        {selectedSlot && availableCourts.length === 0 && (
          <div className="p-3 bg-orange-900/30 border border-orange-700 rounded-lg">
            <p className="text-sm text-orange-300">
              Aucun {playersCount === 2 ? 'terrain simple' : 'terrain double'} disponible à ce créneau horaire.
            </p>
          </div>
        )}

        {selectedCourt && (
          <PreBookingParticipants
            courtCapacity={availableCourts.find(c => c.id === selectedCourt)?.capacity || playersCount}
            selectedParticipants={selectedParticipants}
            onParticipantsChange={onParticipantsChange}
          />
        )}

        {error && (
          <div className="bg-red-900/30 text-red-300 px-4 py-3 rounded-lg text-sm border border-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-[#866733]/30 text-[#ecd88e] px-4 py-3 rounded-lg text-sm border border-[#866733]">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedCourt}
          className="w-full bg-gradient-to-r from-[#866733] via-[#c4ab63] to-[#ecd88e] text-black py-3 rounded-lg font-semibold hover:from-[#6b5229] hover:via-[#866733] hover:to-[#c4ab63] shadow-xl shadow-[#866733]/40 hover:shadow-2xl hover:shadow-[#c4ab63]/60 transition disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-[#866733]/20 hover:ring-[#c4ab63]/40"
        >
          {loading ? 'Réservation...' : 'Réserver le terrain'}
        </button>
      </form>
    </div>
  );
}
