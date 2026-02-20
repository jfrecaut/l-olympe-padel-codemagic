import { Court, Promotion } from '../../types';
import { Check } from 'lucide-react';

interface CourtSelectorProps {
  courts: Court[];
  selectedCourtId: string | null;
  onSelectCourt: (courtId: string) => void;
  getPromotionForCourt?: (court: Court) => { promotion: Promotion; discountedPrice: number } | null;
}

export function CourtSelector({ courts, selectedCourtId, onSelectCourt, getPromotionForCourt }: CourtSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courts.map((court) => {
        const promotionData = getPromotionForCourt ? getPromotionForCourt(court) : null;
        const finalPrice = promotionData ? promotionData.discountedPrice : court.price;

        return (
        <button
          key={court.id}
          type="button"
          onClick={() => onSelectCourt(court.id)}
          className={`relative overflow-hidden rounded-lg border-2 transition-all ${
            selectedCourtId === court.id
              ? 'border-[#c4ab63] shadow-2xl shadow-[#866733]/60 scale-105 ring-4 ring-[#c4ab63]/30'
              : 'border-gray-200 hover:border-[#c4ab63] hover:shadow-lg hover:shadow-[#c4ab63]/30'
          }`}
        >
          {court.image_url ? (
            <div className="relative">
              <img
                src={court.image_url}
                alt={court.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="text-lg font-semibold mb-1">{court.name}</h3>
                <div className="flex items-center justify-between text-sm">
                  <span>{court.capacity === 2 ? 'Terrain simple' : 'Terrain double'}</span>
                  <div className="flex items-center gap-2">
                    {promotionData ? (
                      <>
                        <span className="line-through text-white/60">{(court.price / 100).toFixed(2)} €</span>
                        <span className="font-semibold text-green-400">
                          {finalPrice === 0 ? 'Gratuit' : `${(finalPrice / 100).toFixed(2)} €`}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold">{(court.price / 100).toFixed(2)} €</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 p-4">
              <div className="text-6xl mb-4">🎾</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{court.name}</h3>
              <div className="flex items-center justify-between gap-4 text-sm text-gray-600">
                <span>{court.capacity === 2 ? 'Terrain simple' : 'Terrain double'}</span>
                <div className="flex items-center gap-2">
                  {promotionData ? (
                    <>
                      <span className="line-through text-gray-400">{(court.price / 100).toFixed(2)} €</span>
                      <span className="font-bold text-green-600">
                        {finalPrice === 0 ? 'Gratuit' : `${(finalPrice / 100).toFixed(2)} €`}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-yellow-700">{(court.price / 100).toFixed(2)} €</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedCourtId === court.id && (
            <div className="absolute top-2 right-2 bg-gradient-to-br from-[#866733] to-[#c4ab63] text-white rounded-full p-1.5 shadow-xl shadow-[#866733]/70 ring-2 ring-white/30">
              <Check size={20} />
            </div>
          )}
        </button>
        );
      })}
    </div>
  );
}
