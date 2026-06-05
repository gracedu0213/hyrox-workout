import { useEffect, useRef, useState } from 'react';

interface Props {
  valueSec: number | undefined;
  onChange: (s: number | undefined) => void;
  placeholder?: boolean;
  compact?: boolean;
}

// Stopwatch-style entry: the user types only digits; the colon is always
// rendered for them, and digits fill from the right. Backspace deletes the
// rightmost digit.
//
//   type "5" → 0:05
//   type "3" → 0:53
//   type "0" → 5:30
//   type "0" → 53:00
//   type "0" → 5:30:00   (workouts longer than an hour roll into hh:mm:ss)

const MAX_DIGITS = 6;

function digitsToSec(d: string): number | undefined {
  if (!d) return undefined;
  if (d.length <= 2) return parseInt(d, 10);
  if (d.length <= 4) return parseInt(d.slice(0, -2), 10) * 60 + parseInt(d.slice(-2), 10);
  return (
    parseInt(d.slice(0, -4), 10) * 3600 +
    parseInt(d.slice(-4, -2), 10) * 60 +
    parseInt(d.slice(-2), 10)
  );
}

function digitsToDisplay(d: string): string {
  if (!d) return '';
  if (d.length <= 2) return `0:${d.padStart(2, '0')}`;
  if (d.length <= 4) return `${d.slice(0, -2)}:${d.slice(-2)}`;
  return `${d.slice(0, -4)}:${d.slice(-4, -2)}:${d.slice(-2)}`;
}

function secToDigits(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}${String(m).padStart(2, '0')}${String(s).padStart(2, '0')}`;
  if (m === 0) return s === 0 ? '' : String(s);
  return `${m}${String(s).padStart(2, '0')}`;
}

export default function TimeInput({ valueSec, onChange, placeholder, compact }: Props) {
  const [digits, setDigits] = useState(valueSec != null ? secToDigits(valueSec) : '');
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused) return;
    setDigits(valueSec != null ? secToDigits(valueSec) : '');
  }, [valueSec, focused]);

  // Keep the caret pinned to the end while editing so new digits always land
  // on the right, regardless of where the user tapped.
  useEffect(() => {
    if (!focused) return;
    const el = ref.current;
    if (!el) return;
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [digits, focused]);

  const cls = compact
    ? 'w-24 bg-panel2 rounded px-2 py-1 text-center font-mono tabular-nums'
    : 'w-32 bg-panel2 rounded px-3 py-2 text-center text-lg font-mono tabular-nums';

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className={cls}
      placeholder={placeholder ? 'h:mm:ss' : ''}
      value={digitsToDisplay(digits)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        // Roll over seconds ≥ 60 on commit (e.g. "1:99" → "2:39") so the
        // stored value and the redisplay agree.
        const sec = digitsToSec(digits);
        onChange(sec);
        if (sec != null) setDigits(secToDigits(sec));
      }}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(-MAX_DIGITS);
        setDigits(d);
        onChange(digitsToSec(d));
      }}
    />
  );
}
