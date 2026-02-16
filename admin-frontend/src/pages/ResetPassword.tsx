import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const resetMutation = useMutation({
    mutationFn: async (data: { token: string; new_password: string }) => {
      const response = await api.post('/api/auth/reset-password', data);
      return response.data;
    },
    onSuccess: () => {
      alert('Wachtwoord succesvol gereset!');
      navigate('/login');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij resetten wachtwoord');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      alert('Ongeldige reset link');
      return;
    }

    if (formData.password.length < 6) {
      alert('Wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Wachtwoorden komen niet overeen');
      return;
    }

    resetMutation.mutate({
      token: token,
      new_password: formData.password
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-ofa-bg-dark flex items-center justify-center p-4">
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-red-400 text-5xl mb-4">✕</div>
          <h2 className="text-2xl font-bold text-white mb-2">Ongeldige Link</h2>
          <p className="text-gray-400 mb-6">
            Deze reset link is ongeldig of verlopen.
          </p>
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
          <h2 className="text-xl font-semibold text-white">Nieuw Wachtwoord</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nieuw Wachtwoord
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimaal 6 karakters"
              className="w-full px-4 py-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bevestig Wachtwoord
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Herhaal wachtwoord"
              className="w-full px-4 py-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red"
            />
          </div>

          <button
            type="submit"
            disabled={resetMutation.isPending}
            className="w-full py-3 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded-lg transition font-semibold"
          >
            {resetMutation.isPending ? 'Resetten...' : 'Wachtwoord Resetten'}
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
