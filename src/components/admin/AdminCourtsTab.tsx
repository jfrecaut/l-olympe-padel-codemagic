import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Court } from '../../types';
import { CourtForm } from './CourtForm';
import { CourtCard } from './CourtCard';

interface AdminCourtsTabProps {
  courts: Court[];
  onCreateCourt: (name: string, capacity: 2 | 4, price: number, imageFile?: File) => Promise<void>;
  onUpdateCourt: (courtId: string, updates: { name?: string; capacity?: number; price?: number; image_url?: string }, imageFile?: File) => Promise<void>;
  onDeleteCourt: (courtId: string) => void;
  loading: boolean;
}

export function AdminCourtsTab({
  courts,
  onCreateCourt,
  onUpdateCourt,
  onDeleteCourt,
  loading,
}: AdminCourtsTabProps) {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (name: string, capacity: 2 | 4, price: number, imageFile?: File) => {
    await onCreateCourt(name, capacity, price, imageFile);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Gestion des courts</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
        >
          <Plus size={20} />
          Ajouter un court
        </button>
      </div>

      {showForm && (
        <CourtForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          loading={loading}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map((court) => (
          <CourtCard
            key={court.id}
            court={court}
            onDelete={onDeleteCourt}
            onUpdate={onUpdateCourt}
          />
        ))}
      </div>
    </div>
  );
}
