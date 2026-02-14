import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Medewerkers', path: '/users', icon: '👥' },
    { name: 'Goedkeuringen', path: '/approvals', icon: '✓' },
    { name: 'Rapporten', path: '/reports', icon: '📄' },
    { name: 'Kalender', path: '/calendar', icon: '📅' },
    { name: 'Uurregistratie', path: '/timesheet', icon: '🕐' },
    { name: 'Verlofbeheer', path: '/absences', icon: '📋' },
    { name: 'Email', path: '/email', icon: '✉️' },
  ];

  return (
    <div className="flex h-screen bg-ofa-bg-dark">
      {/* Sidebar - Fixed */}
      <aside
        className={`fixed left-0 top-0 h-screen ${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-ofa-bg border-r border-neutral-800 transition-all duration-300 flex flex-col overflow-y-auto`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800">
          {sidebarOpen ? (
            <h1 className="text-2xl font-bold text-ofa-red">OFA</h1>
          ) : (
            <span className="text-2xl">📋</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white p-2 rounded hover:bg-neutral-800"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-ofa-red text-white'
                    : 'text-gray-400 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        {sidebarOpen && (
          <div className="p-4 border-t border-neutral-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-ofa-red rounded-full flex items-center justify-center text-white font-bold">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-2 rounded-lg transition text-sm"
            >
              Uitloggen
            </button>
          </div>
        )}
      </aside>

      {/* Main Content - Scrollable */}
      <main className={`${sidebarOpen ? 'ml-64' : 'ml-20'} flex-1 overflow-y-auto transition-all duration-300`}>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}