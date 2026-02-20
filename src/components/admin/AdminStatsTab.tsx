import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { statsService, StatsData } from '../../services/statsService';
import { StatsChart } from './StatsChart';

type PeriodType = 'week' | 'month' | 'custom';
type GroupByType = 'day' | 'week' | 'month' | 'year';

export function AdminStatsTab() {
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [groupBy, setGroupBy] = useState<GroupByType>('day');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statsData, setStatsData] = useState<StatsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, [periodType, groupBy, customStartDate, customEndDate]);

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = (): { startDate: string; endDate: string } => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (periodType) {
      case 'week':
        // Semaine en cours (lundi au dimanche, norme française)
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(today);
        startDate.setDate(today.getDate() - diffToMonday);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'month':
        // Mois en cours (du 1er au dernier jour)
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: customStartDate,
            endDate: customEndDate,
          };
        }
        // Par défaut, semaine en cours
        const day = today.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startDate = new Date(today);
        startDate.setDate(today.getDate() - diff);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
    }

    return {
      startDate: formatDateLocal(startDate),
      endDate: formatDateLocal(endDate),
    };
  };

  const fetchStats = async () => {
    if (periodType === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { startDate, endDate } = getDateRange();
      const data = await statsService.getStats({
        startDate,
        endDate,
        groupBy,
      });
      setStatsData(data);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Statistiques</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Période
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'week' as PeriodType, label: 'Semaine' },
                { value: 'month' as PeriodType, label: 'Mois' },
                { value: 'custom' as PeriodType, label: 'Personnalisé' },
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setPeriodType(period.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                    periodType === period.value
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {periodType === 'custom' && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date début</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date fin</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Granularité
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="day">Jour</option>
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
              <option value="year">Année</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <StatsChart data={statsData} type="bookings" groupBy={groupBy} />
          <StatsChart data={statsData} type="occupancy" groupBy={groupBy} />
          <StatsChart data={statsData} type="revenue" groupBy={groupBy} />
        </div>
      )}
    </div>
  );
}
