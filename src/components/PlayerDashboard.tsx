import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Court, Settings, OpeningHours, Holiday, Promotion } from '../types';
import { ProfileSettings } from './ProfileSettings';
import { ParticipantManager } from './ParticipantManager';
import { StripePayment } from './StripePayment';
import { PlayerHeader } from './player/PlayerHeader';
import { BookingForm } from './player/BookingForm';
import { BookingsList } from './player/BookingsList';
import { WelcomeScreen } from './player/WelcomeScreen';
import {
  courtService,
  bookingService,
  settingsService,
  openingHoursService,
  holidayService,
  participantService,
  stripeService,
  promotionService,
} from '../services';

interface TimeSlot {
  time: string;
  available: boolean;
}

type PlayerView = 'welcome' | 'new-booking' | 'my-bookings' | 'my-info';

export function PlayerDashboard() {
  const { profile, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<PlayerView>('welcome');
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [playersCount, setPlayersCount] = useState<number>(4);
  const [bookingDate, setBookingDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [availableCourts, setAvailableCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(false);
  const [managingParticipants, setManagingParticipants] = useState<any | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [listError, setListError] = useState('');
  const [listSuccess, setListSuccess] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [cachedBookings, setCachedBookings] = useState<{ date: string; bookings: any[] } | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState(0);
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMobileUrl, setVideoMobileUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerMobileUrl, setBannerMobileUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [courtPromotions, setCourtPromotions] = useState<Map<string, { promotion: Promotion; discountedPrice: number }>>(new Map());
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  useEffect(() => {
    fetchCourts();
    fetchBookings();
    fetchSettings();
    fetchOpeningHours();
    fetchHolidays();
    fetchUpcomingBookingsCount();
    checkStripeConfiguration();
    fetchActivePromotions();
  }, []);

  const checkStripeConfiguration = async () => {
    try {
      const publishableKey = await stripeService.getActivePublishableKey();
      setStripeConfigured(!!publishableKey);
    } catch (err) {
      setStripeConfigured(false);
    }
  };

  useEffect(() => {
    if (bookingDate && settings && openingHours.length > 0 && playersCount) {
      generateTimeSlots();
    } else {
      setTimeSlots([]);
    }
  }, [bookingDate, settings, openingHours, holidays, playersCount, courts]);

  useEffect(() => {
    if (selectedSlot && bookingDate && playersCount) {
      filterAvailableCourts();
    } else {
      setAvailableCourts([]);
    }
  }, [selectedSlot, bookingDate, playersCount, courts]);

  useEffect(() => {
    if (showPayment || managingParticipants) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPayment, managingParticipants]);

  const fetchCourts = async () => {
    try {
      const data = await courtService.getActive();
      setCourts(data);
    } catch (err) {
      console.error('Error fetching courts:', err);
    }
  };

  const fetchBookings = async () => {
    if (!profile) return;

    try {
      await bookingService.checkAndCancelExpiredBookings();
      const data = await bookingService.getUserBookings(profile.id);
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  const fetchUpcomingBookingsCount = async () => {
    if (!profile) return;

    try {
      const count = await bookingService.countUpcomingBookings(profile.id);
      setUpcomingBookingsCount(count);
    } catch (err) {
      console.error('Error fetching upcoming bookings count:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await settingsService.get();
      setSettings(data);
      setVideoUrl(data.welcome_video_url || null);
      setVideoMobileUrl(data.welcome_video_mobile_url || null);
      setBannerUrl(data.welcome_banner_url || null);
      setBannerMobileUrl(data.welcome_banner_mobile_url || null);
      setLogoUrl(data.company_logo_dark_url || null);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchOpeningHours = async () => {
    try {
      const data = await openingHoursService.getAll();
      setOpeningHours(data);
    } catch (err) {
      console.error('Error fetching opening hours:', err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const data = await holidayService.getAll();
      setHolidays(data);
    } catch (err) {
      console.error('Error fetching holidays:', err);
    }
  };

  const fetchActivePromotions = async () => {
    try {
      const data = await promotionService.getAllPromotions();
      setActivePromotions(data.filter(p => p.is_active));
    } catch (err) {
      console.error('Error fetching promotions:', err);
    }
  };

  const getPromotionForCourt = (court: Court): { promotion: Promotion; discountedPrice: number } | null => {
    if (!bookingDate || !selectedSlot) return null;

    const bookingDateTime = `${bookingDate}T${selectedSlot}:00`;

    const promotion = activePromotions.find(p => {
      if (!p.court_ids.includes(court.id)) return false;

      const startStr = p.start_date.slice(0, 16);
      const endStr = p.end_date.slice(0, 16);
      const bookingStr = bookingDateTime.slice(0, 16);

      return bookingStr >= startStr && bookingStr <= endStr;
    });

    if (!promotion) return null;

    const discountedPrice = promotionService.calculateDiscountedPrice(court.price, promotion);
    return { promotion, discountedPrice };
  };

  const isHoliday = (date: string) => {
    return holidays.some(h => {
      const startDate = h.date;
      const endDate = h.end_date || h.date;
      return date >= startDate && date <= endDate;
    });
  };

  const getBookingsForDate = async (date: string) => {
    if (cachedBookings && cachedBookings.date === date) {
      return cachedBookings.bookings;
    }
    const bookings = await bookingService.getAllBookingsForDate(date);
    setCachedBookings({ date, bookings });
    return bookings;
  };

  const generateTimeSlots = async () => {
    if (!bookingDate || !settings) return;

    const selectedDate = new Date(bookingDate);
    const dayOfWeek = selectedDate.getDay();
    const hours = openingHours.find(h => h.day_of_week === dayOfWeek);

    if (!hours || hours.is_closed || isHoliday(bookingDate)) {
      setTimeSlots([]);
      return;
    }

    setLoadingSlots(true);
    try {
      const isToday = bookingDate === new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const slots: TimeSlot[] = [];
      const [openHour, openMinute] = hours.open_time.split(':').map(Number);
      const [closeHour, closeMinute] = hours.close_time.split(':').map(Number);

      const openMinutes = openHour * 60 + openMinute;
      const closeMinutes = closeHour * 60 + closeMinute;
      const duration = settings.game_duration_minutes;

      const eligibleCourts = courts.filter(court =>
        court.is_active && court.capacity === playersCount
      );

      const allBookings = await getBookingsForDate(bookingDate);

      for (let minutes = openMinutes; minutes + duration <= closeMinutes; minutes += duration) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        const endMinutes = minutes + duration;
        const endHour = Math.floor(endMinutes / 60);
        const endMinute = endMinutes % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        const isPast = isToday && minutes < currentMinutes;

        let hasAvailableCourt = false;

        if (!isPast && eligibleCourts.length > 0) {
          for (const court of eligibleCourts) {
            const courtBookings = allBookings.filter(booking => booking.court_id === court.id);

            const isBooked = courtBookings.some(booking => {
              const bookingStart = booking.start_time.slice(0, 5);
              const bookingEnd = booking.end_time.slice(0, 5);

              return (
                startTime < bookingEnd && endTime > bookingStart
              );
            });

            if (!isBooked) {
              hasAvailableCourt = true;
              break;
            }
          }
        }

        slots.push({
          time: `${startTime} - ${endTime}`,
          available: !isPast && hasAvailableCourt,
        });
      }

      setTimeSlots(slots);
    } catch (err) {
      console.error('Error generating time slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const filterAvailableCourts = async () => {
    if (!selectedSlot || !bookingDate || !playersCount) return;

    try {
      const [startTime, endTime] = selectedSlot.split(' - ');

      const eligibleCourts = courts.filter(court =>
        court.is_active && court.capacity === playersCount
      );

      const allBookings = await getBookingsForDate(bookingDate);
      const availableCourtsList: Court[] = [];

      for (const court of eligibleCourts) {
        const courtBookings = allBookings.filter(booking => booking.court_id === court.id);

        const isBooked = courtBookings.some(booking => {
          const bookingStart = booking.start_time.slice(0, 5);
          const bookingEnd = booking.end_time.slice(0, 5);

          return (
            startTime < bookingEnd && endTime > bookingStart
          );
        });

        if (!isBooked) {
          availableCourtsList.push(court);
        }
      }

      setAvailableCourts(availableCourtsList);
    } catch (err) {
      console.error('Error filtering available courts:', err);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setLoading(true);

    try {
      if (!profile) throw new Error('Utilisateur non authentifié');
      if (!selectedSlot) throw new Error('Veuillez sélectionner un créneau horaire');

      const maxBookings = settings?.max_bookings_per_user || 5;
      if (upcomingBookingsCount >= maxBookings) {
        throw new Error(`Vous avez atteint le maximum de ${maxBookings} réservations à venir`);
      }

      const court = courts.find(c => c.id === selectedCourt);
      if (!court) throw new Error('Veuillez sélectionner un terrain');

      const [startTime, endTime] = selectedSlot.split(' - ');

      const promotionData = getPromotionForCourt(court);
      const finalPrice = promotionData ? promotionData.discountedPrice : court.price;

      if (stripeConfigured && finalPrice > 0) {
        const booking = await bookingService.create({
          courtId: selectedCourt,
          userId: profile.id,
          bookingDate,
          startTime,
          endTime,
          playersCount,
          totalAmount: finalPrice,
          originalAmount: promotionData ? court.price : undefined,
          promotionId: promotionData?.promotion.id,
          promotionDiscount: promotionData ? (court.price - finalPrice) : undefined,
        });

        if (selectedParticipants.length > 0) {
          for (const participantId of selectedParticipants) {
            await participantService.add(booking.id, participantId);
          }
        }

        setPendingBooking({
          ...booking,
          court,
          profile,
          isNewBooking: true,
        });
        setShowPayment(true);
      } else {
        const booking = await bookingService.create({
          courtId: selectedCourt,
          userId: profile.id,
          bookingDate,
          startTime,
          endTime,
          playersCount,
          totalAmount: finalPrice,
          originalAmount: promotionData ? court.price : undefined,
          promotionId: promotionData?.promotion.id,
          promotionDiscount: promotionData ? (court.price - finalPrice) : undefined,
        });

        if (selectedParticipants.length > 0) {
          for (const participantId of selectedParticipants) {
            await participantService.add(booking.id, participantId);
          }
        }

        await bookingService.sendConfirmationEmail(
          profile.id,
          court.name,
          bookingDate,
          startTime,
          endTime,
          { first_name: profile.first_name, last_name: profile.last_name }
        );

        setFormSuccess('Réservation créée avec succès !');
        setPlayersCount(4);
        setBookingDate('');
        setSelectedSlot('');
        setSelectedCourt('');
        setSelectedParticipants([]);
        fetchBookings();
        fetchUpcomingBookingsCount();
        setTimeSlots([]);
        setAvailableCourts([]);

        setTimeout(() => {
          setCurrentView('my-bookings');
        }, 1500);
      }
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!pendingBooking || !profile) return;

    setShowPayment(false);
    setListError('');

    const updatedBooking = await bookingService.getById(pendingBooking.id);

    if (updatedBooking) {
      await bookingService.sendConfirmationEmail(
        profile.id,
        pendingBooking.court.name,
        pendingBooking.booking_date,
        pendingBooking.start_time,
        pendingBooking.end_time,
        { first_name: profile.first_name, last_name: profile.last_name }
      );

      if (updatedBooking.payment_status === 'payment_completed') {
        setListSuccess('Paiement effectué avec succès ! Réservation payée intégralement.');
      } else if (updatedBooking.payment_status === 'partial_payment_completed') {
        const remaining = ((updatedBooking.total_amount - updatedBooking.amount_paid) / 100).toFixed(2);
        setListSuccess(`Paiement partiel effectué avec succès ! Reste à payer : ${remaining} €`);
      }
    }

    setPlayersCount(4);
    setBookingDate('');
    setSelectedSlot('');
    setSelectedCourt('');
    setPendingBooking(null);
    fetchBookings();
    fetchUpcomingBookingsCount();
    setTimeSlots([]);
    setAvailableCourts([]);
    setCurrentView('my-bookings');
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setListSuccess('');

    if (pendingBooking?.isNewBooking) {
      setListError('Réservation créée mais paiement annulé. Vous pouvez payer plus tard depuis vos réservations.');
    } else {
      setListError('Paiement annulé.');
    }

    fetchBookings();
    fetchUpcomingBookingsCount();
    setPendingBooking(null);
    setPlayersCount(4);
    setBookingDate('');
    setSelectedSlot('');
    setSelectedCourt('');
    setTimeSlots([]);
    setAvailableCourts([]);
    setCurrentView('my-bookings');
  };

  const canCancelBooking = (booking: any): boolean => {
    if (!settings || booking.status === 'cancelled') return false;

    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilBooking >= settings.cancellation_hours;
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return;

    setLoading(true);
    setListError('');
    setListSuccess('');

    try {
      const booking = bookings.find(b => b.id === bookingId);
      const court = courts.find(c => c.id === booking?.court_id);

      await bookingService.cancel(bookingId, 'client');

      if (profile && booking && court) {
        await bookingService.sendCancellationEmails(
          booking,
          court.name,
          profile.id,
          { first_name: profile.first_name, last_name: profile.last_name }
        );
      }

      const hasPaidAmount = booking && booking.amount_paid > 0;
      setListSuccess(
        hasPaidAmount
          ? 'Réservation annulée avec succès. Une demande de remboursement a été créée et sera traitée par un administrateur.'
          : 'Réservation annulée avec succès'
      );
      fetchBookings();
      fetchUpcomingBookingsCount();
    } catch (err: any) {
      setListError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineParticipation = async (participantId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette invitation ?')) return;

    setLoading(true);
    setListError('');
    setListSuccess('');

    try {
      await participantService.decline(participantId);
      setListSuccess('Invitation refusée');
      fetchBookings();
    } catch (err: any) {
      setListError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptParticipation = async (participantId: string) => {
    setLoading(true);
    setListError('');
    setListSuccess('');

    try {
      await participantService.accept(participantId);
      setListSuccess('Invitation acceptée');
      fetchBookings();
    } catch (err: any) {
      setListError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayersCountChange = (count: number) => {
    setPlayersCount(count);
    setSelectedSlot('');
    setSelectedCourt('');
  };

  const handleDateChange = (date: string) => {
    setBookingDate(date);
    setSelectedSlot('');
    setSelectedCourt('');
    if (cachedBookings && cachedBookings.date !== date) {
      setCachedBookings(null);
    }
  };

  const handleSlotChange = (slot: string) => {
    setSelectedSlot(slot);
    setSelectedCourt('');
  };

  const handleCourtChange = (courtId: string) => {
    setSelectedCourt(courtId);
  };

  if (!profile) return null;

  if (currentView === 'welcome') {
    return (
      <>
        <WelcomeScreen
          profile={profile}
          upcomingBookingsCount={upcomingBookingsCount}
          videoUrl={videoUrl}
          videoMobileUrl={videoMobileUrl}
          logoUrl={logoUrl}
          onNewBooking={() => setCurrentView('new-booking')}
          onViewBookings={() => setCurrentView('my-bookings')}
          onOpenSettings={() => setCurrentView('my-info')}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <PlayerHeader
        username={profile?.username || ''}
        bannerUrl={bannerUrl}
        bannerMobileUrl={bannerMobileUrl}
        logoUrl={logoUrl}
        onSignOut={signOut}
        onBackToHome={() => setCurrentView('welcome')}
        onNewBooking={() => setCurrentView('new-booking')}
        onMyBookings={() => setCurrentView('my-bookings')}
        onMyInfo={() => setCurrentView('my-info')}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {currentView === 'new-booking' && (
          <div className="max-w-4xl mx-auto">
            <BookingForm
              playersCount={playersCount}
              bookingDate={bookingDate}
              selectedSlot={selectedSlot}
              selectedCourt={selectedCourt}
              availableCourts={availableCourts}
              settings={settings}
              timeSlots={timeSlots}
              loading={loading}
              loadingSlots={loadingSlots}
              error={formError}
              success={formSuccess}
              upcomingBookingsCount={upcomingBookingsCount}
              openingHours={openingHours}
              holidays={holidays}
              stripeConfigured={stripeConfigured}
              selectedParticipants={selectedParticipants}
              getPromotionForCourt={getPromotionForCourt}
              onPlayersCountChange={handlePlayersCountChange}
              onDateChange={handleDateChange}
              onSlotChange={handleSlotChange}
              onCourtChange={handleCourtChange}
              onParticipantsChange={setSelectedParticipants}
              onSubmit={handleBooking}
            />
          </div>
        )}

        {currentView === 'my-bookings' && (
          <div className="max-w-4xl mx-auto">
            <BookingsList
              bookings={bookings}
              currentUserId={profile?.id || ''}
              settings={settings}
              error={listError}
              success={listSuccess}
              onManageParticipants={setManagingParticipants}
              onCancelBooking={handleCancelBooking}
              onAcceptParticipation={handleAcceptParticipation}
              onDeclineParticipation={handleDeclineParticipation}
              onPayBooking={(booking) => {
                setPendingBooking(booking);
                setShowPayment(true);
              }}
            />
          </div>
        )}

        {currentView === 'my-info' && (
          <div className="max-w-4xl mx-auto">
            <ProfileSettings onClose={() => setCurrentView('welcome')} />
          </div>
        )}
      </main>

      {managingParticipants && (
        <ParticipantManager
          booking={managingParticipants}
          onClose={() => setManagingParticipants(null)}
          onUpdate={fetchBookings}
        />
      )}

      {showPayment && pendingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="w-full max-w-md p-4 min-h-full flex items-center">
            <StripePayment
              bookingId={pendingBooking.id}
              totalAmount={pendingBooking.total_amount}
              amountPaid={pendingBooking.amount_paid}
              playersCount={pendingBooking.players_count}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
