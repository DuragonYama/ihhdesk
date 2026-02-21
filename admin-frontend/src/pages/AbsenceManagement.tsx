import { useState, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import type { User, Absence, ApproveRejectRequest, AdminCreateAbsenceRequest, UpdateAbsenceRequest } from '../types/api';
import BulkAbsenceModal from '../components/BulkAbsenceModal';

const TYPE_COLORS: Record<string, string> = {
  sick: 'bg-blue-500/20 text-blue-400',
  personal: 'bg-green-500/20 text-green-400',
  vacation: 'bg-cyan-500/20 text-cyan-400',
};

const TYPE_NAMES_NL: Record<string, string> = {
  sick: 'Ziek',
  personal: 'Persoonlijk',
  vacation: 'Vakantie',
};

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  approved: 'bg-green-900/30 text-green-400',
  rejected: 'bg-red-900/30 text-red-400',
};

const STATUS_NAMES_NL: Record<string, string> = {
  pending: 'Wachtend',
  approved: 'Goedgekeurd',
  rejected: 'Afgewezen',
};

export default function AbsenceManagement() {
  const [selectedEmployee, setSelectedEmployee] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [approvingAbsence, setApprovingAbsence] = useState<Absence | null>(null);
  const [rejectingAbsence, setRejectingAbsence] = useState<Absence | null>(null);
  const [deletingAbsence, setDeletingAbsence] = useState<Absence | null>(null);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/api/users');
      return response.data;
    },
  });

  // Fetch all absences in a single bulk query
  const { data: allAbsences = [], isLoading } = useQuery({
    queryKey: ['absences', 'all'],
    queryFn: async () => {
      const response = await api.get<Absence[]>('/api/absences/all');
      return response.data;
    },
  });

  // Filter absences based on selected filters
  const filteredAbsences = useMemo(() => {
    let filtered = [...allAbsences];

    // Employee filter
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(a => a.user_id === selectedEmployee);
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(a => a.status === selectedStatus);
    }

    // Date range filter
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      filtered = filtered.filter(a => {
        const absenceDate = new Date(a.start_date);

        switch (selectedDateRange) {
          case 'this-month':
            return absenceDate.getFullYear() === currentYear && absenceDate.getMonth() === currentMonth;
          case 'last-month':
            const lastMonth = new Date(currentYear, currentMonth - 1);
            return absenceDate.getFullYear() === lastMonth.getFullYear() && absenceDate.getMonth() === lastMonth.getMonth();
          case 'this-year':
            return absenceDate.getFullYear() === currentYear;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [allAbsences, selectedEmployee, selectedType, selectedStatus, selectedDateRange]);

  // Group absences by employee
  const absencesByEmployee = useMemo(() => {
    const employees = users.filter(u => u.role === 'employee' && u.is_active);
    const grouped = new Map<number, { user: User; absences: Absence[] }>();

    employees.forEach(user => {
      const userAbsences = filteredAbsences.filter(a => a.user_id === user.id);
      grouped.set(user.id, { user, absences: userAbsences });
    });

    return Array.from(grouped.values());
  }, [users, filteredAbsences]);

  const resetFilters = () => {
    setSelectedEmployee('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedDateRange('all');
  };

  const toggleEmployee = (userId: number) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedEmployees(newExpanded);
  };

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
      <div>
        <h1 className="text-2xl font-bold text-white">Verlofbeheer</h1>
        <p className="text-gray-400 mt-1">Beheer en bekijk alle verlofaanvragen</p>
      </div>

      {/* Filters */}
      <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-6">
        <div className="grid grid-cols-4 gap-4">
          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Medewerker</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="all">Alle medewerkers</option>
              {users.filter(u => u.role === 'employee' && u.is_active).map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="all">Alle types</option>
              <option value="sick">Ziek</option>
              <option value="vacation">Vakantie</option>
              <option value="personal">Persoonlijk</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="all">Alle statussen</option>
              <option value="pending">Wachtend</option>
              <option value="approved">Goedgekeurd</option>
              <option value="rejected">Afgewezen</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Periode</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="all">Alle datums</option>
              <option value="this-month">Deze maand</option>
              <option value="last-month">Vorige maand</option>
              <option value="this-year">Dit jaar</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
          >
            Reset Filters
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              + Massa Verlof
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition"
            >
              + Nieuw Verlof
            </button>
          </div>
        </div>
      </div>

      {/* Absences by Employee */}
      <div className="space-y-4">
        {absencesByEmployee.length === 0 ? (
          <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-12 text-center">
            <p className="text-gray-400 text-lg">Geen medewerkers gevonden</p>
          </div>
        ) : (
          absencesByEmployee.map(({ user, absences }) => (
            <EmployeeAbsenceSection
              key={user.id}
              user={user}
              absences={absences}
              isExpanded={expandedEmployees.has(user.id)}
              onToggle={() => toggleEmployee(user.id)}
              onEdit={setEditingAbsence}
              onApprove={setApprovingAbsence}
              onReject={setRejectingAbsence}
              onDelete={setDeletingAbsence}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateAbsenceModal
          users={users.filter(u => u.role === 'employee' && u.is_active)}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['absences', 'all'] });
          }}
        />
      )}

      {showBulkModal && (
        <BulkAbsenceModal
          users={users}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            queryClient.invalidateQueries({ queryKey: ['absences', 'all'] });
          }}
        />
      )}

      {editingAbsence && (
        <EditAbsenceModal
          absence={editingAbsence}
          onClose={() => setEditingAbsence(null)}
          onSuccess={() => {
            setEditingAbsence(null);
            queryClient.invalidateQueries({ queryKey: ['absences', 'all'] });
          }}
        />
      )}

      {approvingAbsence && (
        <ApproveModal
          absence={approvingAbsence}
          onClose={() => setApprovingAbsence(null)}
          onSuccess={() => {
            setApprovingAbsence(null);
            queryClient.invalidateQueries({ queryKey: ['absences', 'all'] });
          }}
        />
      )}

      {rejectingAbsence && (
        <RejectModal
          absence={rejectingAbsence}
          onClose={() => setRejectingAbsence(null)}
          onSuccess={() => {
            setRejectingAbsence(null);
            queryClient.invalidateQueries({ queryKey: ['absences', 'all'] });
          }}
        />
      )}

      {deletingAbsence && (
        <DeleteConfirmModal
          absence={deletingAbsence}
          onClose={() => setDeletingAbsence(null)}
          onSuccess={() => {
            setDeletingAbsence(null);
            queryClient.invalidateQueries({ queryKey: ['absences', 'all'] });
          }}
        />
      )}
    </div>
  );
}

