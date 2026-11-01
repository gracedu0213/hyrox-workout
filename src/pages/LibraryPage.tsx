import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { withDate } from '../dateUtils';
import { getPlans, savePlan } from '../db';
import { withCurated, planSubtitle, planWeekCount } from '../plans';
import WorkoutList from '../components/WorkoutList';
import type { UserPlan } from '../types';

export default function LibraryPage() {
  const [plans, setPlans] = useState<UserPlan[]>([]);
  const date = useSearchParams()[0].get('date');

  async function refresh() {
    setPlans(await getPlans());
  }
  useEffect(() => { refresh(); }, []);

  async function start(plan: UserPlan) {
    await savePlan({ ...plan, active: true, createdAt: plan.createdAt || Date.now() });
    refresh();
  }

  const merged = withCurated(plans);
  // Programs = every committable plan (structured content and/or a cadence goal).
  const programs = merged.filter((p) => planWeekCount(p) > 0 || p.goalPerWeek != null);

  return (
    <div className="pb-32">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-display text-5xl leading-[0.9] tracking-[-0.03em]">
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}
          >
            Plan
          </span>
        </h1>
        <p className="text-sm text-muted mt-2">All your plans and workouts.</p>
      </div>

      <section className="px-4 mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-muted">Plans</div>
          <Link to="/plan/new" className="text-xs text-accent">+ Build a plan</Link>
        </div>
        <div className="space-y-2">
          {programs.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-panel rounded-lg p-3">
              <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <Link to={withDate(`/plan/program/${p.id}`, date)} className="flex-1 min-w-0">
                <div className="font-display text-lg leading-tight flex items-center gap-2">
                  {p.icon && <span>{p.icon}</span>}
                  <span className="truncate">{p.name}</span>
                </div>
                <div className="text-xs text-muted mt-0.5">{planSubtitle(p)}</div>
              </Link>
              {p.active ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-accent shrink-0">Active ✓</span>
              ) : (
                <button
                  onClick={() => start(p)}
                  className="px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest shrink-0"
                  style={{ backgroundColor: p.color, color: '#0a0a0a' }}
                >
                  Start
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-muted">Workouts</div>
          <Link to="/workout/new" className="text-xs text-accent">+ New workout</Link>
        </div>
        <WorkoutList date={date} />
      </section>
    </div>
  );
}
