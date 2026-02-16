import { useState } from 'react';

interface EditAbsenceModalProps {
  absence: any;
  onSave: (updatedAbsence: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EditAbsenceModal({
  absence,
  onSave,
  onCancel,
  isLoading = false
}: EditAbsenceModalProps) {
  const [formData, setFormData] = useState({
    type: absence.type,
    start_date: absence.start_date,
    end_date: absence.end_date || '',  // Empty string instead of start_date
    reason: absence.reason || ''
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h3 className="text-xl font-bold text-white mb-4">Verlof Bewerken</h3>
        
        <div className="space-y-4 mb-6">
          {/* Type selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            >
              <option value="sick">Ziek</option>
              <option value="vacation">Vakantie</option>
              <option value="personal">Persoonlijk</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Startdatum</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Einddatum</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Laat leeg voor doorlopend ziekteverlof</p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Reden</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
              rows={3}
            />
          </div>
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
