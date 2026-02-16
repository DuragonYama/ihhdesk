import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'employee') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ofa-bg-dark">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Toegang Geweigerd</h1>
          <p className="text-gray-400">Deze app is alleen voor medewerkers.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
