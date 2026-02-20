interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  timeSlots: TimeSlot[];
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
}

export function TimeSlotPicker({ timeSlots, selectedSlot, onSelectSlot }: TimeSlotPickerProps) {
  if (timeSlots.length === 0) {
    return (
      <div className="text-neutral-400 text-sm text-center py-4">
        Aucun créneau disponible pour cette date
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-2">
        Créneaux disponibles
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
        {timeSlots.map((slot) => (
          <button
            key={slot.time}
            type="button"
            disabled={!slot.available}
            onClick={() => onSelectSlot(slot.time)}
            className={`px-3 py-2 text-sm rounded-lg border transition ${
              selectedSlot === slot.time
                ? 'bg-gradient-to-r from-[#866733] to-[#c4ab63] text-white border-[#c4ab63] shadow-lg shadow-[#866733]/60 ring-2 ring-[#c4ab63]/30 font-semibold'
                : slot.available
                ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:border-[#c4ab63] hover:shadow-md hover:shadow-[#c4ab63]/20'
                : 'bg-black text-neutral-600 border-neutral-900 cursor-not-allowed'
            }`}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  );
}
