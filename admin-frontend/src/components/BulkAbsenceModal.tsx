import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import type { User } from '../types/api';

interface BulkAbsenceModalProps {
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkAbsenceModal({
  users,
  onClose,
  onSuccess,
}: BulkAbsenceModalProps) {
  const [formData, setFormData] = useState({
    user_ids: [] as number[],
    start_date: '',
    end_date: '',
    type: 'vacation' as 'sick' | 'personal' | 'vacation',
    reason: 'Bedrijfsvakantie',
    auto_approve: true,
  });

  const [selectAll, setSelectAll] = useState(false);
  const queryClient = useQueryClient();

  const createBulkMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/api/absences/bulk', {
        user_ids: data.user_ids,
        start_date: data.start_date,
        end_date: data.end_date || null,
        absence_type: data.type,
        reason: data.reason,
        auto_approve: data.auto_approve,
      });
      return response.data;
    },
    onSuccess: (data) => {
      alert(`${data.created_count} verlofaanvragen aangemaakt${data.failed_count > 0 ? `, ${data.failed_count} mislukt` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij massa verlof aanmaken');
    },
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const activeEmployees = users.filter(u => u.is_active && u.role === 'employee');
      setFormData({
        ...formData,
        user_ids: activeEmployees.map(u => u.id)
      });
    } else {
      setFormData({ ...formData, user_ids: [] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.user_ids.length === 0) {
      alert('Selecteer minimaal 1 medewerker');
      return;
    }
    createBulkMutation.mutate(formData);
  };

  const activeEmployees = users.filter(u => u.is_active && u.role === 'employee');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800 my-8">
        <h2 className="text-xl font-bold text-white mb-4">Massa Verlof Toevoegen</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Medewerkers ({formData.user_ids.length} geselecteerd)
            </label>

            <div className="mb-2">
              <label className="flex items-center gap-2 py-1 px-2 hover:bg-neutral-800 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-white font-medium">Selecteer Alles</span>
              </label>
            </div>

            <div className="max-h-40 overflow-y-auto bg-ofa-bg-dark border border-neutral-700 rounded-lg p-3">
              {activeEmployees.map((user) => (
                <label key={user.id} className="flex items-center gap-2 py-1 hover:bg-neutral-800 px-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.user_ids.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          user_ids: [...formData.user_ids, user.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          user_ids: formData.user_ids.filter(id => id !== user.id)
                        });
                        setSelectAll(false);
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-white text-sm">{user.username}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="vacation">Vakantie</option>
              <option value="sick">Ziek</option>
              <option value="personal">Persoonlijk</option>
            </select>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Startdatum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Einddatum (optioneel - laat leeg voor 1 dag)
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              min={formData.start_date}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reden <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          {/* Auto approve */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_approve}
                onChange={(e) => setFormData({ ...formData, auto_approve: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-white text-sm">Direct goedkeuren</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createBulkMutation.isPending}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={createBulkMutation.isPending}
              className="flex-1 px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {createBulkMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
