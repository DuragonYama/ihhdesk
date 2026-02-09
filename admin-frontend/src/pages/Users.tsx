import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import type { User, CreateUserRequest } from '../types/api';

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export default function Users() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/api/users');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Medewerkers</h1>
          <p className="text-gray-400 mt-1">{users.length} medewerkers totaal</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-ofa-red hover:bg-ofa-red-hover text-white px-6 py-3 rounded-lg font-medium transition"
        >
          + Nieuwe Medewerker
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-ofa-bg rounded-lg border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Naam</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Email</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Rol</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Uren/Week</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Werkdagen</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {users.map((user) => (
                <UserRow key={user.id} user={user} onEdit={() => setEditingUser(user)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}

      {/* Edit Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </div>
  );
}

// User Row Component - fetches work schedule for each user
function UserRow({ user, onEdit }: { user: User; onEdit: () => void }) {
  return (
    <tr className="hover:bg-neutral-800/50 transition">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ofa-red rounded-full flex items-center justify-center text-white font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-white font-medium">{user.username}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-gray-400">{user.email}</td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          user.role === 'admin' ? 'bg-ofa-red/20 text-ofa-red' :
          user.role === 'developer' ? 'bg-blue-500/20 text-blue-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-400">
        {user.expected_weekly_hours || '-'}
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-1">
          {user.work_days && user.work_days.length > 0 ? (
            user.work_days.map((day: number) => (
              <span key={day} className="px-2 py-1 bg-ofa-red/20 text-ofa-red text-xs rounded">
                {DAYS[day]}
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-sm">Niet ingesteld</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          user.is_active
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {user.is_active ? 'Actief' : 'Inactief'}
        </span>
      </td>
      <td className="px-6 py-4">
        <button
          onClick={onEdit}
          className="text-ofa-red hover:text-ofa-red-hover font-medium transition"
        >
          Bewerken
        </button>
      </td>
    </tr>
  );
}

// Create User Modal Component
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'employee',
    expected_weekly_hours: 40,
    has_km_compensation: false,
  });
  const [workDays, setWorkDays] = useState<number[]>([0, 1, 2, 3, 4]); // Default: Mon-Fri
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const response = await api.post('/api/users', data);
      return response.data;
    },
    onSuccess: async (newUser) => {
      // Set work schedule
      await api.put(`/api/users/${newUser.id}/schedule`, { days: workDays });
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Fout bij aanmaken medewerker');
    },
  });

  const toggleDay = (day: number) => {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Nieuwe Medewerker</h2>

        {error && (
          <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gebruikersnaam
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Wachtwoord
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Verwachte Uren per Week
            </label>
            <input
              type="number"
              value={formData.expected_weekly_hours}
              onChange={(e) => setFormData({ ...formData, expected_weekly_hours: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          {/* Work Days Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Werkdagen
            </label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    workDays.includes(index)
                      ? 'bg-ofa-red text-white'
                      : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="km_comp"
              checked={formData.has_km_compensation}
              onChange={(e) => setFormData({ ...formData, has_km_compensation: e.target.checked })}
              className="w-4 h-4 text-ofa-red bg-ofa-bg-dark border-neutral-700 rounded"
            />
            <label htmlFor="km_comp" className="text-sm text-gray-300">
              KM Vergoeding
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {createMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, onClose, onSuccess }: { user: User; onClose: () => void; onSuccess: () => void }) {
  console.log('EditUserModal - user.work_days:', user.work_days);

  const [formData, setFormData] = useState({
    email: '',
    expected_weekly_hours: 0,
    has_km_compensation: false,
    is_active: true,
  });
  const [workDays, setWorkDays] = useState<number[]>([]);
  console.log('workDays STATE after init:', workDays);

  // Fetch full user details
  const { data: fullUser, isLoading } = useQuery({
    queryKey: ['user', user.id],
    queryFn: async () => {
      const response = await api.get<User>(`/api/users/${user.id}`);
      return response.data;
    },
  });

  // Update form data when full user details are loaded
  useEffect(() => {
    if (fullUser) {
      console.log('EditUserModal - fullUser loaded:', fullUser);
      console.log('EditUserModal - fullUser.work_days:', fullUser.work_days);

      setFormData({
        email: fullUser.email,
        expected_weekly_hours: fullUser.expected_weekly_hours || 0,
        has_km_compensation: fullUser.has_km_compensation || false,
        is_active: fullUser.is_active,
      });

      // Sync workDays from fullUser
      if (fullUser.work_days) {
        console.log('EditUserModal - Setting workDays to:', fullUser.work_days);
        setWorkDays(fullUser.work_days);
      } else {
        console.log('EditUserModal - No work_days in fullUser, setting to empty array');
        setWorkDays([]);
      }
    }
  }, [fullUser]);

  // Debug: Log workDays whenever it changes
  useEffect(() => {
    console.log('EditUserModal - workDays state changed to:', workDays);
  }, [workDays]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/api/users/${user.id}`, data);
      return response.data;
    },
    onSuccess: async () => {
      // Update work schedule
      await api.put(`/api/users/${user.id}/schedule`, { days: workDays });
      onSuccess();
    },
  });

  const toggleDay = (day: number) => {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Bewerk: {user.username}</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400">Laden...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Verwachte Uren per Week
            </label>
            <input
              type="number"
              value={formData.expected_weekly_hours}
              onChange={(e) => setFormData({ ...formData, expected_weekly_hours: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          {/* Work Days Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Werkdagen
            </label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    workDays.includes(index)
                      ? 'bg-ofa-red text-white'
                      : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="km_comp_edit"
              checked={formData.has_km_compensation}
              onChange={(e) => setFormData({ ...formData, has_km_compensation: e.target.checked })}
              className="w-4 h-4 text-ofa-red bg-ofa-bg-dark border-neutral-700 rounded"
            />
            <label htmlFor="km_comp_edit" className="text-sm text-gray-300">
              KM Vergoeding
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-ofa-red bg-ofa-bg-dark border-neutral-700 rounded"
            />
            <label htmlFor="is_active_edit" className="text-sm text-gray-300">
              Actief
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition"
            >
              {updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}