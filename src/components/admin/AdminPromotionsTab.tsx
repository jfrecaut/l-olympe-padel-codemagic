import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Archive, AlertCircle, Percent, Euro, Calendar, Tag } from 'lucide-react';
import { Promotion, Court } from '../../types';
import { promotionService, courtService } from '../../services';
import { PromotionForm } from './PromotionForm';
import { PromotionsArchiveTable } from './PromotionsArchiveTable';

export function AdminPromotionsTab() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [archivedPromotions, setArchivedPromotions] = useState<Promotion[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | undefined>();
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [promotionsData, courtsData] = await Promise.all([
        promotionService.getAllPromotions(),
        courtService.getAll()
      ]);

      const activePromotions = promotionsData.filter(p => {
        const now = new Date();
        const currentStr = now.toISOString().slice(0, 16);
        const endStr = p.end_date.slice(0, 16);
        return p.is_active && endStr >= currentStr;
      });

      console.log('Loaded courts:', courtsData);
      console.log('Active courts:', courtsData.filter(c => c.is_active));

      setPromotions(activePromotions);
      setCourts(courtsData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des promotions');
    } finally {
      setLoading(false);
    }
  };

  const loadArchive = async () => {
    try {
      const archived = await promotionService.getArchivedPromotions();
      setArchivedPromotions(archived);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des archives');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showArchive) {
      loadArchive();
    }
  }, [showArchive]);

  const handleCreatePromotion = async (promotionData: Partial<Promotion>) => {
    await promotionService.createPromotion(promotionData as Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'created_by'>);
    await loadData();
  };

  const handleUpdatePromotion = async (promotionData: Partial<Promotion>) => {
    if (!editingPromotion) return;
    await promotionService.updatePromotion(editingPromotion.id, promotionData);
    await loadData();
  };

  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) return;

    try {
      await promotionService.deletePromotion(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      await promotionService.updatePromotion(promotion.id, {
        is_active: !promotion.is_active
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const getCourtNames = (courtIds: string[]) => {
    return courtIds
      .map(id => courts.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const formatDateTime = (date: string) => {
    const d = date.slice(0, 16);
    const [datePart, timePart] = d.split('T');
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year} ${timePart}`;
  };

  const getDiscountDisplay = (promotion: Promotion) => {
    if (promotion.discount_type === 'percentage') {
      return `${promotion.discount_value}%`;
    } else {
      return `${(promotion.discount_value / 100).toFixed(2)} €`;
    }
  };

  const isPromotionActive = (promotion: Promotion) => {
    const now = new Date();
    const currentStr = now.toISOString().slice(0, 16);
    const startStr = promotion.start_date.slice(0, 16);
    const endStr = promotion.end_date.slice(0, 16);
    return promotion.is_active && currentStr >= startStr && currentStr <= endStr;
  };

  if (showArchive) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Archives des promotions</h2>
          <button
            onClick={() => setShowArchive(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Retour
          </button>
        </div>

        <PromotionsArchiveTable promotions={archivedPromotions} courts={courts} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Gestion des promotions</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowArchive(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Archive size={18} />
            Archives
          </button>
          <button
            onClick={() => {
              setEditingPromotion(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
          >
            <Plus size={18} />
            Nouvelle promotion
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="mt-4 text-gray-600">Chargement des promotions...</p>
        </div>
      ) : promotions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Tag size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">Aucune promotion active</p>
          <button
            onClick={() => {
              setEditingPromotion(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition inline-flex"
          >
            <Plus size={18} />
            Créer votre première promotion
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {promotions.map((promotion) => {
            const isActive = isPromotionActive(promotion);

            return (
              <div
                key={promotion.id}
                className={`bg-white rounded-lg border ${
                  isActive ? 'border-emerald-200 shadow-sm' : 'border-gray-200'
                } p-6`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{promotion.name}</h3>
                      {isActive && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                          Active
                        </span>
                      )}
                      {!promotion.is_active && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                          Désactivée
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-600 font-medium mb-3">{promotion.label}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        {promotion.discount_type === 'percentage' ? (
                          <Percent size={16} className="text-emerald-500" />
                        ) : (
                          <Euro size={16} className="text-emerald-500" />
                        )}
                        <span>Réduction: <strong className="text-gray-900">{getDiscountDisplay(promotion)}</strong></span>
                      </div>

                      <div className="flex items-start gap-2 text-gray-700">
                        <Calendar size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-gray-600">Du {formatDateTime(promotion.start_date)}</div>
                          <div className="text-xs text-gray-600">au {formatDateTime(promotion.end_date)}</div>
                        </div>
                      </div>

                      <div className="text-gray-700">
                        <span className="text-gray-600">Terrains:</span>
                        <div className="text-gray-900 text-xs mt-1">
                          {getCourtNames(promotion.court_ids) || 'Aucun terrain'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(promotion)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                      title={promotion.is_active ? 'Désactiver' : 'Activer'}
                    >
                      <AlertCircle size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingPromotion(promotion);
                        setShowForm(true);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                      title="Modifier"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promotion.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PromotionForm
          promotion={editingPromotion}
          courts={courts}
          onSubmit={editingPromotion ? handleUpdatePromotion : handleCreatePromotion}
          onClose={() => {
            setShowForm(false);
            setEditingPromotion(undefined);
          }}
        />
      )}
    </div>
  );
}
