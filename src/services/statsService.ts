import { supabase } from '../lib/supabase';

export interface StatsData {
  date: string;
  bookings_count: number;
  occupancy_rate: number;
  revenue: number;
}

export interface StatsParams {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'week' | 'month' | 'year';
}

async function getTotalSlots(startDate: string, endDate: string, groupBy: string): Promise<Record<string, number>> {
  const { data: courts } = await supabase
    .from('courts')
    .select('id')
    .eq('is_active', true);

  if (!courts || courts.length === 0) return {};

  const { data: openingHours } = await supabase
    .from('opening_hours')
    .select('*')
    .order('day_of_week');

  if (!openingHours || openingHours.length === 0) return {};

  const totalSlotsByPeriod: Record<string, number> = {};
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const hoursForDay = openingHours.find(h => h.day_of_week === dayOfWeek);

    let periodKey = '';
    if (groupBy === 'day') {
      periodKey = current.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const weekStart = new Date(current);
      weekStart.setDate(current.getDate() - current.getDay() + 1);
      periodKey = weekStart.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    } else if (groupBy === 'year') {
      periodKey = `${current.getFullYear()}`;
    }

    if (hoursForDay && !hoursForDay.is_closed) {
      const openTime = new Date(`2000-01-01T${hoursForDay.open_time}`);
      const closeTime = new Date(`2000-01-01T${hoursForDay.close_time}`);
      const hoursOpen = (closeTime.getTime() - openTime.getTime()) / (1000 * 60 * 60);
      const slotsPerCourt = hoursOpen * 2;
      const totalSlots = slotsPerCourt * courts.length;

      totalSlotsByPeriod[periodKey] = (totalSlotsByPeriod[periodKey] || 0) + totalSlots;
    } else {
      if (!totalSlotsByPeriod[periodKey]) {
        totalSlotsByPeriod[periodKey] = 0;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return totalSlotsByPeriod;
}

export const statsService = {
  async getStats({ startDate, endDate, groupBy }: StatsParams): Promise<StatsData[]> {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        total_amount,
        courts (price)
      `)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .eq('status', 'confirmed');

    if (error) throw error;

    const totalSlotsByPeriod = await getTotalSlots(startDate, endDate, groupBy);

    const statsMap = new Map<string, StatsData>();

    Object.keys(totalSlotsByPeriod).forEach(date => {
      statsMap.set(date, {
        date,
        bookings_count: 0,
        occupancy_rate: 0,
        revenue: 0,
      });
    });

    bookings?.forEach((booking: any) => {
      const bookingDate = new Date(booking.booking_date);
      let periodKey = '';

      if (groupBy === 'day') {
        periodKey = booking.booking_date;
      } else if (groupBy === 'week') {
        const weekStart = new Date(bookingDate);
        weekStart.setDate(bookingDate.getDate() - bookingDate.getDay() + 1);
        periodKey = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        periodKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'year') {
        periodKey = `${bookingDate.getFullYear()}`;
      }

      if (!statsMap.has(periodKey)) {
        statsMap.set(periodKey, {
          date: periodKey,
          bookings_count: 0,
          occupancy_rate: 0,
          revenue: 0,
        });
      }

      const stats = statsMap.get(periodKey)!;
      stats.bookings_count += 1;
      stats.revenue += booking.total_amount / 100;
    });

    const statsArray = Array.from(statsMap.values());

    statsArray.forEach(stat => {
      const totalSlots = totalSlotsByPeriod[stat.date] || 1;
      stat.occupancy_rate = totalSlots > 0 ? (stat.bookings_count / totalSlots) * 100 : 0;
    });

    return statsArray.sort((a, b) => a.date.localeCompare(b.date));
  },
};
