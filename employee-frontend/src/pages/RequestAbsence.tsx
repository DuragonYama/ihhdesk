import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function RequestAbsence() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    type: 'vacation' as 'sick' | 'vacation' | 'personal',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const requestMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        type: data.type,
        start_date: data.start_date,
        reason: data.reason
      };

      // For sick/personal leave: allow NULL end_date (ongoing)
      // For vacation: require end_date (defaults to start_date if not specified)
      if (data.type === 'sick' || data.type === 'personal') {
        // Only set end_date if user explicitly entered one
        if (data.end_date) {
          payload.end_date = data.end_date;
        }
        // Otherwise: NULL = ongoing sick leave
      } else {
        // Vacation always needs an end date
        payload.end_date = data.end_date || data.start_date;
      }

      const response = await api.post('/api/absences/', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      alert('Verlof aangevraagd - wacht op goedkeuring');
      navigate('/absences');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij aanvragen');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.start_date) {
      alert('Startdatum is verplicht');
      return;
    }

    if (!formData.reason.trim()) {
      alert('Reden is verplicht');
      return;
    }

    requestMutation.mutate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/absences')}
          className="text-gray-400 hover:text-white"
        >
          ← Terug
        </button>
        <h1 className="text-xl font-bold text-white">Verlof Aanvragen</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selection */}
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Type Verlof
          </label>
          <div className="space-y-2">
            {[
              { value: 'sick', label: '🏥 Ziek', desc: 'Ziekmelding' },
              { value: 'vacation', label: '🏖️ Vakantie', desc: 'Vakantieverlof' },
              { value: 'personal', label: '📋 Persoonlijk', desc: 'Persoonlijke omstandigheden' }
            ].map((type) => (
              <label
                key={type.value}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                  formData.type === type.value
                    ? 'border-ofa-red bg-ofa-red/10'
                    : 'border-neutral-700 hover:border-neutral-600'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={formData.type === type.value}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-white font-medium">{type.label}</p>
                  <p className="text-sm text-gray-400">{type.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Startdatum *
            </label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Einddatum (optioneel)
            </label>
            <input
              type="date"
              value={formData.end_date}
              min={formData.start_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-4 py-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.type === 'sick' || formData.type === 'personal'
                ? 'Laat leeg als je nog niet weet wanneer je terugkomt'
                : 'Laat leeg voor één dag'}
            </p>
          </div>
        </div>

        {/* Reason */}
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Reden *
          </label>
          <textarea
            required
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            rows={4}
            placeholder="Waarom vraag je verlof aan?"
            className="w-full px-4 py-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/absences')}
            className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={requestMutation.isPending}
            className="flex-1 py-3 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded-lg transition"
          >
            {requestMutation.isPending ? 'Aanvragen...' : 'Verlof Aanvragen'}
          </button>
        </div>
      </form>
    </div>
  );
}
