import { useCallback, useEffect, useState } from 'react';
import { db, getWorkoutTypes } from './db';
import { byId } from './plan';
import { HYROX_TYPES } from './tags';
import type { WorkoutLog } from './types';

// Calendar views color a day by what KIND of training happened. Resolution
// order: the log's own typeId (quick custom logs pick one directly), then the
// curated day's built-in HYROX type, then workoutId → workout.typeId for
// template logs. Everything resolves into the one type list (tags.ts);
// sessions that resolve to nothing render as OTHER_TYPE.

export interface LogTypeInfo {
  name: string;
  color: string;
}

interface TypeMaps {
  byType: Map<string, LogTypeInfo>;
  byWorkout: Map<string, LogTypeInfo>;
}

export function useLogTypeResolver(): (log: WorkoutLog) => LogTypeInfo | undefined {
  const [maps, setMaps] = useState<TypeMaps>({ byType: new Map(), byWorkout: new Map() });

  useEffect(() => {
    (async () => {
      // Raw table (not getCustomWorkouts) so archived workouts still resolve.
      const [workouts, types] = await Promise.all([db.workouts.toArray(), getWorkoutTypes()]);
      const byType = new Map(types.map((t) => [t.id, { name: t.name, color: t.color }]));
      const byWorkout = new Map<string, LogTypeInfo>();
      for (const w of workouts) {
        const t = w.typeId ? byType.get(w.typeId) : undefined;
        if (t) byWorkout.set(w.id, t);
      }
      setMaps({ byType, byWorkout });
    })();
  }, []);

  return useCallback(
    (log: WorkoutLog) => {
      if (log.typeId) {
        const t = maps.byType.get(log.typeId);
        if (t) return t;
      }
      if (log.dayId) {
        const d = byId(log.dayId);
        if (d) return HYROX_TYPES[d.category];
      }
      if (log.workoutId) return maps.byWorkout.get(log.workoutId);
      return undefined;
    },
    [maps],
  );
}