// Employee Absence Section Component
function EmployeeAbsenceSection({
  user,
  absences,
  isExpanded,
  onToggle,
  onEdit,
  onApprove,
  onReject,
  onDelete,
}: {
  user: User;
  absences: Absence[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (absence: Absence) => void;
  onApprove: (absence: Absence) => void;
  onReject: (absence: Absence) => void;
  onDelete: (absence: Absence) => void;
}) {
  // Sort absences by date (newest first)
  const sortedAbsences = [...absences].sort((a, b) =>
    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  return (
    <div className="bg-ofa-bg rounded-lg border border-neutral-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-800/50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
          <div className="w-10 h-10 bg-ofa-red rounded-full flex items-center justify-center text-white font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <h3 className="text-white font-medium">{user.username}</h3>
            <p className="text-gray-400 text-sm">{absences.length} verlofaanvragen</p>
          </div>
        </div>
      </button>

      {/* Absences List */}
      {isExpanded && (
        <div className="border-t border-neutral-800">
          {sortedAbsences.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-400">Geen verlofaanvragen</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {sortedAbsences.map((absence) => (
                <AbsenceItem
                  key={absence.id}
                  absence={absence}
                  onEdit={onEdit}
                  onApprove={onApprove}
                  onReject={onReject}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Absence Item Component
function AbsenceItem({
  absence,
  onEdit,
  onApprove,
  onReject,
  onDelete,
}: {
  absence: Absence;
  onEdit: (absence: Absence) => void;
  onApprove: (absence: Absence) => void;
  onReject: (absence: Absence) => void;
  onDelete: (absence: Absence) => void;
}) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Type and Status Badges */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[absence.type]}`}>
              {TYPE_NAMES_NL[absence.type]}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[absence.status]}`}>
              {STATUS_NAMES_NL[absence.status]}
            </span>
          </div>

          {/* Date */}
          <p className="text-white font-medium">
            {formatDateNL(absence.start_date)}
            {absence.end_date && absence.end_date !== absence.start_date ? (
              <> t/m {formatDateNL(absence.end_date)}</>
            ) : absence.end_date === null ? (
              <> - Nog actief</>
            ) : null}
          </p>

          {/* Reason */}
          <p className="text-gray-400 text-sm mt-1">
            Reden: {absence.reason}
          </p>

          {/* Review Info */}
          {absence.status !== 'pending' && absence.reviewed_at && (
            <p className="text-gray-500 text-xs mt-2">
              {STATUS_NAMES_NL[absence.status]} op {new Date(absence.reviewed_at).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {absence.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(absence)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
              >
                Goedkeuren
              </button>
              <button
                onClick={() => onReject(absence)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
              >
                Afwijzen
              </button>
            </>
          )}
          <button
            onClick={() => onEdit(absence)}
            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm rounded-lg transition"
          >
            Bewerken
          </button>
          <button
            onClick={() => onDelete(absence)}
            className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition"
            title="Verwijderen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to format dates in Dutch
function formatDateNL(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Create Absence Modal
function CreateAbsenceModal({
  users,
  onClose,
  onSuccess,
}: {
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<AdminCreateAbsenceRequest>({
    user_id: users[0]?.id || 0,
    start_date: '',
    end_date: '',
    type: 'sick',
    reason: '',
    auto_approve: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: AdminCreateAbsenceRequest) => {
      const response = await api.post('/api/absences/admin', data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij aanmaken verlof');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-4">Nieuw Verlof Aanmaken</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Medewerker <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: parseInt(e.target.value) })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'sick' | 'personal' | 'vacation' })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="sick">Ziek</option>
              <option value="vacation">Vakantie</option>
              <option value="personal">Persoonlijk</option>
            </select>
          </div>

          {/* Start Date */}
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

          {/* End Date */}
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
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              rows={3}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red resize-none"
              placeholder="Voer reden in"
            />
          </div>

          {/* Auto Approve */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto_approve"
              checked={formData.auto_approve}
              onChange={(e) => setFormData({ ...formData, auto_approve: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="auto_approve" className="text-sm text-gray-300">
              Direct goedkeuren
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
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

// Edit Absence Modal
function EditAbsenceModal({
  absence,
  onClose,
  onSuccess,
}: {
  absence: Absence;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<UpdateAbsenceRequest>({
    start_date: absence.start_date,
    reason: absence.reason,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateAbsenceRequest) => {
      const response = await api.patch(`/api/absences/${absence.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij bijwerken verlof');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const isPastAbsence = new Date(absence.start_date) < new Date();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-4">Verlof Bewerken</h2>

        {isPastAbsence && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <p className="text-yellow-400 text-sm">
              ⚠️ Let op: wijzigen van data kan balansberekeningen beïnvloeden
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Startdatum
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reden
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red resize-none"
            />
          </div>

          {/* Info */}
          <div className="p-3 bg-neutral-800 rounded-lg">
            <p className="text-gray-400 text-sm">
              Type en medewerker kunnen niet worden gewijzigd
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Approve Modal (reused from Approvals page)
function ApproveModal({
  absence,
  onClose,
  onSuccess,
}: {
  absence: Absence;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [message, setMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);

  const approveMutation = useMutation({
    mutationFn: async (data: ApproveRejectRequest) => {
      const response = await api.patch(`/api/absences/${absence.id}/approve`, data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approveMutation.mutate(useCustomMessage ? { message } : {});
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-4">Aanvraag Goedkeuren</h2>

        <div className="mb-4 p-4 bg-neutral-800 rounded-lg">
          <p className="text-gray-400 text-sm">
            <span className="font-medium text-white">{absence.username}</span> - {TYPE_NAMES_NL[absence.type]}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {formatDateNL(absence.start_date)}
            {absence.end_date && absence.end_date !== absence.start_date && (
              <> t/m {formatDateNL(absence.end_date)}</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom_message"
              checked={useCustomMessage}
              onChange={(e) => setUseCustomMessage(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="custom_message" className="text-sm text-gray-300">
              Voeg persoonlijk bericht toe
            </label>
          </div>

          {useCustomMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bericht (optioneel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red resize-none"
                placeholder="Bijvoorbeeld: Geniet van je vrije tijd!"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={approveMutation.isPending}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={approveMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {approveMutation.isPending ? 'Goedkeuren...' : 'Goedkeuren'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reject Modal (reused from Approvals page)
function RejectModal({
  absence,
  onClose,
  onSuccess,
}: {
  absence: Absence;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [message, setMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);

  const rejectMutation = useMutation({
    mutationFn: async (data: ApproveRejectRequest) => {
      const response = await api.patch(`/api/absences/${absence.id}/reject`, data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rejectMutation.mutate(useCustomMessage ? { message } : {});
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-4">Aanvraag Afwijzen</h2>

        <div className="mb-4 p-4 bg-neutral-800 rounded-lg">
          <p className="text-gray-400 text-sm">
            <span className="font-medium text-white">{absence.username}</span> - {TYPE_NAMES_NL[absence.type]}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {formatDateNL(absence.start_date)}
            {absence.end_date && absence.end_date !== absence.start_date && (
              <> t/m {formatDateNL(absence.end_date)}</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom_message_reject"
              checked={useCustomMessage}
              onChange={(e) => setUseCustomMessage(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="custom_message_reject" className="text-sm text-gray-300">
              Voeg reden toe
            </label>
          </div>

          {useCustomMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reden (optioneel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red resize-none"
                placeholder="Bijvoorbeeld: We hebben je nodig in die periode."
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={rejectMutation.isPending}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={rejectMutation.isPending}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {rejectMutation.isPending ? 'Afwijzen...' : 'Afwijzen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  absence,
  onClose,
  onSuccess,
}: {
  absence: Absence;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/absences/${absence.id}`);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij verwijderen verlof');
    },
  });

  const isPastAbsence = new Date(absence.start_date) < new Date();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-4">Verlof Verwijderen</h2>

        <div className="mb-4 p-4 bg-neutral-800 rounded-lg">
          <p className="text-gray-400 text-sm">
            <span className="font-medium text-white">{absence.username}</span> - {TYPE_NAMES_NL[absence.type]}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {formatDateNL(absence.start_date)}
            {absence.end_date && absence.end_date !== absence.start_date && (
              <> t/m {formatDateNL(absence.end_date)}</>
            )}
          </p>
        </div>

        {isPastAbsence && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm">
              ⚠️ Dit kan balansberekeningen beïnvloeden als het verlof in het verleden ligt
            </p>
          </div>
        )}

        <p className="text-gray-300 mb-6">
          Weet je zeker dat je dit verlof wilt verwijderen?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
          >
            Annuleren
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 text-white rounded-lg transition"
          >
            {deleteMutation.isPending ? 'Verwijderen...' : 'Verwijderen'}
          </button>
        </div>
      </div>
    </div>
  );
}
