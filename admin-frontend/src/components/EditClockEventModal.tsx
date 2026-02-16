import { useState } from 'react';

interface EditClockEventModalProps {
  event: any;
  onSave: (updatedEvent: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EditClockEventModal({
  event,
  onSave,
  onCancel,
  isLoading = false
}: EditClockEventModalProps) {
  const [formData, setFormData] = useState({
    clock_in: event.clock_in?.substring(0, 5) || '10:00',
    clock_out: event.clock_out?.substring(0, 5) || '18:00',
    came_by_car: event.came_by_car || false,
    parking_cost: event.parking_cost || '',
    km_driven: event.km_driven || ''
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h3 className="text-xl font-bold text-white mb-4">Uurregistratie Bewerken</h3>
        
        <div className="space-y-4 mb-6">
          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Starttijd</label>
              <input
                type="time"
                value={formData.clock_in}
                onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Eindtijd</label>
              <input
                type="time"
                value={formData.clock_out}
                onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
              />
            </div>
          </div>

          {/* Car checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.came_by_car}
              onChange={(e) => setFormData({ ...formData, came_by_car: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-white">Met auto gekomen</span>
          </label>

          {/* Car details (if checked) */}
          {formData.came_by_car && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Parkeerkosten (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.parking_cost}
                  onChange={(e) => setFormData({ ...formData, parking_cost: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Kilometers</label>
                <input
                  type="number"
                  value={formData.km_driven}
                  onChange={(e) => setFormData({ ...formData, km_driven: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:bg-neutral-700"
          >
            {isLoading ? 'Opslaan...' : 'Opslaan & Goedkeuren'}
          </button>
        </div>
      </div>
    </div>
  );
}
