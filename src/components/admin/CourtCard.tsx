import { useState } from 'react';
import { Trash2, Users, Edit2, Save, X, Euro, Upload } from 'lucide-react';
import { Court } from '../../types';

interface CourtCardProps {
  court: Court;
  onDelete: (courtId: string) => void;
  onUpdate: (courtId: string, updates: { name?: string; capacity?: number; price?: number }, imageFile?: File) => Promise<void>;
}

export function CourtCard({ court, onDelete, onUpdate }: CourtCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(court.name);
  const [editCapacity, setEditCapacity] = useState<2 | 4>(court.capacity);
  const [editPrice, setEditPrice] = useState((court.price / 100).toFixed(2));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates: any = {};
      if (editName !== court.name) updates.name = editName;
      if (editCapacity !== court.capacity) updates.capacity = editCapacity;
      const priceInCents = Math.round(parseFloat(editPrice) * 100);
      if (priceInCents !== court.price) updates.price = priceInCents;

      if (Object.keys(updates).length > 0 || imageFile) {
        await onUpdate(court.id, updates, imageFile || undefined);
      }
      setIsEditing(false);
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditName(court.name);
    setEditCapacity(court.capacity);
    setEditPrice((court.price / 100).toFixed(2));
    setImageFile(null);
    setImagePreview(null);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-emerald-500">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du court
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacité
            </label>
            <select
              value={editCapacity}
              onChange={(e) => setEditCapacity(parseInt(e.target.value) as 2 | 4)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
            ) : court.image_url ? (
              <div className="relative">
                <img
                  src={court.image_url}
                  alt={court.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-lg cursor-pointer opacity-0 hover:opacity-100 transition">
                  <Upload className="w-12 h-12 text-white mb-2" />
                  <span className="text-sm text-white">Changer la photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
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
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
            >
              <Save size={16} />
              Enregistrer
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              <X size={16} />
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm overflow-hidden ${
        !court.is_active ? 'opacity-50' : ''
      }`}
    >
      {court.image_url && (
        <img
          src={court.image_url}
          alt={court.name}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{court.name}</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Users size={16} />
                {court.capacity === 2 ? 'Terrain simple' : 'Terrain double'}
              </div>
              <div className="flex items-center gap-2">
                <Euro size={16} />
                {(court.price / 100).toFixed(2)} €
              </div>
              <div className="text-xs">
                {court.is_active ? (
                  <span className="text-emerald-600">Actif</span>
                ) : (
                  <span className="text-red-600">Inactif</span>
                )}
              </div>
            </div>
          </div>
          {court.is_active && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="text-emerald-500 hover:text-emerald-700 transition"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => onDelete(court.id)}
                className="text-red-500 hover:text-red-700 transition"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
