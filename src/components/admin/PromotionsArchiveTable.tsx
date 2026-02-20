import { Promotion, Court } from '../../types';
import { Calendar, Percent, Euro, Archive } from 'lucide-react';

interface PromotionsArchiveTableProps {
  promotions: Promotion[];
  courts: Court[];
}

export function PromotionsArchiveTable({ promotions, courts }: PromotionsArchiveTableProps) {
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

  if (promotions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-600">
          <Archive size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aucune promotion archivée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Label
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Réduction
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Terrains
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Période
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {promotions.map((promotion) => {
              const now = new Date();
              const currentStr = now.toISOString().slice(0, 16);
              const endStr = promotion.end_date.slice(0, 16);
              const isExpired = endStr < currentStr;
              const isInactive = !promotion.is_active;

              return (
                <tr key={promotion.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {promotion.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {promotion.label}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      {promotion.discount_type === 'percentage' ? (
                        <Percent size={14} />
                      ) : (
                        <Euro size={14} />
                      )}
                      {getDiscountDisplay(promotion)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {getCourtNames(promotion.court_ids) || 'Aucun terrain'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-start gap-1">
                      <Calendar size={14} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <div>{formatDateTime(promotion.start_date)}</div>
                        <div className="text-xs">→ {formatDateTime(promotion.end_date)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {isInactive ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                        Désactivée
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-600">
                        Expirée
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
