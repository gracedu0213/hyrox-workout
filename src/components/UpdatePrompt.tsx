import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => registration.update().catch(() => {});
      window.addEventListener('focus', checkForUpdate);
      const id = window.setInterval(checkForUpdate, 60 * 60 * 1000);
      return () => {
        window.removeEventListener('focus', checkForUpdate);
        window.clearInterval(id);
      };
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-40">
      <div className="bg-panel border border-accent rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-widest text-accent">Update available</div>
          <div className="text-sm mt-0.5">A new version of HYROX Tracker is ready.</div>
        </div>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="text-xs uppercase tracking-wider text-muted px-2 py-1"
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="text-xs uppercase tracking-wider font-semibold bg-accent text-bg rounded px-3 py-1.5"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
