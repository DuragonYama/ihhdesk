import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Clock, CalendarDays, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/clock', label: 'Klok', icon: Clock },
    { path: '/absences', label: 'Verlof', icon: CalendarDays },
    { path: '/balance', label: 'Saldo', icon: TrendingUp },
    { path: '/calendar', label: 'Kalender', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-ofa-bg-dark pb-20">
      {/* Top bar */}
      <header className="bg-ofa-bg border-b border-neutral-800 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ofa-red">OFA</h1>
            <p className="text-sm text-gray-400">{user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-white"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-ofa-bg border-t border-neutral-800">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 px-4 transition ${
                  isActive
                    ? 'text-ofa-red'
                    : 'text-gray-400 hover:text-white'
                }`
              }
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
