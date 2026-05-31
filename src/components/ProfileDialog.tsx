import { useEffect, useState } from 'react';
import { useProfile, type Gender } from '../profile';

export default function ProfileDialog() {
  const { profile, setProfile, dialogOpen, closeDialog } = useProfile();
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [gender, setGender] = useState<Gender | undefined>(profile?.gender);

  useEffect(() => {
    if (dialogOpen) {
      setFirstName(profile?.firstName ?? '');
      setGender(profile?.gender);
    }
  }, [dialogOpen, profile]);

  if (!dialogOpen) return null;

  const canSave = firstName.trim().length > 0 && (gender === 'M' || gender === 'F');
  const isFirstTime = !profile;

  function onSave() {
    if (!canSave || !gender) return;
    setProfile({ firstName: firstName.trim(), gender });
    closeDialog();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={isFirstTime ? undefined : closeDialog}
    >
      <div
        className="w-full sm:max-w-sm sm:rounded-lg rounded-t-2xl bg-panel border-t sm:border border-line p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs uppercase tracking-widest text-accent">
          {isFirstTime ? 'Welcome' : 'Profile'}
        </div>
        <div className="font-display text-xl mt-1">
          {isFirstTime ? 'Set up your profile' : 'Edit profile'}
        </div>
        <p className="text-xs text-muted mt-1">
          We use your weight preference to show the right loads in each workout.
        </p>

        <div className="mt-4">
          <label className="text-xs uppercase tracking-widest text-muted">First name</label>
          <input
            type="text"
            autoFocus
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your name"
            className="mt-1 w-full bg-panel2 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4">
          <span className="text-xs uppercase tracking-widest text-muted">Weight preference</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([
              { v: 'M' as Gender, label: "Men's", sub: 'Heavier loads' },
              { v: 'F' as Gender, label: "Women's", sub: 'Lighter loads' },
            ]).map((o) => {
              const active = gender === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setGender(o.v)}
                  className={`py-3 rounded-lg border text-sm ${
                    active ? 'bg-accent/10 border-accent text-accent' : 'bg-panel2 border-line text-white/80'
                  }`}
                >
                  <div className="font-semibold uppercase tracking-wider text-xs">{o.label}</div>
                  <div className="text-[11px] text-muted mt-0.5">{o.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {!isFirstTime && (
            <button
              type="button"
              onClick={closeDialog}
              className="flex-1 py-2.5 rounded bg-panel2 text-sm uppercase tracking-wider text-muted"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded bg-accent text-bg text-sm font-semibold uppercase tracking-wider disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
