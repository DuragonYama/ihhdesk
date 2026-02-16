import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';

interface EditCalendarEventModalProps {
  event: any;
  onSave: (updatedEvent: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EditCalendarEventModal({
  event,
  onSave,
  onCancel,
  isLoading = false
}: EditCalendarEventModalProps) {
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    category_id: event.category_id || '',
    date: event.date || '',
    time_start: event.time_start?.substring(0, 5) || '',
    time_end: event.time_end?.substring(0, 5) || ''
  });

  // Fetch event categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/api/calendar/categories');
      return response.data;
    },
  });

  const handleSave = () => {
    const updates: any = {
      title: formData.title,
      description: formData.description,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      date: formData.date
    };

    // Add times if provided
    if (formData.time_start) {
      updates.time_start = formData.time_start + ':00';
    } else {
      updates.time_start = null;
    }

    if (formData.time_end) {
      updates.time_end = formData.time_end + ':00';
    } else {
      updates.time_end = null;
    }

    onSave(updates);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h3 className="text-xl font-bold text-white mb-4">Evenement Bewerken</h3>

        <div className="space-y-4 mb-6">
          {/* Title */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Titel</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Beschrijving</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
              rows={3}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Categorie</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            >
              <option value="">Geen categorie</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Datum</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Starttijd</label>
              <input
                type="time"
                value={formData.time_start}
                onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Optioneel</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Eindtijd</label>
              <input
                type="time"
                value={formData.time_end}
                onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Optioneel</p>
            </div>
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
