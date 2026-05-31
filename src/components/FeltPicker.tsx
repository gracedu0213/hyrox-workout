export type Felt = 'tough' | 'ok' | 'good';

const OPTIONS: { value: Felt; emoji: string; label: string }[] = [
  { value: 'tough', emoji: '🥵', label: 'Cooked' },
  { value: 'ok', emoji: '🫡', label: 'Locked in' },
  { value: 'good', emoji: '🔥', label: 'On fire' },
];

interface Props {
  value?: Felt;
  onChange: (v: Felt | undefined) => void;
}

export default function FeltPicker({ value, onChange }: Props) {
  return (
    <div>
      <span className="text-xs uppercase tracking-widest text-muted">How it felt</span>
      <div className="mt-2 flex gap-2">
        {OPTIONS.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(active ? undefined : o.value)}
              className={`flex-1 py-3 rounded-lg border text-3xl flex flex-col items-center gap-1 ${
                active ? 'bg-accent/10 border-accent' : 'bg-panel border-line'
              }`}
            >
              <span>{o.emoji}</span>
              <span className={`text-[10px] uppercase tracking-wider ${active ? 'text-accent' : 'text-muted'}`}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const FELT_EMOJI: Record<Felt, string> = { tough: '🥵', ok: '🫡', good: '🔥' };
