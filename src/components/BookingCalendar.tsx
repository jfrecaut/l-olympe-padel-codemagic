import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Court, Booking, OpeningHours, Profile, Holiday } from '../types';
import { BookingDetails } from './BookingDetails';
import { AdminBookingForm } from './AdminBookingForm';
import * as XLSX from 'xlsx';

type ViewMode = 'day' | 'week' | 'month' | 'custom';

interface BookingCalendarProps {
  courts: Court[];
  onRefundCreated?: () => void;
}

export function BookingCalendar({ courts, onRefundCreated }: BookingCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [gameDuration, setGameDuration] = useState(45);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newBookingSlot, setNewBookingSlot] = useState<{
    court: Court;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  useEffect(() => {
    fetchOpeningHours();
    fetchSettings();
    fetchHolidays();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [currentDate, viewMode, customStartDate, customEndDate]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('game_duration_minutes')
      .maybeSingle();

    if (data) setGameDuration(data.game_duration_minutes);
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

  const fetchHolidays = async () => {
    const { data } = await supabase
      .from('holidays')
      .select('*')
      .order('date');

    if (data) setHolidays(data);
  };

  const fetchBookings = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange();

    const { data } = await supabase
      .from('bookings')
      .select('*, court:courts(*), profile:profiles(*)')
      .eq('status', 'confirmed')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .order('booking_date')
      .order('start_time');

    if (data) setBookings(data as any);
    setLoading(false);
  };

  const getDateRange = () => {
    let startDate: string;
    let endDate: string;

    switch (viewMode) {
      case 'day':
        startDate = endDate = formatDate(currentDate);
        break;

      case 'week':
        const weekStart = new Date(currentDate);
        const dayOfWeek = currentDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(currentDate.getDate() - diffToMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        startDate = formatDate(weekStart);
        endDate = formatDate(weekEnd);
        break;

      case 'month':
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        startDate = formatDate(monthStart);
        endDate = formatDate(monthEnd);
        break;

      case 'custom':
        startDate = customStartDate || formatDate(new Date());
        endDate = customEndDate || formatDate(new Date());
        break;
    }

    return { startDate, endDate };
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
  };

  const goToAujourdhui = () => {
    setCurrentDate(new Date());
  };

  const getDisplayDateRange = () => {
    const { startDate, endDate } = getDateRange();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (viewMode === 'day') {
      return start.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (viewMode === 'week') {
      return `${start.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (viewMode === 'month') {
      return start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } else {
      return `${start.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  };

  const getActiveCourts = () => {
    return courts
      .filter(c => c.is_active)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getPlayerDisplayName = (profile?: Profile) => {
    if (!profile) return 'Unknown';
    const fullName = `${profile.first_name} ${profile.last_name}`.trim();
    return fullName || profile.username;
  };

  const getBookingColorClasses = (booking: Booking) => {
    if (booking.total_amount > 0) {
      switch (booking.payment_status) {
        case 'pending_payment':
          return 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200 text-yellow-800';
        case 'payment_failed':
          return 'bg-red-100 border-red-300 hover:bg-red-200 text-red-800';
        case 'partial_payment_completed':
          return 'bg-teal-100 border-teal-300 hover:bg-teal-200 text-teal-800';
        case 'payment_completed':
          return 'bg-green-100 border-green-300 hover:bg-green-200 text-green-800';
      }
    }
    return 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200 text-emerald-800';
  };

  const getBookingTextClasses = (booking: Booking) => {
    if (booking.total_amount > 0) {
      switch (booking.payment_status) {
        case 'pending_payment':
          return 'text-yellow-700';
        case 'payment_failed':
          return 'text-red-700';
        case 'partial_payment_completed':
          return 'text-teal-700';
        case 'payment_completed':
          return 'text-green-700';
      }
    }
    return 'text-emerald-700';
  };

  const getBookingTimeClasses = (booking: Booking) => {
    if (booking.total_amount > 0) {
      switch (booking.payment_status) {
        case 'pending_payment':
          return 'text-yellow-600';
        case 'payment_failed':
          return 'text-red-600';
        case 'partial_payment_completed':
          return 'text-teal-600';
        case 'payment_completed':
          return 'text-green-600';
      }
    }
    return 'text-emerald-600';
  };

  const isDateInHolidayRange = (dateStr: string): boolean => {
    return holidays.some(h => {
      const startDate = h.date;
      const endDate = h.end_date || h.date;
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  const getHolidayForDate = (dateStr: string): Holiday | undefined => {
    return holidays.find(h => {
      const startDate = h.date;
      const endDate = h.end_date || h.date;
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  const isDayClosed = (date: Date): boolean => {
    if (openingHours.length === 0) return true;

    const dateStr = formatDate(date);
    if (isDateInHolidayRange(dateStr)) return true;

    const dayOfWeek = date.getDay();
    const hours = openingHours.find(h => h.day_of_week === dayOfWeek);
    return !hours || hours.is_closed === true;
  };

  const getTimeSlots = () => {
    if (isDayClosed(currentDate)) {
      return [];
    }

    const dayOfWeek = currentDate.getDay();
    const hours = openingHours.find(h => h.day_of_week === dayOfWeek);

    if (!hours) {
      return [];
    }

    const slots: string[] = [];
    const [openHour, openMinute] = hours.open_time.split(':').map(Number);
    const [closeHour, closeMinute] = hours.close_time.split(':').map(Number);

    const openTimeMinutes = openHour * 60 + openMinute;
    const closeTimeMinutes = closeHour * 60 + closeMinute;

    for (let time = openTimeMinutes; time < closeTimeMinutes; time += gameDuration) {
      const hour = Math.floor(time / 60);
      const minute = time % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }

    return slots;
  };

  const getBookingForSlot = (courtId: string, date: string, time: string) => {
    const slotTime = time + ':00';
    return bookings.find(b => {
      if (b.court_id !== courtId || b.booking_date !== date) {
        return false;
      }
      return b.start_time <= slotTime && b.end_time > slotTime;
    });
  };

  const getEndTimeForSlot = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + gameDuration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;
  };

  const handleSlotClick = (court: Court, date: string, startTime: string) => {
    const clickedDate = new Date(date);
    if (isDayClosed(clickedDate)) {
      return;
    }
    const endTime = getEndTimeForSlot(startTime);
    setNewBookingSlot({ court, date, startTime: startTime + ':00', endTime });
  };

  const renderDayView = () => {
    const timeSlots = getTimeSlots();
    const dateStr = formatDate(currentDate);

    if (timeSlots.length === 0) {
      const holiday = getHolidayForDate(dateStr);
      const closedReason = holiday ? holiday.reason : 'Jour de fermeture hebdomadaire';

      return (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-lg mb-2">🚫</div>
          <div className="text-gray-700 font-semibold">Club fermé</div>
          <div className="text-gray-500 text-sm mt-1">{closedReason}</div>
          <div className="text-gray-400 text-xs mt-1">Aucune réservation possible ce jour-là</div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-r min-w-[100px]">
                Heure
              </th>
              {getActiveCourts().map(court => (
                <th key={court.id} className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b border-r min-w-[200px]">
                  {court.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time} className="border-b hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-4 text-sm font-medium text-gray-700 border-r">
                  {time}
                </td>
                {getActiveCourts().map(court => {
                  const booking = getBookingForSlot(court.id, dateStr, time);
                  return (
                    <td key={court.id} className="px-2 py-2 border-r">
                      {booking ? (
                        <div
                          onClick={() => setSelectedBooking(booking)}
                          className={`border rounded p-2 text-xs cursor-pointer transition ${getBookingColorClasses(booking)}`}
                        >
                          <div className="font-semibold">{getPlayerDisplayName(booking.profile)}</div>
                          <div className={`text-[10px] ${getBookingTextClasses(booking)}`}>@{booking.profile?.username}</div>
                          <div className={`mt-1 ${getBookingTimeClasses(booking)}`}>
                            {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                          </div>
                          <div className={getBookingTimeClasses(booking)}>{booking.players_count === 2 ? 'Simple' : 'Double'}</div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleSlotClick(court, dateStr, time)}
                          className="h-16 flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition border-2 border-dashed border-transparent hover:border-blue-300 rounded"
                        >
                          <span>Créer réservation</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    const dayOfWeek = currentDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(currentDate.getDate() - diffToMonday);
    const days: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-r min-w-[150px]">
                Court
              </th>
              {days.map(day => (
                <th key={day.toISOString()} className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b border-r min-w-[120px]">
                  <div>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                  <div className="text-xs text-gray-500">{day.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getActiveCourts().map(court => (
              <tr key={court.id} className="border-b hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-4 text-sm font-medium text-gray-700 border-r">
                  {court.name}
                </td>
                {days.map(day => {
                  const dateStr = formatDate(day);
                  const dayBookings = bookings.filter(b => b.court_id === court.id && b.booking_date === dateStr);
                  return (
                    <td key={day.toISOString()} className="px-2 py-2 border-r align-top">
                      {dayBookings.length > 0 ? (
                        <div className="space-y-1">
                          {dayBookings.map(booking => (
                            <div
                              key={booking.id}
                              onClick={() => setSelectedBooking(booking)}
                              className={`border rounded p-1 text-xs cursor-pointer transition ${getBookingColorClasses(booking)}`}
                            >
                              <div className="font-semibold truncate">{getPlayerDisplayName(booking.profile)}</div>
                              <div className={`text-[10px] truncate ${getBookingTextClasses(booking)}`}>@{booking.profile?.username}</div>
                              <div className={getBookingTimeClasses(booking)}>{booking.start_time.slice(0, 5)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-16 flex items-center justify-center text-gray-400 text-xs">
                          -
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      currentWeek.push(new Date(d));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                <th key={day} className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b border-r">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIdx) => (
              <tr key={weekIdx} className="border-b">
                {week.map((day, dayIdx) => {
                  const dateStr = formatDate(day);
                  const dayBookings = bookings.filter(b => b.booking_date === dateStr);
                  const isCurrentMonth = day.getMonth() === month;
                  const isToday = formatDate(new Date()) === dateStr;

                  return (
                    <td
                      key={dayIdx}
                      className={`px-2 py-2 border-r align-top h-28 ${!isCurrentMonth ? 'bg-gray-50' : ''} ${isToday ? 'bg-blue-50' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'} ${isToday ? 'text-blue-600' : ''}`}>
                        {day.getDate()}
                      </div>
                      {isCurrentMonth && dayBookings.length > 0 && (
                        <div className="space-y-1">
                          {dayBookings.slice(0, 2).map(booking => (
                            <div
                              key={booking.id}
                              onClick={() => setSelectedBooking(booking)}
                              className={`border rounded px-1 py-0.5 text-xs truncate cursor-pointer transition ${getBookingColorClasses(booking)}`}
                            >
                              <span className="font-semibold">{booking.start_time.slice(0, 5)}</span> {booking.court?.name}
                            </div>
                          ))}
                          {dayBookings.length > 2 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{dayBookings.length - 2} de plus
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCustomView = () => {
    if (!customStartDate || !customEndDate) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          Veuillez sélectionner les dates de début et de fin
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            Aucune réservation pour cette période
          </div>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {booking.court?.name}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Joueur:</span> {getPlayerDisplayName(booking.profile)}
                      <div className="text-xs text-gray-500">@{booking.profile?.username}</div>
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {new Date(booking.booking_date).toLocaleDateString('fr-FR')}
                    </div>
                    <div>
                      <span className="font-medium">Heure:</span> {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                    </div>
                    <div>
                      <span className="font-medium">Joueurs:</span> {booking.players_count}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const handleExport = () => {
    if (bookings.length === 0) {
      alert('Aucune réservation à exporter pour cette période');
      return;
    }

    const exportData = bookings.map(booking => ({
      'Date': new Date(booking.booking_date).toLocaleDateString('fr-FR'),
      'Heure': `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`,
      'Terrain': booking.court?.name || '',
      'Code de réservation': booking.booking_code || '',
      'Pseudo': booking.profile?.username || '',
      'Nom': booking.profile?.last_name || '',
      'Prénom': booking.profile?.first_name || '',
      'Email': booking.profile?.email || '',
      'Téléphone': booking.profile?.phone || '',
      'Prix terrain': ((booking.original_amount || booking.total_amount) / 100).toFixed(2).replace('.', ','),
      'Réduction': ((booking.promotion_discount || 0) / 100).toFixed(2).replace('.', ','),
      'Montant à payer': (booking.total_amount / 100).toFixed(2).replace('.', ','),
      'Montant encaissé': (booking.amount_paid / 100).toFixed(2).replace('.', ',')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Réservations');

    const { startDate, endDate } = getDateRange();
    const fileName = `reservations_${startDate}_${endDate}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                viewMode === 'day'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                viewMode === 'week'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                viewMode === 'month'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setViewMode('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                viewMode === 'custom'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Personnalisé
            </button>
          </div>

          {viewMode !== 'custom' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToAujourdhui}
                className="px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={bookings.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Export Excel
          </button>
        </div>

        <div className="mt-4">
          {viewMode === 'custom' ? (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900">
              <CalendarIcon size={20} />
              {getDisplayDateRange()}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          Chargement...
        </div>
      ) : (
        <>
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'custom' && renderCustomView()}
        </>
      )}

      {selectedBooking && (
        <BookingDetails
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={fetchBookings}
          onRefundCreated={onRefundCreated}
        />
      )}

      {newBookingSlot && (
        <AdminBookingForm
          court={newBookingSlot.court}
          date={newBookingSlot.date}
          startTime={newBookingSlot.startTime}
          endTime={newBookingSlot.endTime}
          onClose={() => setNewBookingSlot(null)}
          onSuccess={() => {
            fetchBookings();
            setNewBookingSlot(null);
          }}
        />
      )}
    </div>
  );
}
