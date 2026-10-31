// Export the curated 12-week plan (src/plan.ts, the single source of truth)
// to a JSON resource bundled into the iOS app. Rerun after editing plan.ts:
//
//   npm run export:plan
//
// The Swift `Plan`/`Day`/`WorkoutSetup` Codable types decode this exact shape.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN } from '../src/plan';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'ios/HyroxWorkout/Resources/curated_plan.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(PLAN, null, 1));
console.log(`Wrote ${PLAN.days.length} days to ${out}`);
