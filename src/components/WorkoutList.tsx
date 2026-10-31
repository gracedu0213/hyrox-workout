import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteWorkout, getCustomWorkouts, getWorkoutTypes } from '../db';
import { setupSummary } from '../format';
import { customToSetup } from '../workouts';
import MoreMenu from './MoreMenu';
import { OTHER_TYPE } from '../tags';
import type { CustomWorkout, WorkoutType } from '../types';

// Browse list of custom workouts (Plan tab + dedicated Workouts page). Tapping a
// row opens its detail; logging/scheduling live there or on the Train tab.
export default function WorkoutList() {
  const [workouts, setWorkouts] = useState<CustomWorkout[]>([]);
  const [types, setTypes] = useState<Map<string, WorkoutType>>(new Map());

  async function refresh() {
    setWorkouts(await getCustomWorkouts());
    setTypes(new Map((await getWorkoutTypes()).map((t) => [t.id, t])));
  }
  useEffect(() => { refresh(); }, []);

  async function remove(w: CustomWorkout) {
    if (!window.confirm(`Delete "${w.name}"? Past logs are kept.`)) return;
    await deleteWorkout(w.id);
    refresh();
  }

  if (workouts.length === 0) {
    return (
      <p className="text-sm text-muted">
        No custom workouts yet. <Link to="/workout/new" className="text-accent">Build your first →</Link>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {workouts.map((w) => {
        const summary = setupSummary(customToSetup(w).setup);
        const type = w.typeId ? types.get(w.typeId) : undefined;
        // Color always means type; untyped workouts get the neutral "Other".
        const color = type?.color ?? OTHER_TYPE.color;
        return (
          <div key={w.id} className="flex items-center gap-2 bg-panel rounded-lg p-3">
            <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <Link to={`/workout/${w.id}`} className="flex-1 min-w-0">
              <div className="font-display text-lg leading-tight truncate">{w.name}</div>
              <div className="text-xs text-muted mt-0.5 truncate">
                {summary}
                {type && (
                  <span className="ml-2 uppercase tracking-wider" style={{ color: type.color }}>{type.name}</span>
                )}
                {w.intensity && (
                  <span className="ml-2 uppercase tracking-wider">{w.intensity}</span>
                )}
              </div>
            </Link>
            <MoreMenu
              items={[
                { label: 'Edit', to: `/workout/${w.id}/edit` },
                { label: 'Delete', destructive: true, onClick: () => remove(w) },
              ]}
            />
          </div>
        );
      })}
    </div>
  );
}

