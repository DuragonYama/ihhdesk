import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ username, password });

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      navigate('/');
    } catch (err: any) {
      let errorMessage = 'Inloggen mislukt. Controleer je gegevens.';

      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI validation error
          errorMessage = detail.map((e: any) => e.msg).join(', ');
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ofa-bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-ofa-red mb-2">OFA</h1>
          <p className="text-gray-400">Admin Dashboard</p>
        </div>

        <div className="bg-ofa-bg rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Inloggen</h2>

          {error && (
            <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded mb-4">
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Gebruikersnaam
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red transition"
                placeholder="admin"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red transition"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-ofa-red bg-ofa-bg-dark border-neutral-700 rounded focus:ring-ofa-red focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-300">Onthoud mij</span>
              </label>

              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-ofa-red hover:text-ofa-red-hover transition"
              >
                Wachtwoord vergeten?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition duration-200"
            >
              {isLoading ? 'Inloggen...' : 'Inloggen'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          © 2026 OFA. Alle rechten voorbehouden.
        </p>
      </div>
    </div>
  );
}