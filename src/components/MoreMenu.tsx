import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export interface MenuItem {
  label: string;
  onClick?: () => void;
  to?: string; // render as a Link instead of a button
  destructive?: boolean;
}

// A ⋯ overflow menu for secondary actions, so cards/headers show one primary
// action plus an explicit menu rather than a clutter of corner buttons.
export default function MoreMenu({ items, align = 'right' }: { items: MenuItem[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 flex items-center justify-center rounded-full text-muted text-xl leading-none active:bg-panel2"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-1 min-w-36 bg-panel2 border border-line rounded-lg overflow-hidden shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((it, i) => {
            const cls = `block w-full text-left px-3 py-2.5 text-sm active:bg-panel ${
              it.destructive ? 'text-red-400' : 'text-white/90'
            }`;
            return it.to ? (
              <Link key={i} to={it.to} className={cls} onClick={() => setOpen(false)}>
                {it.label}
              </Link>
            ) : (
              <button
                key={i}
                className={cls}
                onClick={() => {
                  setOpen(false);
                  it.onClick?.();
                }}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
