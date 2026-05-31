import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import PlanPage from './pages/PlanPage';
import DayPage from './pages/DayPage';
import HistoryPage from './pages/HistoryPage';
import LogPage from './pages/LogPage';
import CustomLogPage from './pages/CustomLogPage';
import LogDetailPage from './pages/LogDetailPage';
import { ProfileProvider, useProfile } from './profile';
import ProfileDialog from './components/ProfileDialog';
import UpdatePrompt from './components/UpdatePrompt';

export default function App() {
  useTapOutsideDismissKeyboard();
  return (
    <ProfileProvider>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-bg text-white">
        <Header />
        <main className="flex-1 pb-24">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/plan/:dayId" element={<DayPage />} />
            <Route path="/plan/:dayId/log" element={<LogPage />} />
            <Route path="/custom/log" element={<CustomLogPage />} />
            <Route path="/log/:logId" element={<LogDetailPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
        <BottomNav />
        <ProfileDialog />
        <UpdatePrompt />
      </div>
    </ProfileProvider>
  );
}

// Tap anywhere outside the currently-focused text input/textarea to dismiss
// the iOS keyboard. The native accessory bar (prev/next/Done) still appears
// while typing, but it'll go away as soon as the user taps off the field
// instead of sticking around until they hit Done.
function useTapOutsideDismissKeyboard() {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      const tag = active.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Don't dismiss when tapping another form control or a label that
      // forwards focus — let the browser move focus naturally instead.
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('label')
      ) {
        return;
      }
      active.blur();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Always land at the top of the page when navigating between routes,
    // and clear any stale body scroll-lock (e.g. from a dismissed overlay).
    document.body.style.overflow = '';
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Header() {
  const { profile, openDialog } = useProfile();
  const initial = profile?.firstName?.[0]?.toUpperCase() ?? '?';
  return (
    <header className="px-4 pt-3 pb-2 border-b border-line">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl tracking-tight">HYROX</span>
          <span className="text-accent text-xs tracking-widest">TRACKER</span>
        </div>
        <button
          type="button"
          onClick={openDialog}
          aria-label={profile ? `Edit profile (${profile.firstName})` : 'Set up profile'}
          className="w-8 h-8 rounded-full bg-panel2 border border-line flex items-center justify-center text-sm font-semibold text-accent hover:bg-panel"
        >
          {initial}
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  const item = 'flex-1 py-3 text-center text-xs uppercase tracking-wider';
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-panel border-t border-line flex pb-[env(safe-area-inset-bottom)]">
      <NavLink to="/" end className={({ isActive }) => `${item} ${isActive ? 'text-accent' : 'text-muted'}`}>Today</NavLink>
      <NavLink to="/plan" className={({ isActive }) => `${item} ${isActive ? 'text-accent' : 'text-muted'}`}>Plan</NavLink>
      <NavLink to="/history" className={({ isActive }) => `${item} ${isActive ? 'text-accent' : 'text-muted'}`}>History</NavLink>
    </nav>
  );
}
