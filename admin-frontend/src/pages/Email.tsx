import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../utils/api';
import type { User, BulkEmailRequest, BulkEmailResponse } from '../types/api';

export default function Email() {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [externalEmails, setExternalEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/api/users');
      return response.data;
    },
  });

  // Filter active employees
  const activeEmployees = useMemo(
    () => users.filter(u => u.role === 'employee' && u.is_active),
    [users]
  );

  // Calculate total recipients
  const totalRecipients = useMemo(() => {
    const externalCount = externalEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0).length;
    return selectedEmployeeIds.length + externalCount;
  }, [selectedEmployeeIds, externalEmails]);

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: BulkEmailRequest) => {
      const response = await api.post<BulkEmailResponse>('/api/email/send', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.failed_emails.length === 0) {
        // Full success - reset form without alert
        setSelectedEmployeeIds([]);
        setExternalEmails('');
        setSubject('');
        setMessage('');
      } else if (data.failed_emails.length > 0 && data.successful_count > 0) {
        // Partial failure
        alert(
          `${data.successful_count}/${data.total_recipients} verzonden.\n\nMislukt: ${data.failed_emails.join(', ')}`
        );
      } else {
        // Full failure
        alert(`Alle e-mails zijn mislukt:\n${data.failed_emails.join(', ')}`);
      }
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij verzenden e-mails');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse external emails
    const parsedExternalEmails = externalEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    sendEmailMutation.mutate({
      employee_ids: selectedEmployeeIds,
      external_emails: parsedExternalEmails,
      subject,
      message,
    });
  };

  // Toggle all employees
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployeeIds(activeEmployees.map(emp => emp.id));
    } else {
      setSelectedEmployeeIds([]);
    }
  };

  // Toggle individual employee
  const handleToggleEmployee = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedEmployeeIds([...selectedEmployeeIds, userId]);
    } else {
      setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== userId));
    }
  };

  const allSelected = activeEmployees.length > 0 && selectedEmployeeIds.length === activeEmployees.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">E-mail Verzenden</h1>
        <p className="text-gray-400 mt-1">Verstuur bulk e-mails naar medewerkers en externe ontvangers</p>
      </div>

      {/* Email Form */}
      <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Medewerkers
            </label>

            {/* Select All Checkbox */}
            <label className="flex items-center gap-2 py-2 px-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg mb-2 hover:bg-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => handleToggleAll(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-white font-medium">Alle medewerkers</span>
            </label>

            {/* Employee List */}
            <div className="max-h-60 overflow-y-auto bg-ofa-bg-dark border border-neutral-700 rounded-lg p-3">
              {activeEmployees.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Geen actieve medewerkers gevonden</p>
              ) : (
                activeEmployees.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 py-1 hover:bg-neutral-800 px-2 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(user.id)}
                      onChange={(e) => handleToggleEmployee(user.id, e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-white text-sm">{user.username}</span>
                    <span className="text-gray-400 text-xs">({user.email})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* External Emails */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Externe E-mails (optioneel)
            </label>
            <textarea
              value={externalEmails}
              onChange={(e) => setExternalEmails(e.target.value)}
              placeholder="mail1@example.com, mail2@example.com"
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red resize-none"
              rows={3}
            />
            <p className="text-gray-500 text-xs mt-1">Gescheiden door komma's</p>
          </div>

          {/* Recipient Counter */}
          <div className="bg-ofa-bg-dark border border-neutral-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-medium">Totaal ontvangers:</span>
              <span className="text-2xl font-bold text-ofa-red">{totalRecipients}</span>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Onderwerp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red"
              placeholder="Voer onderwerp in"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bericht <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red resize-none"
              rows={10}
              placeholder="Voer bericht in"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={totalRecipients === 0 || !subject || !message || sendEmailMutation.isPending}
              className="px-6 py-3 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
            >
              {sendEmailMutation.isPending ? 'Verzenden...' : 'E-mail Verzenden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
