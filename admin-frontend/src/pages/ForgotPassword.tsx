import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const requestResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij aanvragen reset');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      alert('Voer je e-mailadres in');
      return;
    }

    requestResetMutation.mutate(email);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-ofa-bg-dark flex items-center justify-center p-4">
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-white mb-2">Email Verzonden</h2>
            <p className="text-gray-400">
              Als dit e-mailadres in ons systeem bestaat, hebben we een reset link verzonden.
            </p>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition"
          >
            Terug naar Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ofa-bg-dark flex items-center justify-center p-4">
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-ofa-red mb-2">OFA Admin</h1>
          <h2 className="text-xl font-semibold text-white">Wachtwoord Vergeten</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jouw@email.com"
              className="w-full px-4 py-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red"
            />
          </div>

          <button
            type="submit"
            disabled={requestResetMutation.isPending}
            className="w-full py-3 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded-lg transition font-semibold"
          >
            {requestResetMutation.isPending ? 'Verzenden...' : 'Reset Link Verzenden'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-gray-400 hover:text-white transition"
          >
            ← Terug naar Login
          </button>
        </div>
      </div>
    </div>
  );
}
