// Shared date helpers. Local-time based (the app reasons in the user's own
// calendar days), Monday-first weeks throughout.

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayISO(): string {
  return isoDate(new Date());
}

// Monday of the week containing d (local time, time component zeroed).
export function mondayOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - day);
  return m;
}

