import { ReactNode, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Clock, CalendarDays, TrendingUp, Calendar, Bell, BellOff, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPush } from '../utils/pushSubscription';

type PushStatus = 'idle' | 'subscribing' | 'ok' | 'error';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [pushError, setPushError] = useState<string>('');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const trySubscribe = async () => {
    setPushStatus('subscribing');
    setPushError('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('idle');
        return;
      }
      await subscribeToPush();
      setPushStatus('ok');
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      setPushError(err?.message || 'Onbekende fout');
      setPushStatus('error');
    }
  };

  useEffect(() => {
    if (!user) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'denied') return;

    // Auto-attempt on every mount (until success or denial)
    if (Notification.permission === 'granted') {
      // Permission already granted — silently re-register subscription
      setPushStatus('subscribing');
      subscribeToPush()
        .then(() => setPushStatus('ok'))
        .catch((err) => {
          console.error('Push subscription failed:', err);
          setPushError(err?.message || 'Onbekende fout');
          setPushStatus('error');
        });
    }
    // If 'default' (not yet decided), show the banner prompt below
  }, [user]);

  const showPermissionBanner =
    !bannerDismissed &&
    'Notification' in window &&
    Notification.permission === 'default' &&
    pushStatus !== 'ok';

  const showErrorBanner =
    !bannerDismissed &&
    pushStatus === 'error';

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

      {/* Push permission prompt banner */}
      {showPermissionBanner && (
        <div className="bg-ofa-bg border-b border-ofa-red/40 px-4 py-3 flex items-center gap-3">
          <Bell className="w-5 h-5 text-ofa-red flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Schakel meldingen in</p>
            <p className="text-gray-400 text-xs">Ontvang herinneringen om in te klokken</p>
          </div>
          <button
            onClick={trySubscribe}
            disabled={pushStatus === 'subscribing'}
            className="text-xs font-medium px-3 py-1.5 bg-ofa-red text-white rounded-lg flex-shrink-0 disabled:opacity-60"
          >
            {pushStatus === 'subscribing' ? 'Bezig...' : 'Inschakelen'}
          </button>
          <button onClick={() => setBannerDismissed(true)} className="text-gray-500 hover:text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Push error banner */}
      {showErrorBanner && (
        <div className="bg-red-900/30 border-b border-red-800 px-4 py-3 flex items-center gap-3">
          <BellOff className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-red-300 text-sm font-medium">Melding inschrijving mislukt</p>
            {pushError && <p className="text-red-400 text-xs truncate">{pushError}</p>}
          </div>
          <button
            onClick={trySubscribe}
            disabled={pushStatus === 'subscribing'}
            className="text-xs font-medium px-3 py-1.5 bg-red-700 text-white rounded-lg flex-shrink-0 disabled:opacity-60"
          >
            {pushStatus === 'subscribing' ? 'Bezig...' : 'Opnieuw'}
          </button>
          <button onClick={() => setBannerDismissed(true)} className="text-red-400 hover:text-red-200 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
