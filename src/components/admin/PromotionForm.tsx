import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Court, Promotion } from '../../types';

interface PromotionFormProps {
  promotion?: Promotion;
  courts: Court[];
  onSubmit: (promotion: Partial<Promotion>) => Promise<void>;
  onClose: () => void;
}

export function PromotionForm({ promotion, courts, onSubmit, onClose }: PromotionFormProps) {
  const [formData, setFormData] = useState({
    name: promotion?.name || '',
    label: promotion?.label || '',
    court_ids: promotion?.court_ids || [] as string[],
    discount_type: promotion?.discount_type || 'percentage' as 'percentage' | 'amount',
    discount_value: promotion?.discount_value || 0,
    start_date: promotion?.start_date ? promotion.start_date.slice(0, 16) : '',
    end_date: promotion?.end_date ? promotion.end_date.slice(0, 16) : '',
    is_active: promotion?.is_active !== undefined ? promotion.is_active : true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.court_ids.length === 0) {
      setError('Veuillez sélectionner au moins un terrain');
      return;
    }

    if (formData.discount_type === 'percentage' && (formData.discount_value < 0 || formData.discount_value > 100)) {
      setError('Le pourcentage doit être entre 0 et 100');
      return;
    }

    if (formData.discount_type === 'amount' && formData.discount_value < 0) {
      setError('Le montant doit être positif');
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        start_date: formData.start_date + ':00',
        end_date: formData.end_date + ':00',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const toggleCourt = (courtId: string) => {
    setFormData(prev => ({
      ...prev,
      court_ids: prev.court_ids.includes(courtId)
        ? prev.court_ids.filter(id => id !== courtId)
        : [...prev.court_ids, courtId]
    }));
  };

  const selectAllCourts = () => {
    setFormData(prev => ({
      ...prev,
      court_ids: courts.map(c => c.id)
    }));
  };

  const deselectAllCourts = () => {
    setFormData(prev => ({
      ...prev,
      court_ids: []
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-xl font-semibold text-gray-900">
            {promotion ? 'Modifier la promotion' : 'Nouvelle promotion'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la promotion *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Ex: Offre d'ouverture"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label d'affichage (visible par les joueurs) *
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Ex: 🎉 Offre spéciale ouverture"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terrains concernés *
            </label>
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={selectAllCourts}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={deselectAllCourts}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
              >
                Tout désélectionner
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 border border-gray-300 rounded-lg p-3">
              {courts.filter(c => c.is_active).length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  Aucun terrain actif disponible. Veuillez d'abord créer et activer des terrains.
                </div>
              ) : (
                courts.filter(c => c.is_active).map(court => (
                  <label key={court.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded transition">
                    <input
                      type="checkbox"
                      checked={formData.court_ids.includes(court.id)}
                      onChange={() => toggleCourt(court.id)}
                      className="w-4 h-4 text-emerald-500 bg-white border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-gray-700">{court.name} ({court.capacity === 2 ? 'Simple' : 'Double'})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de réduction *
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value as 'percentage' | 'amount' }))}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="percentage">Pourcentage</option>
                <option value="amount">Montant fixe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valeur *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step={formData.discount_type === 'amount' ? '0.01' : '1'}
                  min="0"
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
                <span className="absolute right-3 top-2 text-gray-500">
                  {formData.discount_type === 'percentage' ? '%' : '€'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date et heure de début *
              </label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date et heure de fin *
              </label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 text-emerald-500 bg-white border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Promotion active</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-semibold hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {loading ? 'Enregistrement...' : (promotion ? 'Mettre à jour' : 'Créer la promotion')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
