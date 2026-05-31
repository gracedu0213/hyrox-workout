interface Props {
  value?: number;
  onChange: (n: number | undefined) => void;
}

const LABELS: Record<number, string> = {
  1: 'Very easy', 3: 'Easy', 5: 'Moderate', 7: 'Hard', 9: 'V. hard', 10: 'Max',
};

export default function RpeSlider({ value, onChange }: Props) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-widest text-muted">Effort (RPE)</span>
        <span className="font-display text-xl">
          {value ?? '—'}
          {value != null && LABELS[value] && (
            <span className="text-xs text-muted ml-2">{LABELS[value]}</span>
          )}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value ?? 5}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full mt-2 accent-accent"
      />
      <div className="flex justify-between text-[10px] text-muted">
        <span>1</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}
