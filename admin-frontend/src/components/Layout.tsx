import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, BarChart3, Calendar, Clock, FileText, Mail, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
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
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          bg-ofa-bg border-r border-neutral-800
          flex flex-col overflow-y-auto
          transition-transform duration-300 ease-in-out
          w-64
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:transition-all
          ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
        `}
      >
        {/* Logo / Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800 flex-shrink-0">
          <h1 className={`text-2xl font-bold text-ofa-red ${!sidebarOpen ? 'md:hidden' : ''}`}>OFA</h1>
          {!sidebarOpen && <Menu className="hidden md:block w-6 h-6 text-ofa-red mx-auto" />}
          <div className="flex items-center">
            {/* Mobile: close drawer */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-gray-400 hover:text-white p-2 rounded hover:bg-neutral-800"
              aria-label="Menu sluiten"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Desktop: collapse/expand */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:block text-gray-400 hover:text-white p-2 rounded hover:bg-neutral-800"
              aria-label="Sidebar in-/uitklappen"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                title={!sidebarOpen ? item.name : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition min-h-[44px] ${
                  isActive
                    ? 'bg-ofa-red text-white'
                    : 'text-gray-400 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className={`font-medium ${!sidebarOpen ? 'md:hidden' : ''}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className={`p-4 border-t border-neutral-800 ${!sidebarOpen ? 'md:hidden' : ''}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-ofa-red rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-2 rounded-lg transition text-sm min-h-[40px]"
          >
            Uitloggen
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-y-auto flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-20'
        }`}
      >
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 bg-ofa-bg border-b border-neutral-800 sticky top-0 z-20 flex-shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-gray-400 hover:text-white rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Menu openen"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-ofa-red">OFA</h1>
        </div>

        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
