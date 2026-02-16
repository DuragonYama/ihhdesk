import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, BarChart3, Calendar, Clock, FileText, Mail, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    // Listen for window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Medewerkers', path: '/users', icon: Users },
    { name: 'Goedkeuringen', path: '/approvals', icon: CheckSquare },
    { name: 'Rapporten', path: '/reports', icon: BarChart3 },
    { name: 'Kalender', path: '/calendar', icon: Calendar },
    { name: 'Uurregistratie', path: '/timesheet', icon: Clock },
    { name: 'Verlofbeheer', path: '/absences', icon: FileText },
    { name: 'Email', path: '/email', icon: Mail },
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
            <Menu className="w-6 h-6 text-ofa-red" />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white p-2 rounded hover:bg-neutral-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                <item.icon className="w-5 h-5" />
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