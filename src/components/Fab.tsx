import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { newId, saveLog } from '../db';
import type { WorkoutLog } from '../types';

interface Props {
  todayISO: string;
  onRest: () => void; // refresh handler after rest day created
}

export default function Fab({ todayISO, onRest }: Props) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close when tapping outside
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  async function addRest() {
    const log: WorkoutLog = {
      id: newId(),
      date: todayISO,
      createdAt: Date.now(),
      kind: 'rest',
      status: 'logged',
    };
    await saveLog(log);
    setOpen(false);
    onRest();
  }

  return (
    <div
      ref={wrapRef}
      className="fixed z-40"
      style={{
        right: 'calc(env(safe-area-inset-right) + 16px)',
        bottom: 'calc(env(safe-area-inset-bottom) + 72px)',
      }}
    >
      {/* The button is positioned absolutely at the wrapper's bottom-right so the
          menu growing above it cannot shift it. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-accent text-bg shadow-lg flex items-center justify-center text-3xl font-bold active:scale-95 transition-transform"
        aria-label={open ? 'Close' : 'Add workout'}
      >
        <span className={`inline-block transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-3 flex flex-col items-stretch gap-2 w-48">
          <ActionPill icon="📋" label="Plans & workouts" onClick={() => { setOpen(false); nav('/plan'); }} />
          <ActionPill icon="🗓️" label="Build a plan" onClick={() => { setOpen(false); nav('/plan/new'); }} />
          <ActionPill icon="🛠️" label="Build a workout" onClick={() => { setOpen(false); nav('/workout/new'); }} />
          <ActionPill icon="🏀" label="Quick custom" onClick={() => { setOpen(false); nav('/custom/log'); }} />
          <ActionPill icon="🛌" label="Rest day" onClick={addRest} />
        </div>
      )}
    </div>
  );
}

function ActionPill({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-panel border border-line rounded-full px-4 py-2 text-sm shadow w-full text-left"
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}
