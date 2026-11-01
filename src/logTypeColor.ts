import { useCallback, useEffect, useState } from 'react';
import { db, getWorkoutTypes } from './db';
import { byId } from './plan';
import { HYROX_TYPE } from './tags';
import type { WorkoutLog, WorkoutType } from './types';

// Calendar views color a day by what KIND of training happened. Resolution
// order: the log's own typeId (quick custom logs pick one directly), then
// HYROX for any curated plan day, then workoutId → workout.typeId for template
// logs. Everything resolves into the one type list (tags.ts); sessions that
// resolve to nothing render as OTHER_TYPE.

export type TypeResolver = (log: WorkoutLog) => WorkoutType | undefined;

interface TypeMaps {
  byType: Map<string, WorkoutType>;
  byWorkout: Map<string, WorkoutType>;
}

export function useLogTypeResolver(): TypeResolver {
  const [maps, setMaps] = useState<TypeMaps>({ byType: new Map(), byWorkout: new Map() });

  useEffect(() => {
    (async () => {
      // Raw table (not getCustomWorkouts) so archived workouts still resolve.
      const [workouts, types] = await Promise.all([db.workouts.toArray(), getWorkoutTypes()]);
      const byType = new Map(types.map((t) => [t.id, t]));
      const byWorkout = new Map<string, WorkoutType>();
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
      if (log.dayId && byId(log.dayId)) return HYROX_TYPE;
      if (log.workoutId) return maps.byWorkout.get(log.workoutId);
      return undefined;
    },
    [maps],
  );
}
