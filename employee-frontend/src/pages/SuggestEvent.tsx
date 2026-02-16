import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function SuggestEvent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    date: '',
    time_start: '',
    time_end: '',
    visibility: 'all'
  });

  // Fetch event categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/api/calendar/categories');
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (eventData: any) => {
      // Prepare payload
      const payload: any = {
        title: eventData.title,
        description: eventData.description || null,
        category_id: eventData.category_id ? parseInt(eventData.category_id) : null,
        date: eventData.date,
        time_start: eventData.time_start ? `${eventData.time_start}:00` : null,
        time_end: eventData.time_end ? `${eventData.time_end}:00` : null,
        visibility: eventData.visibility,
        assigned_user_ids: []
      };

      const response = await api.post('/api/calendar/events', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      // Reset form
      setFormData({
        title: '',
        description: '',
        category_id: '',
        date: '',
        time_start: '',
        time_end: '',
        visibility: 'all'
      });
      // Navigate back to calendar
      navigate('/calendar');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij aanmaken evenement');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Evenement Voorstellen</h1>
        <p className="text-gray-400 mt-1">Stel een nieuw evenement voor ter goedkeuring</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-ofa-bg border border-neutral-800 rounded-lg p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Titel <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-ofa-red"
            placeholder="Bijv. Teamborrel, Bedrijfsuitje, etc."
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Beschrijving
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-ofa-red"
            placeholder="Extra details over het evenement..."
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Categorie
          </label>
          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400">Geen categorieën beschikbaar</p>
            ) : (
              categories.map((cat: any) => (
                <label
                  key={cat.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    formData.category_id === cat.id.toString()
                      ? 'border-ofa-red bg-ofa-red/10'
                      : 'border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="category_id"
                    value={cat.id}
                    checked={formData.category_id === cat.id.toString()}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-4 h-4"
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <p className="text-white font-medium">{cat.name}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Datum <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-ofa-red"
          />
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Starttijd
            </label>
            <input
              type="time"
              value={formData.time_start}
              onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-ofa-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Eindtijd
            </label>
            <input
              type="time"
              value={formData.time_end}
              onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-ofa-red"
            />
          </div>
        </div>

        {/* Info message */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            ℹ️ Je evenement wordt ter goedkeuring naar de admin gestuurd. Na goedkeuring verschijnt het op de kalender.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col md:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            disabled={mutation.isPending}
            className="flex-1 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-6 py-3 bg-ofa-red hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-neutral-700"
          >
            {mutation.isPending ? 'Indienen...' : 'Evenement Voorstellen'}
          </button>
        </div>
      </form>
    </div>
  );
}
