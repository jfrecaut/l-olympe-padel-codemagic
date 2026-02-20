import { useState, useEffect } from 'react';
import { Clock, Calendar, Plus, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Settings, OpeningHours, Holiday } from '../types';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [gameDuration, setGameDuration] = useState(45);
  const [cancellationHours, setCancellationHours] = useState(48);
  const [maxBookingsPerUser, setMaxBookingsPerUser] = useState(5);
  const [paymentTimeoutHours, setPaymentTimeoutHours] = useState(1);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayEndDate, setNewHolidayEndDate] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchOpeningHours();
    fetchHolidays();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .maybeSingle();

    if (data) {
      setSettings(data);
      setGameDuration(data.game_duration_minutes);
      setCancellationHours(data.cancellation_hours);
      setMaxBookingsPerUser(data.max_bookings_per_user);
      setPaymentTimeoutHours(data.payment_timeout_hours || 1);
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

  const fetchHolidays = async () => {
    const { data } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date');

    if (data) setHolidays(data);
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('settings')
        .update({
          game_duration_minutes: gameDuration,
          cancellation_hours: cancellationHours,
          max_bookings_per_user: maxBookingsPerUser,
          payment_timeout_hours: paymentTimeoutHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings?.id);

      if (error) throw error;
      setSuccess('Paramètres mis à jour avec succès !');
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOpeningHours = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('opening_hours')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
      fetchOpeningHours();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('holidays')
        .insert({
          date: newHolidayDate,
          end_date: newHolidayEndDate || newHolidayDate,
          reason: newHolidayReason,
        });

      if (error) throw error;
      setSuccess('Jour férié ajouté avec succès !');
      setNewHolidayDate('');
      setNewHolidayEndDate('');
      setNewHolidayReason('');
      fetchHolidays();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce jour férié ?')) return;

    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchHolidays();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}>
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')}>
            <X size={18} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-emerald-500" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Paramètres de réservation</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée du match (minutes)
              </label>
              <input
                type="number"
                value={gameDuration}
                onChange={(e) => setGameDuration(parseInt(e.target.value))}
                min="15"
                step="15"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Délai d'annulation (heures)
              </label>
              <input
                type="number"
                value={cancellationHours}
                onChange={(e) => setCancellationHours(parseInt(e.target.value))}
                min="1"
                step="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Nombre d'heures minimum avant la réservation pour permettre l'annulation</p>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max réservations par utilisateur
              </label>
              <input
                type="number"
                value={maxBookingsPerUser}
                onChange={(e) => setMaxBookingsPerUser(parseInt(e.target.value))}
                min="1"
                max="20"
                step="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Nombre maximum de réservations à venir qu'un utilisateur peut avoir</p>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Délai de paiement (heures)
              </label>
              <input
                type="number"
                value={paymentTimeoutHours}
                onChange={(e) => setPaymentTimeoutHours(parseFloat(e.target.value))}
                min="0.5"
                max="24"
                step="0.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Délai pour effectuer le paiement avant annulation automatique (ne s'applique pas aux réservations créées par l'admin)</p>
            </div>
          </div>

          <button
            onClick={handleUpdateSettings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
          >
            <Save size={18} />
            Enregistrer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-emerald-500" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Horaires d'ouverture</h2>
        </div>
        <div className="space-y-3">
          {openingHours.map((hours) => (
            <div key={hours.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-3 font-medium text-gray-700">
                {DAYS[hours.day_of_week]}
              </div>
              <div className="sm:col-span-3">
                <input
                  type="time"
                  value={hours.open_time}
                  onChange={(e) => handleUpdateOpeningHours(hours.id, 'open_time', e.target.value)}
                  disabled={hours.is_closed}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="time"
                  value={hours.close_time}
                  onChange={(e) => handleUpdateOpeningHours(hours.id, 'close_time', e.target.value)}
                  disabled={hours.is_closed}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hours.is_closed}
                    onChange={(e) => handleUpdateOpeningHours(hours.id, 'is_closed', e.target.checked)}
                    className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-600">Fermé</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="text-emerald-500" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Jours fériés</h2>
        </div>

        <form onSubmit={handleAddHoliday} className="mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => {
                  setNewHolidayDate(e.target.value);
                  if (newHolidayEndDate && e.target.value > newHolidayEndDate) {
                    setNewHolidayEndDate(e.target.value);
                  }
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin (optionnel)
              </label>
              <input
                type="date"
                value={newHolidayEndDate}
                onChange={(e) => setNewHolidayEndDate(e.target.value)}
                min={newHolidayDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif
              </label>
              <input
                type="text"
                value={newHolidayReason}
                onChange={(e) => setNewHolidayReason(e.target.value)}
                placeholder="Compétition, Travaux, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
          >
            <Plus size={18} />
            Ajouter
          </button>
        </form>

        <div className="space-y-2">
          {holidays.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun jour férié à venir</p>
          ) : (
            holidays.map((holiday) => {
              const startDate = new Date(holiday.date);
              const endDate = holiday.end_date ? new Date(holiday.end_date) : null;
              const isRange = endDate && holiday.end_date !== holiday.date;

              return (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {isRange ? (
                        <>
                          {startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {' au '}
                          {endDate!.toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </>
                      ) : (
                        startDate.toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{holiday.reason}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(holiday.id)}
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
