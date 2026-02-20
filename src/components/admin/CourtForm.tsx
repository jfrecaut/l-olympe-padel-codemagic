import { useState } from 'react';
import { Upload, X } from 'lucide-react';

interface CourtFormProps {
  onSubmit: (name: string, capacity: 2 | 4, price: number, imageFile?: File) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function CourtForm({ onSubmit, onCancel, loading }: CourtFormProps) {
  const [courtName, setCourtName] = useState('');
  const [courtCapacity, setCourtCapacity] = useState<2 | 4>(4);
  const [courtPrice, setCourtPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceInCents = Math.round(parseFloat(courtPrice) * 100);
    await onSubmit(courtName, courtCapacity, priceInCents, imageFile || undefined);
    setCourtName('');
    setCourtCapacity(4);
    setCourtPrice('');
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom du court
          </label>
          <input
            type="text"
            value={courtName}
            onChange={(e) => setCourtName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capacité
          </label>
          <select
            value={courtCapacity}
            onChange={(e) => setCourtCapacity(parseInt(e.target.value) as 2 | 4)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value={2}>Terrain simple</option>
            <option value={4}>Terrain double</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prix (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={courtPrice}
            onChange={(e) => setCourtPrice(e.target.value)}
            placeholder="20.00"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo du court
          </label>
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition">
              <Upload className="w-12 h-12 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Cliquez pour ajouter une photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer le court'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
