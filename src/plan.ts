// 12-week HYROX OPEN-LEVEL plan, transcribed from
// HYROX-content-file-HYROX_12_Week_Training_Plan_OPEN-LEVEL.pdf
//
// Faithful to the PDF. Where the source omitted a rep count or weight,
// the field is left undefined and the original wording lives in exercise.note.

import { day, ex } from './planBuild';
import { PRO_PLAN } from './planPro';
import type { Day, Plan, Weight } from './types';

// --- Weight shortcuts ---
const KB24: Weight = { lbsM: 53, lbsF: 35, kgM: 24, kgF: 16 };
const KB24x2: Weight = { ...KB24, count: 2 };
const KB35: Weight = { lbsM: 70, lbsF: 35, kgM: 32, kgF: 16 }; // Headcutter heavy variant
const HC24: Weight = { lbsM: 53, lbsF: 35, kgM: 24, kgF: 16 }; // Headcutter standard
const HC15: Weight = { lbsM: 35, lbsF: 25, kgM: 15, kgF: 12.5 }; // Headcutter light
const DB15: Weight = { lbsM: 35, lbsF: 20, kgM: 15, kgF: 10 };
const DB15x2: Weight = { ...DB15, count: 2 };
const DB15_7: Weight = { lbsM: 35, lbsF: 20, kgM: 15, kgF: 7.5 };
const DB15_7x2: Weight = { ...DB15_7, count: 2 };
const DB22: Weight = { lbsM: 50, lbsF: 35, kgM: 22.5, kgF: 15 };
const DB22x2: Weight = { lbsM: 50, lbsF: 35, kgM: 22.5, kgF: 15, count: 2 };
const WB6: Weight = { lbsM: 14, lbsF: 10, kgM: 6, kgF: 4 };
const WB9: Weight = { lbsM: 20, lbsF: 14, kgM: 9, kgF: 6 };
const SB15x2: Weight = { lbsM: 35, lbsF: 20, kgM: 15, kgF: 10, count: 2 };
const BB105: Weight = { lbsM: 105, lbsF: 75, kgM: 50, kgF: 35 };

export const OPEN_PLAN: Plan = {
  days: [
    // ============ WEEK 01 — BASE ============
    day('w01-mon', 1, 'BASE', 'mon', 'FOUNDATION', '4 RFT', { type: 'rft', rounds: 4 }, [
      ex('Row', 500, 'meters'),
      ex('KB Deadlifts', 20, 'reps', { weight: KB24x2, note: 'Should be done in 1 set' }),
      ex('Wall Balls', 20, 'reps', { weight: WB6 }),
      ex('Farmer Carry', 100, 'meters', { weight: KB24x2 }),
    ], [
      'Pay attention to pace on row, stay consistent',
      'KB Deadlifts should be able to be done in 1 set',
      'Wall balls should be unbroken',
      'Go heavier on Farmer Carry if desired',
    ]),

    day('w01-tue', 1, 'BASE', 'tue', 'AEROBIC', '45-60 Min Run', { type: 'for_quality' }, [
      ex('Run', undefined, 'minutes', { qtyMin: 45, qtyMax: 60, note: 'Finish with 6 x 20 second strides' }),
    ], [
      'Conversational Pace',
      'During strides, start slow and build to sprint effort for the last 6-10 steps',
    ]),

    day('w01-wed', 1, 'BASE', 'wed', 'FOUNDATION', '4 RFT', { type: 'rft', rounds: 4 }, [
      ex('Sled Push', 50, 'feet', { modifier: 'AHAP', note: '50ft / 12.5m' }),
      ex('Run', 400, 'meters'),
      ex('Headcutters', 15, 'reps', { weight: HC24 }),
    ], [
      'AHAP = As heavy as possible',
      'Option to modify Headcutters to Wall Balls or Goblet Squats as needed',
    ]),

    day('w01-thu', 1, 'BASE', 'thu', 'POWER', '4x + 4x (two blocks)', { type: 'rounds', rounds: 4 }, [
      ex('Goblet Squat', 20, 'reps'),
      ex('DB Bench Press', 15, 'reps'),
      ex('Ring/TRX Rows', undefined, 'failure', { note: 'x Failure' }),
      ex('Max Bike Sprint', 30, 'seconds'),
      ex('— 1:30 rest —', undefined, undefined, { note: 'Rest 1:30 between rounds' }),
      ex('— Block 2 (4 rounds) —'),
      ex('Split Squats', 10, 'reps', { modifier: 'Each leg' }),
      ex('DB Shoulder Press', 15, 'reps'),
      ex('DB Curls', 12, 'reps', { modifier: 'Each arm' }),
      ex('Loaded Carry', 200, 'meters', { note: '100m Front Rack / 100m Farmer Carry' }),
    ], [
      'This is for quality, not for time',
      'Choose weights where the last 3 reps are very challenging',
      'If unable to do chin ups, do TRX or Ring Rows',
      'Movements are meant to be done one after the other with minimal rest. Rest 90 seconds after each round',
      'On the loaded carry, use the same weight for both. Hold KBs or DBs in front rack position for the first 100m, then switch to a farmer carry hold for the second 100m',
      'Rest as needed throughout',
    ]),

    day('w01-fri', 1, 'BASE', 'fri', 'FOUNDATION', 'For Time: 3 Rounds (descending)', { type: 'descending_rounds', rounds: 3, roundDetails: [
      'Round 1: 800m Run + 30 reps each movement',
      'Round 2: 400m Run + 20 reps each movement',
      'Round 3: 200m Run + 10 reps each movement',
    ] }, [
      ex('Run', undefined, undefined, { perRound: [800, 400, 200], note: '800 / 400 / 200m per round' }),
      ex('Alt DB Snatch', undefined, 'reps', { perRound: [30, 20, 10] }),
      ex('Goblet Squat', undefined, 'reps', { perRound: [30, 20, 10] }),
      ex('Goblet Lunge', undefined, 'reps', { perRound: [30, 20, 10] }),
      ex('Sled Push', 50, 'feet', { note: '50ft / 12.5m after each round' }),
    ], [
      'Workout is 3 rounds total, with descending reps each round (Sled Push remains the same throughout)',
    ]),

    // ============ WEEK 02 — BASE ============
    day('w02-mon', 2, 'BASE', 'mon', 'FOUNDATION', '25 Min AMRAP — ladder 5-10-15-20-25-etc', { type: 'amrap', durationSec: 25 * 60 }, [
      ex('KB Deadlift', undefined, 'reps', { weight: KB24x2, ladder: { start: 5, step: 5, openEnded: true } }),
      ex('Goblet Lunge', undefined, 'reps', { weight: DB22, ladder: { start: 5, step: 5, openEnded: true } }),
      ex('Wall Balls', undefined, 'reps', { weight: WB6, ladder: { start: 10, step: 10, openEnded: true } }),
      ex('Run', 200, 'meters', { note: '200m Run after each round (does not change)' }),
    ], [
      'Continue up the ladder until you reach 25 minutes',
      '200m Run does not change throughout',
      'Round 1: 5 KB DL / 5 FR Lunge / 10 Wallballs / 200m Run',
      'Round 2: 10 KB DL / 10 FR Lunge / 20 Wallballs / 200m Run',
      'Round 3: 15 KB DL / 15 FR Lunge / 30 Wallballs / 200m Run',
    ]),

    day('w02-tue', 2, 'BASE', 'tue', 'AEROBIC', '50-60 Min AMRAP', { type: 'amrap', durationSec: 60 * 60 }, [
      ex('Bike', 5, 'minutes'),
      ex('Row', 5, 'minutes'),
      ex('Ski', 5, 'minutes'),
    ], [
      'Work for 50-60 minutes total',
      'All at an easy yet consistent pace',
      'Pay attention to pace throughout and stay consistent',
      'Conversational pace, but you should break a sweat',
    ]),

    day('w02-wed', 2, 'BASE', 'wed', 'FOUNDATION', '4 RFT', { type: 'rft', rounds: 4 }, [
      ex('Run', 400, 'meters'),
      ex('DB Thruster', 10, 'reps', { weight: DB15x2 }),
      ex('Burpee Broad Jumps', 12, 'reps'),
    ], [
      'DB Thrusters should be unbroken',
      'Plant hands close to feet in order to maintain the Burpee Broad Jump standard',
    ]),

    day('w02-thu', 2, 'BASE', 'thu', 'POWER', '100 Cal Row + EMOM + 4x block', { type: 'rounds', rounds: 4 }, [
      ex('Row', 100, 'calories', { note: 'Buy-in: stop every 2:00 and complete 10 x Bench Press' }),
      ex('Bench Press', 10, 'reps', { note: 'Every 2:00 during the row' }),
      ex('— Then 4 rounds: —'),
      ex('Back Squats', 25, 'reps', { modifier: 'Unbroken' }),
      ex('Cal Bike Sprint', 10, 'calories'),
      ex('Rest', 2, 'minutes'),
      ex('Suitcase Carry', 400, 'meters', { note: 'Switch arms as needed' }),
    ], [
      '100 Cal Row should be a moderate pace',
      'Stop every 2 Minutes and complete 10 x Bench Press (Build each round)',
      'Back squats should be unbroken, build each round',
      'Go immediately into the 10 Cal Bike Sprint',
      'Suitcase Carry: Switch arms as needed but don\'t come to a complete stop at any point',
    ]),

    day('w02-fri', 2, 'BASE', 'fri', 'FOUNDATION', 'For Time: 3 Rounds (descending)', { type: 'descending_rounds', rounds: 3, roundDetails: [
      'Round 1: 30 reps each',
      'Round 2: 20 reps each',
      'Round 3: 10 reps each',
    ] }, [
      ex('Alt DB Snatch', undefined, 'reps', { perRound: [30, 20, 10] }),
      ex('Sled Pull (Arms Only)', 50, 'feet'),
      ex('Farmer Carry', 200, 'meters', { weight: KB24x2, note: 'After each round' }),
    ], [
      '3 Rounds total',
      'DB Snatch reps decrease each round',
      'Sled Pull should be AHAP, no walking back',
      'Farmer Carry should be heavy enough where you need to break at least 1 time during each 200m',
    ]),

    // ============ WEEK 03 — BASE ============
    day('w03-mon', 3, 'BASE', 'mon', 'FOUNDATION', 'For Time: 5 Rounds (descending)', { type: 'descending_rounds', rounds: 5, roundDetails: [
      'Wall Balls: 50-40-30-20-10',
      'KBS: 21-18-15-12-9',
      '400m Run after each round',
    ] }, [
      ex('Wall Balls', undefined, 'reps', { perRound: [50, 40, 30, 20, 10], weight: WB6 }),
      ex('KB Swings', undefined, 'reps', { perRound: [21, 18, 15, 12, 9], weight: KB24 }),
      ex('Run', 400, 'meters'),
      ex('Burpee Penalty', 10, 'reps', { note: 'Every time you break on Wall Balls, FOUNDATION 10 Burpees' }),
    ], [
      '5 Rounds, reps decrease each round',
      '400m Run remains the same',
      'A break on Wall Balls is any time movement stops or ball drops',
      'Round 1: 50 Wall Balls / 21 KBS / 400m Run',
      'Round 2: 40 Wall Balls / 18 KBS / 400m Run',
      'Round 3: 30 Wall Balls / 15 KBS / 400m Run',
      '(+ penalty burpees if you break on wall balls)',
    ]),

    day('w03-tue', 3, 'BASE', 'tue', 'AEROBIC', '50 Minutes Progressive Run', { type: 'for_quality' }, [
      ex('Run', 50, 'minutes', { note: 'Increase pace every 10 mins; last 10 mins hardest' }),
    ], [
      'Increase pace every 10 mins so at least 10 mins faster / hardest effort',
      'If you have a GPS watch, use it and take splits to record data',
      'The last 10 mins should feel harder than race effort',
    ]),

    day('w03-wed', 3, 'BASE', 'wed', 'FOUNDATION', 'For Time: 21-18-15-12-9-6-3', { type: 'descending_rounds', rounds: 7, roundDetails: [
      'Reps per round: 21-18-15-12-9-6-3 of each',
      'Each round starts with a 100m Farmer Carry',
    ] }, [
      ex('Farmer Carry', 100, 'meters', { note: 'At the start of each round' }),
      ex('DB Hang Clean', undefined, 'reps', { perRound: [21, 18, 15, 12, 9, 6, 3], weight: DB15x2 }),
      ex('DB Push Press', undefined, 'reps', { perRound: [21, 18, 15, 12, 9, 6, 3], weight: DB15x2 }),
      ex('DB Front Squat', undefined, 'reps', { perRound: [21, 18, 15, 12, 9, 6, 3], weight: DB15x2 }),
    ], [
      '7 Rounds total',
      'Each round starts with a 100m Farmer Carry',
      'This will be grippy!',
      'Use the same weight throughout for all movements',
    ]),

    day('w03-thu', 3, 'BASE', 'thu', 'POWER', '4x + 4x (two blocks)', { type: 'rounds', rounds: 4 }, [
      ex('Barbell RDL', 8, 'reps'),
      ex('Split Squat Jump', 10, 'reps'),
      ex('Sled Sprint', 100, 'feet'),
      ex('Rest', 90, 'seconds'),
      ex('— Block 2 (4 rounds) —'),
      ex('Bench Press', 20, 'reps'),
      ex('KB Swings', 20, 'reps'),
      ex('Cal Ski Sprint', 10, 'calories'),
      ex('Rest', 90, 'seconds'),
    ], [
      'For quality, not for time',
      'Build RDL weight',
      'Sled Push: Use ½ "Normal" weight (what you normally use in training)',
      'Rest after each complete round',
      'Bench Press: Build each round',
      'Movements should be back to back with rest after each round',
    ]),

    day('w03-fri', 3, 'BASE', 'fri', 'FOUNDATION', '4 RFT', { type: 'rft', rounds: 4 }, [
      ex('DB Front Rack Lunge', 20, 'reps', { weight: DB22x2 }),
      ex('HR Push Ups', 15, 'reps', { note: 'Hand Release' }),
      ex('Cal Ski', 10, 'calories'),
      ex('Bear Crawl', 100, 'feet', { note: '100ft / 25m' }),
    ], [
      'Lunges should be unbroken',
      'Push Ups should be STRICT: No sagging core, hips and shoulders in line',
      'HR = Hand Release at bottom of push up',
      'Bear Crawl: Hands and feet only touching the ground',
    ]),

    // ============ WEEK 04 — BASE ============
    day('w04-mon', 4, 'BASE', 'mon', 'FOUNDATION', 'For Time: 3 Rounds (descending)', { type: 'descending_rounds', rounds: 3, roundDetails: [
      'Round 1: 30 reps / 50ft Sled Pull / 30 reps / 800m Run',
      'Round 2: 20 reps / 50ft Sled Pull / 20 reps / 800m Run',
      'Round 3: 10 reps / 50ft Sled Pull / 10 reps / 800m Run',
    ] }, [
      ex('DB Push Press', undefined, 'reps', { perRound: [30, 20, 10], weight: DB15x2 }),
      ex('Sled Pull', 50, 'feet', { note: '50ft / 12.5m — same each round' }),
      ex('Alt DB Snatch', undefined, 'reps', { perRound: [30, 20, 10] }),
      ex('Run', 800, 'meters', { note: '800m after each round (same each round)' }),
    ], [
      '3 Rounds, decrease reps EXCEPT Sled Pull and 800m Run remain the same',
    ]),

    day('w04-tue', 4, 'BASE', 'tue', 'AEROBIC', 'Mile + 12 x 200m + Mile', { type: 'intervals', rounds: 12, workDescription: '200m at 90% effort', restSec: 60 }, [
      ex('Run Warm Up', 1, 'miles'),
      ex('200m Intervals', 12, undefined, { note: '12 x 200m at 90% effort' }),
      ex('Easy Jog', 60, 'seconds', { note: 'Between each interval' }),
      ex('Cool Down', 1, 'miles'),
    ], [
      'Each effort should be a build to 90% effort',
      'Focus on quick turnover',
      'Recovery jog should be super slow/easy if not walk',
    ]),

    day('w04-wed', 4, 'BASE', 'wed', 'FOUNDATION', '4 RFT', { type: 'rft', rounds: 4 }, [
      ex('Ski/Row', 400, 'meters'),
      ex('Run', 400, 'meters'),
      ex('Sled Push', 100, 'feet', { modifier: 'AHAP', note: '100ft / 25m' }),
    ], [
      'Ski/Row: Moderate Pace',
      'Run: Race Pace',
      'Sled Push: Sled should be AHAP (As Heavy As Possible)',
    ]),

    day('w04-thu', 4, 'BASE', 'thu', 'POWER', '4x + 4x (two blocks)', { type: 'rounds', rounds: 4 }, [
      ex('Split Squat', 10, 'reps', { modifier: 'Each leg' }),
      ex('KB Deadlift', 20, 'reps'),
      ex('DB Bench Press', 20, 'reps'),
      ex('Rest', 60, 'seconds'),
      ex('— Block 2 (4 rounds) —'),
      ex('Cal Ski', 10, 'calories'),
      ex('Ring Rows', undefined, 'reps', { qtyMin: 10, qtyMax: 20 }),
      ex('Sled Pull', 50, 'feet', { note: '50ft or 12.5m' }),
      ex('Rest', 60, 'seconds'),
    ], [
      'For Quality, not for time',
      'Split Squat: Complete all 10 reps on one leg before switching to the other. Feet should remain planted in lunge for entirety of set',
      'KB Deadlift and DB Bench Press should be unbroken',
      'Sled Pull should be arms only',
      'Rest at the end of each round',
    ]),

    day('w04-fri', 4, 'BASE', 'fri', 'FOUNDATION', '30 Minutes AMRAP — ladder 3-6-9-12-15-etc', { type: 'amrap', durationSec: 30 * 60 }, [
      ex('KB Swings', undefined, 'reps', { weight: KB24, ladder: { start: 3, step: 3, openEnded: true } }),
      ex('Headcutter', undefined, 'reps', { ladder: { start: 3, step: 3, openEnded: true } }),
      ex('Burpee Broad Jump', undefined, 'reps', { ladder: { start: 3, step: 3, openEnded: true } }),
      ex('Cal Sprint', 10, 'calories', { note: 'Any machine, after each round' }),
    ], [
      'Continue ascending rep ladder until 30:00 Minutes are up',
      'Each movement (except for cals) should increase by 3 reps each round',
      'Each round should end with a 10 Cal Sprint',
    ]),

    // ============ WEEK 05 — PACE ============
    day('w05-mon', 5, 'PACE', 'mon', 'FOUNDATION', 'For Time: 30-25-20-15-10', { type: 'descending_rounds', rounds: 5, roundDetails: [
      'Reps per round: 30-25-20-15-10 of each',
    ] }, [
      ex('Cal Ski', undefined, 'calories', { perRound: [30, 25, 20, 15, 10] }),
      ex('HR Push Ups', undefined, 'reps', { perRound: [30, 25, 20, 15, 10], note: 'Hand Release' }),
      ex('DB Push Press', undefined, 'reps', { perRound: [30, 25, 20, 15, 10] }),
      ex('KB Deadlift', undefined, 'reps', { perRound: [30, 25, 20, 15, 10] }),
    ], [
      'Push Ups should be STRICT: No sagging core, hips and shoulders in line',
      'HR = Hand Release at bottom of push up',
      'Option to go heavier on KB Deadlift',
      'Expect to break up sets',
    ]),

    day('w05-tue', 5, 'PACE', 'tue', 'ENGINE', '5 x 4 Min AMRAP (4:00 on / 2:00 off)', { type: 'intervals', rounds: 5, workSec: 4 * 60, restSec: 2 * 60 }, [
      ex('Run', 400, 'meters'),
      ex('Headcutters', 12, 'reps', { weight: HC24 }),
      ex('Cal Bike', undefined, 'max', { note: 'Max cals in remaining time' }),
    ], [
      'Each round should be a 90% effort',
      'Goal is pacing and consistency across rounds',
      'Headcutters should be unbroken',
      'Score = number of cals',
    ]),

    day('w05-wed', 5, 'PACE', 'wed', 'AEROBIC', '5000m Row + E2MOM', { type: 'for_time' }, [
      ex('Row', 5000, 'meters', { note: 'Stop every 2 min for 5 Burpees Over Rower' }),
      ex('Burpees Over Rower', 5, 'reps', { note: 'Every 2 minutes during the row' }),
    ], [
      'Starting at 0:00, complete 5 Burpees over the rower',
      'Continue rowing until you reach 5000m while stopping every 2 minutes on the minute to do 5 Burpees over the rower',
    ]),

    day('w05-thu', 5, 'PACE', 'thu', 'ENGINE', '6 x 400m Run', { type: 'intervals', rounds: 6, workDescription: '400m Run', restSec: 2 * 60 }, [
      ex('Run', 400, 'meters'),
      ex('Rest', 2, 'minutes'),
    ], [
      'Each 400m should feel like race pace',
      'Record each 400m split',
      'Log results and note changes in pace, what you are able to hold, etc.',
      'The goal should be to find what pace you can maintain without leaving anything in the tank',
    ]),

    day('w05-fri', 5, 'PACE', 'fri', 'COMPLETE', 'For Time: 1000m + 4 RFT + 100/75 Cal Bike', { type: 'for_time' }, [
      ex('Row/Ski', 1000, 'meters', { note: 'Buy-in' }),
      ex('— 4 Rounds: —'),
      ex('Sandbag Lunge', 150, 'feet', { weight: SB15x2, note: '150ft / 25m' }),
      ex('Wall Balls', 25, 'reps', { weight: WB6 }),
      ex('Run', 400, 'meters'),
      ex('— Then: —'),
      ex('Cal Bike', 100, 'calories', { note: '100/75 (M/F) cash out' }),
      ex('Sled Push', 350, 'feet', { modifier: 'AHAP', note: 'Accumulate 350ft / 100m throughout the 4 rounds' }),
    ], [
      'The 1000m Row or Ski is to be done once as a buy in',
      'The 100/75 Cal Bike is to be done once as a cash out',
      'DB Lunges can be done as Front Rack or to your sides',
      'The Sled Push can be broken up in any way throughout',
      'Weight on the sled should be AHAP (As Heavy As Possible)',
    ]),

    // ============ WEEK 06 — PACE ============
    day('w06-mon', 6, 'PACE', 'mon', 'FOUNDATION', '3 RFT', { type: 'rft', rounds: 3 }, [
      ex('Farmer Carry', 200, 'meters', { weight: KB24x2 }),
      ex('KB Swings', 15, 'reps', { weight: KB24 }),
      ex('Goblet Squat', 30, 'reps', { weight: KB24 }),
      ex('Ski or Row', 400, 'meters'),
    ], [
      'Use the same weight throughout: 1 KB for KBS and Goblet Squat / 2 KBs for Farmers Carry',
      'Farmers Carry weight should be heavy enough where you need to set the KBs down 1-2 times',
    ]),

    day('w06-tue', 6, 'PACE', 'tue', 'ENGINE', '20 Min Alt EMOM (50 on / 10 off)', { type: 'emom', everySec: 60, totalRounds: 20 }, [
      ex('Goblet Lunge', undefined, 'max', { weight: KB24, note: 'Max reps in 50 sec — Minute 1, 5, 9, 13, 17' }),
      ex('Strict Pull Ups / Push Ups', undefined, 'max', { note: 'Max reps in 50 sec — Minute 2, 6, 10, 14, 18' }),
      ex('Run', 200, 'meters', { note: 'Minute 3, 7, 11, 15, 19' }),
      ex('Rest', undefined, undefined, { note: 'Minute 4, 8, 12, 16, 20' }),
    ], [
      'Alternate movements each minute',
      'Work 50 seconds, use the 10 seconds rest to transition',
      'Do a max set of push ups followed by ring rows in the time remaining',
      'If you are unable to do push ups, do ring rows only',
    ]),

    day('w06-wed', 6, 'PACE', 'wed', 'AEROBIC', '60 Minutes Run + 2x 15 Min Pickups', { type: 'for_quality' }, [
      ex('Run', 60, 'minutes'),
      ex('15 Min Pickup', 15, 'minutes', { note: '2x within the 60 min window' }),
    ], [
      'The 15 Minutes Pick Ups can be done at any time',
      'Pace should be lactate threshold hold, or a pace you can maintain for 15 minutes just below the point of discomfort',
    ]),

    day('w06-thu', 6, 'PACE', 'thu', 'ENGINE', '3 Rounds: 1:00 on / 1:00 off', { type: 'intervals', rounds: 3, workSec: 60, restSec: 60 }, [
      ex('Sled Push', undefined, undefined, { note: '1 min on / 1 min off' }),
      ex('Sled Pull', undefined, undefined, { note: '1 min on / 1 min off' }),
      ex('DB Box Over', undefined, undefined, { note: '1 min on / 1 min off' }),
      ex('Headcutters', undefined, undefined, { weight: HC24, note: '1 min on / 1 min off' }),
      ex('Push Ups', undefined, undefined, { note: '1 min on / 1 min off' }),
    ], [
      '1 Minute at each movement station',
      'Alternate movements',
      '1 Minute rest between each',
      'You should be working HARD the entirety of the minute',
    ]),

    day('w06-fri', 6, 'PACE', 'fri', 'COMPLETE', 'For Time', { type: 'for_time' }, [
      ex('Cal Bike or Ski', 100, 'calories'),
      ex('Back Squats', 100, 'reps', { weight: BB105 }),
      ex('Run', 1, 'miles'),
      ex('KB Swings', 100, 'reps', { weight: HC15 }),
      ex('Cal Bike or Ski', 100, 'calories'),
      ex('Headcutters', 100, 'reps', { weight: HC15 }),
      ex('Farmer Carry Penalty', 100, 'meters', { weight: KB24x2, note: 'Every break: 100m Farmer Carry' }),
    ], [
      'Back Squats: Choose a weight that you can get at least a set of 30 unbroken while fresh',
      'KBS and Headcutter weight should be slightly lighter than usual',
      'Every time you break, complete 100m Farmer Carry (only applies for back squat, KBS, and Headcutters)',
      'Break on back squats = bar down. Break on KBS/Headcutters = movement stops',
    ]),

    // ============ WEEK 07 — PACE ============
    day('w07-mon', 7, 'PACE', 'mon', 'FOUNDATION', 'For Time: 30-25-20-15', { type: 'descending_rounds', rounds: 4, roundDetails: [
      'Reps per round: 30-25-20-15 of each',
    ] }, [
      ex('KB Deadlift', undefined, 'reps', { perRound: [30, 25, 20, 15], weight: KB24 }),
      ex('DB/KB Lunges', undefined, 'reps', { perRound: [30, 25, 20, 15], weight: { lbsM: 25, lbsF: 15, kgM: 12.5, kgF: 7.5, count: 2 } }),
      ex('Headcutters', undefined, 'reps', { perRound: [30, 25, 20, 15], weight: HC24 }),
      ex('Farmer Carry', 100, 'meters', { weight: KB24x2 }),
    ], [
      'Weight should be the same for KB Deadlift and Farmer Carry',
      'Lunges can be done with a front rack hold or to the sides',
      'Headcutter: Use 1 of the KBs you used for the Farmer Carry and Deadlift',
    ]),

    day('w07-tue', 7, 'PACE', 'tue', 'ENGINE', '5 x 3 Min AMRAP (3:00 on / 3:00 off)', { type: 'intervals', rounds: 5, workSec: 3 * 60, restSec: 3 * 60 }, [
      ex('Devil Press', 10, 'reps', { weight: DB15_7x2 }),
      ex('Burpee Box Jump Over', 6, 'reps'),
      ex('Cal Bike', undefined, 'max', { note: 'Max cals in remaining time' }),
    ], [
      'Devils Press should be done in 1:30 or less (Lower reps if needed)',
      'Each round should be a sprint effort',
      'Goal is to find a pace where you can go HARD but maintain while having a 1:1 work/rest ratio',
      'Score = cals (Stay consistent)',
    ]),

    day('w07-wed', 7, 'PACE', 'wed', 'ENGINE', '4 x 1000m Run at Race Pace', { type: 'intervals', rounds: 4, workDescription: '1000m Run at race pace', restSec: 2 * 60 }, [
      ex('Run', 1000, 'meters'),
      ex('Rest', 2, 'minutes'),
    ], [
      'Record each 1000m Split',
      'Log results and note changes in pace, what you are able to hold, etc.',
      'The goal should be to find what pace you can maintain without leaving anything in the tank',
    ]),

    day('w07-thu', 7, 'PACE', 'thu', 'FOUNDATION', 'Multi-window AMRAP (0-12 / 12-22 / 22-30)', { type: 'multi_window_amrap', windows: [
      { label: '0:00 - 12:00 AMRAP', durationSec: 12 * 60 },
      { label: '12:00 - 22:00 AMRAP', durationSec: 10 * 60 },
      { label: '22:00 - 30:00 AMRAP', durationSec: 8 * 60 },
    ] }, [
      ex('Wall Balls', 15, 'reps', { weight: WB9, note: 'Window 1' }),
      ex('DB Push Press', 12, 'reps', { weight: KB24x2, note: 'Window 1' }),
      ex('Cal Ski', 9, 'calories', { note: 'Window 1' }),
      ex('Sled Push', 50, 'feet', { modifier: 'AHAP', note: 'Window 2 — 50ft / 12.5m' }),
      ex('Run', 200, 'meters', { note: 'Window 2' }),
      ex('Headcutters', 8, 'reps', { weight: KB35, note: 'Window 3' }),
      ex('Burpees', 10, 'reps', { note: 'Window 3' }),
    ], [
      'Each AMRAP goes immediately into the next',
      'Sled Push should be As Heavy As Possible',
      'Focus on going right into the run',
      'Headcutters should be done unbroken',
    ]),

    day('w07-fri', 7, 'PACE', 'fri', 'COMPLETE', '3x + 3x (two blocks)', { type: 'rft', rounds: 3 }, [
      ex('Cal Bike', 30, 'calories'),
      ex('Sled Push', 100, 'feet', { modifier: 'AHAP' }),
      ex('Burpee Broad Jumps', 50, 'feet', { note: '50ft / 12.5m' }),
      ex('Run', 400, 'meters'),
      ex('— Then 3 rounds: —'),
      ex('Cal Ski', 30, 'calories'),
      ex('KB Deadlift', 20, 'reps', { weight: KB24x2 }),
      ex('Farmer Carry', 100, 'meters', { weight: KB24x2 }),
      ex('Wall Balls', 25, 'reps', { weight: WB6 }),
    ], [
      'Focus on consistent and steady pace throughout BBJ',
      'Recover on runs as needed',
      'KB Deadlift and Farmers Carry weight should be the same',
      'Go unbroken on Wall Balls',
    ]),

    // ============ WEEK 08 — PACE ============
    day('w08-mon', 8, 'PACE', 'mon', 'FOUNDATION', '5 RFT', { type: 'rft', rounds: 5 }, [
      ex('Sled Pull', 50, 'feet', { note: '50ft / 12.5m' }),
      ex('Alt DB Snatch', 12, 'reps', { weight: DB15_7x2 }),
      ex('Wall Balls', 25, 'reps', { weight: WB6 }),
      ex('Ski', 200, 'meters'),
    ], [
      'Sled Pull: Practice both walk back method and arms only. Adjust weight as needed',
      'Wall Balls should be unbroken',
    ]),

    day('w08-tue', 8, 'PACE', 'tue', 'ENGINE', 'E2MOM x 10', { type: 'emom', everySec: 2 * 60, totalRounds: 10 }, [
      ex('Sled Push', 50, 'feet', { note: '50ft / 12.5m' }),
      ex('Sprint', 200, 'meters'),
      ex('Rest', undefined, undefined, { note: 'In time remaining' }),
    ], [
      'The focus is getting used to running immediately after the sled',
      'Run what "feels" like a sprint after the sled push',
    ]),

    day('w08-wed', 8, 'PACE', 'wed', 'ENGINE', '8 x 400m Run', { type: 'intervals', rounds: 8, workDescription: '400m Run', restSec: 2 * 60 }, [
      ex('Run', 400, 'meters'),
      ex('Rest', 2, 'minutes'),
    ], [
      'Challenge yourself to see what you\'re capable of',
      'Push the pace on these 400m runs',
      'Keep track of your splits and see where you fall off',
      'Goal should be to find your breaking point',
    ]),

    day('w08-thu', 8, 'PACE', 'thu', 'ENGINE', 'Every 3:30 Minutes x 5', { type: 'emom', everySec: 3 * 60 + 30, totalRounds: 5 }, [
      ex('Wall Balls', 30, 'reps', { weight: WB6 }),
      ex('Sprint', 200, 'meters'),
      ex('Rest', undefined, undefined, { note: 'In time remaining' }),
    ], [
      'Focus is SPEED',
      'Wall Balls unbroken',
      'No rest, immediately into the 200m Sprint',
    ]),

    day('w08-fri', 8, 'PACE', 'fri', 'COMPLETE', '3 RFT', { type: 'rft', rounds: 3 }, [
      ex('Ski/Row', 500, 'meters'),
      ex('KB Lunge', 100, 'feet', { weight: { lbsM: 35, lbsF: 25, kgM: 16, kgF: 8, count: 2 }, note: '100ft / 25m' }),
      ex('Farmer Carry', 100, 'meters', { weight: KB24x2 }),
      ex('Run', 1000, 'meters'),
      ex('Sled Push or Pull', 350, 'feet', { note: 'Accumulate 350ft / 100m throughout (AHAP)' }),
    ], [
      'Lunges can be front rack hold or KB/DBs to your sides',
      'Option to use one KB/DB in Goblet Hold',
      'Sled Push or Pull can be broken up throughout, as long as you reach the designated distance total',
    ]),

    // ============ WEEK 09 — ACCELERATE ============
    day('w09-mon', 9, 'ACCELERATE', 'mon', 'ENGINE', '5 Rounds: 500m Run + 500m Movement Run', { type: 'rounds', rounds: 5 }, [
      ex('Run', 500, 'meters'),
      ex('Movement Run', 500, 'meters', { note: 'See per-round movement below' }),
      ex('Rest', 2, 'minutes'),
      ex('Round 1', 500, 'meters', { note: '500m Ski' }),
      ex('Round 2', 40, 'reps', { note: '40 BBJs' }),
      ex('Round 3', 200, 'meters', { weight: KB24x2, note: '200m Farmers Carry' }),
      ex('Round 4', 80, 'reps', { weight: { lbsM: 20, kgM: 10, lbsF: 20, kgF: 10 }, note: '80 Sandbag Lunge' }),
      ex('Round 5', 100, 'reps', { weight: WB6, note: '100 Wall Balls' }),
    ], [
      'Focus is on run pace',
      'Each round starts with a 500m Run',
      'Take splits of each run',
      'Each run should feel like a race pace effort',
      'The movement will change each round',
      'Do the movement that corresponds to the round',
    ]),

    day('w09-tue', 9, 'ACCELERATE', 'tue', 'COMPLETE', 'For Time: 50-40-30-20-10', { type: 'descending_rounds', rounds: 5, roundDetails: [
      'Reps per round: 50-40-30-20-10 of each',
    ] }, [
      ex('Cal Ski', undefined, 'calories', { perRound: [50, 40, 30, 20, 10] }),
      ex('DB Push Press', undefined, 'reps', { perRound: [50, 40, 30, 20, 10], weight: KB24 }),
      ex('Alt DB Snatch', undefined, 'reps', { perRound: [50, 40, 30, 20, 10], weight: DB15_7x2 }),
      ex('DB Front Squat', undefined, 'reps', { perRound: [50, 40, 30, 20, 10], weight: DB15_7x2 }),
    ], [
      'Steady Pace',
      'Break up DB movements as needed',
    ]),

    day('w09-wed', 9, 'ACCELERATE', 'wed', 'ENGINE', '8 x 200m Run Max Effort', { type: 'intervals', rounds: 8, workDescription: '200m Run max effort', restSec: 90 }, [
      ex('Run', 200, 'meters'),
      ex('Rest', 90, 'seconds'),
    ], [
      'Each 200m should be a build to sprint',
      'Start at 80% effort for first 100m, build to sprint for the remainder',
      'Record splits',
    ]),

    day('w09-thu', 9, 'ACCELERATE', 'thu', 'ENGINE', 'Every 5:00 Minutes x 6', { type: 'emom', everySec: 5 * 60, totalRounds: 6 }, [
      ex('Cal Bike', 10, 'calories', { note: '10/8 (M/F)' }),
      ex('Sled Push', 50, 'feet', { note: '50ft / 12.5m' }),
      ex('Run', 200, 'meters'),
      ex('Rest', undefined, undefined, { note: 'In time remaining' }),
    ], [
      'Focus on running immediately after the sled push and on speed/turnover of your legs',
      'The runs won\'t feel fast but see what your legs can do while compromised',
    ]),

    day('w09-fri', 9, 'ACCELERATE', 'fri', 'COMPLETE', 'For Time: 40-25-15', { type: 'descending_rounds', rounds: 3, roundDetails: [
      'Reps per round: 40-25-15 of each',
      '800m Run after each round',
    ] }, [
      ex('Cal Bike', undefined, 'calories', { perRound: [40, 25, 15] }),
      ex('Wall Balls', undefined, 'reps', { perRound: [40, 25, 15], weight: WB6 }),
      ex('Goblet Lunge', undefined, 'reps', { perRound: [40, 25, 15] }),
      ex('DB Push Press', undefined, 'reps', { perRound: [40, 25, 15], weight: DB22x2 }),
      ex('Run', 800, 'meters', { note: 'After each round' }),
    ], [
      'Steady pace throughout',
      'Record 800m run splits to see variance per round',
    ]),

    // ============ WEEK 10 — ACCELERATE ============
    day('w10-mon', 10, 'ACCELERATE', 'mon', 'ENGINE', '6 Rounds: 400m Run + 25 Reps Movement', { type: 'rounds', rounds: 6 }, [
      ex('Run', 400, 'meters'),
      ex('Movement', 25, 'reps', { note: 'See per-round movement' }),
      ex('Rest', 2, 'minutes'),
      ex('Round 1', 25, 'reps', { weight: WB6, note: '25 Wall Balls' }),
      ex('Round 2', 25, 'reps', { weight: DB15_7x2, note: '25 DB Lunge' }),
      ex('Round 3', 25, 'reps', { weight: DB15_7x2, note: '25 DB Front Squat' }),
      ex('Rounds 4-6', undefined, undefined, { note: 'Repeat sequence (WB → DB Lunge → DB FS)' }),
    ], [
      'Focus is on run speed',
      'Record splits for each, try to stay consistent but aim for faster than race pace',
      'Do 25 reps of the corresponding movement immediately after the run',
      'You will go through each movement 2x total',
      '2:00 Minutes rest after each round',
    ]),

    day('w10-tue', 10, 'ACCELERATE', 'tue', 'COMPLETE', '4 RFT', { type: 'rft', rounds: 4 }, [
      ex('Run', 1000, 'meters'),
      ex('Sled Push', 100, 'feet', { modifier: 'AHAP', note: '100ft / 25m' }),
      ex('Back Rack Walking Lunge', 40, 'reps'),
    ], [
      '1000m runs should feel like race effort',
      'Sled Push should be AHAP (As Heavy As Possible)',
      'For lunges, choose any way to add weight on back (Sandbag, barbell, etc)',
      'If using a barbell, go heavy enough that you\'d break after 20 reps',
    ]),

    day('w10-wed', 10, 'ACCELERATE', 'wed', 'ENGINE', '6 x 400m Run HARD', { type: 'intervals', rounds: 6, workDescription: '400m Run HARD', restSec: 2 * 60 }, [
      ex('Run', 400, 'meters'),
      ex('Rest', 2, 'minutes'),
    ], [
      'Don\'t hold back on these 400m runs',
      'See where you can hang and where you fall off',
      'Record Splits',
    ]),

    day('w10-thu', 10, 'ACCELERATE', 'thu', 'ENGINE', '5 Rounds', { type: 'rounds', rounds: 5 }, [
      ex('Cal Bike', 12, 'calories', { note: '12/10 (M/F)' }),
      ex('Burpee Broad Jumps', 8, 'reps'),
      ex('Wall Balls', 20, 'reps', { weight: WB6 }),
      ex('Cal Bike', 12, 'calories', { note: '12/10 (M/F)' }),
      ex('Rest', 60, 'seconds'),
    ], [
      'Each round is an 80-100% effort',
      'Wall Balls should be unbroken',
      'PUSH on the bike but pay attention to RPM and don\'t fall off',
      'Adjust weight as needed throughout',
    ]),

    day('w10-fri', 10, 'ACCELERATE', 'fri', 'COMPLETE', 'For Time', { type: 'for_time' }, [
      ex('Ski', 1000, 'meters'),
      ex('Row', 1000, 'meters'),
      ex('Run', 1000, 'meters'),
      ex('Goblet Squat', 75, 'reps', { weight: KB24 }),
      ex('KB Swings', 75, 'reps', { weight: KB24 }),
      ex('Headcutters', 50, 'reps'),
      ex('Burpee Broad Jump', 50, 'reps'),
      ex('Cal Bike', 50, 'calories'),
      ex('Sled Push', 100, 'meters'),
    ], [
      'Partition reps in any way, in any order',
      'Goal is completion in 60 minutes or less',
      'Use the same KB weight throughout',
    ]),

    // ============ WEEK 11 — PRIME ============
    day('w11-mon', 11, 'PRIME', 'mon', 'COMPLETE', '3 RFT', { type: 'rft', rounds: 3 }, [
      ex('Cal Bike', 35, 'calories', { note: '35/20 (M/F)' }),
      ex('Run', 400, 'meters'),
      ex('Sandbag Lunge', 30, 'reps'),
      ex('Ski', 500, 'meters'),
      ex('Farmers Carry', 100, 'meters', { weight: KB24x2 }),
    ], [
      'Watch RPM on bike and stay consistent',
      'If no sandbag, use DB or Barbell on back',
      '100m Farmer Carry should be unbroken',
    ]),

    day('w11-tue', 11, 'PRIME', 'tue', 'FOUNDATION', '25 Min AMRAP', { type: 'amrap', durationSec: 25 * 60 }, [
      ex('Sled Push', 100, 'feet', { note: '100ft / 25m' }),
      ex('Run or Row', 500, 'meters'),
      ex('Wall Balls', 20, 'reps', { weight: WB6 }),
    ], [
      'This should be a moderate Recovery Pace',
      'Stay steady and consistent',
      'Run or Row, depending on what you\'re feeling for the day',
    ]),

    day('w11-wed', 11, 'PRIME', 'wed', 'ENGINE', '4 x 800m Run at Race Pace', { type: 'intervals', rounds: 4, workDescription: '800m Run at race pace', restSec: 2 * 60 }, [
      ex('Run', 800, 'meters'),
      ex('Rest', 2, 'minutes'),
    ], [
      'These should feel fresh',
      'Run at what you feel is race pace',
      'Record Splits',
    ]),

    day('w11-thu', 11, 'PRIME', 'thu', 'AEROBIC', '45-60 Min Run + 6 x 1 Min Pickup', { type: 'for_quality' }, [
      ex('Run', 45, 'minutes', { note: '45-60 minutes' }),
      ex('1 Min Pickup', 1, 'minutes', { note: '6 x with 2 min easy between' }),
    ], [
      'FOUNDATION 6 x 1 Minutes Pick Up / 2 Minutes Easy at some point during the run',
      'The pickup can be hard or moderate depending on how you\'re feeling',
    ]),

    day('w11-fri', 11, 'PRIME', 'fri', 'COMPLETE', '5 Rounds — Pick 5 HYROX Stations', { type: 'rounds', rounds: 5 }, [
      ex('Run', 800, 'meters'),
      ex('HYROX Station', undefined, undefined, { note: 'Choose 5 HYROX Stations to run through' }),
    ], [
      'Choose any 5 HYROX Race Movement Standards',
      'Go in race order',
      'Goal should be race pace or race feel',
    ]),

    // ============ WEEK 12 — RACE ============
    day('w12-mon', 12, 'RACE', 'mon', 'FOUNDATION', '4 RFT', { type: 'rft', rounds: 4 }, [
      ex('Row', 500, 'meters'),
      ex('KB Deadlift', 20, 'reps', { weight: KB24x2 }),
      ex('Farmer Carry', 100, 'meters', { weight: KB24x2 }),
      ex('Sled Pull', 50, 'feet', { note: '50ft / 12.5m' }),
    ], [
      'Moderate Pace',
      'Practice different types of sled pull technique: arms only, full body, walk back',
      'Go lighter on KB Deadlift and Farmer Carry if you want to lower the intensity',
    ]),

    day('w12-tue', 12, 'RACE', 'tue', 'AEROBIC', '40 Min AMRAP — Machine Cals', { type: 'amrap', durationSec: 40 * 60 }, [
      ex('Machine Cals', undefined, 'calories', { ladder: { start: 10, step: 5, openEnded: true }, note: 'Rotate between Ski/Bike/Row' }),
    ], [
      'Moderate Pace',
      'Go by feel, if you feel good and want to add intensity',
      'Do the first 10 Cals of each movement as a sprint or hard effort followed by recovery',
    ]),

    day('w12-wed', 12, 'RACE', 'wed', 'ENGINE', '6 Rounds: 200m + 6 BBJ', { type: 'rounds', rounds: 6 }, [
      ex('200m Build to Sprint', 200, 'meters'),
      ex('Burpee Broad Jump', 6, 'reps'),
      ex('Rest', 60, 'seconds'),
    ], [
      'These should feel fresh',
      'Build to a sprint',
      'Adjust the number of Burpee Broad Jumps as desired',
    ]),

    day('w12-thu', 12, 'RACE', 'thu', 'AEROBIC', '45 Minutes Easy Run', { type: 'for_quality' }, [
      ex('Easy Run', 45, 'minutes'),
    ], [
      'This should be a "Feel good" Jog',
      'Option to switch to Row, Ski or Bike',
    ]),

    day('w12-fri', 12, 'RACE', 'fri', 'AEROBIC', 'OPTIONAL: 20-30 Min Shake Out Run', { type: 'for_quality' }, [
      ex('Shake Out Run', 25, 'minutes', { note: '20-30 minutes, optional' }),
    ], [
      'Totally optional depending on how you\'re feeling',
      'Only if you think your legs will benefit from a quick/easy run',
      'Don\'t stress about getting it in',
    ]),
  ],
};

export const PHASE_OF_WEEK = (week: number): Day['phase'] =>
  week <= 4 ? 'BASE' : week <= 8 ? 'PACE' : week <= 10 ? 'ACCELERATE' : week === 11 ? 'PRIME' : 'RACE';

// Curated plan days (mon–fri). User-built plans use WEEKDAYS_7 (full week).
export const DAYS_OF_WEEK: Day['dayOfWeek'][] = ['mon', 'tue', 'wed', 'thu', 'fri'];
export const WEEKDAYS_7: Day['dayOfWeek'][] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABEL: Record<Day['dayOfWeek'], string> = {
  mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT', sun: 'SUN',
};

export const CATEGORY_COLOR: Record<Day['category'], string> = {
  FOUNDATION: 'foundation',
  AEROBIC: 'aerobic',
  ENGINE: 'engine',
  POWER: 'power',
  COMPLETE: 'complete',
};

// Hex twins of the above — for inline styles, where tailwind's JIT can't see
// dynamic classes derived from data.
export const CAT_HEX: Record<Day['category'], string> = {
  FOUNDATION: '#F0E040',
  AEROBIC: '#5BC0EB',
  ENGINE: '#FF6B6B',
  POWER: '#9B59B6',
  COMPLETE: '#2ECC71',
};

// --- Curated programs registry ---
// Each curated program is a "virtual" plan: it has no DB row until the user
// commits (Start), at which point a row with its fixed planId is materialized.
// The Open plan keeps its original id + day ids so existing logs stay attached.
export interface CuratedProgram {
  planId: string;
  name: string;
  color: string;
  icon: string;
  plan: Plan;
}

export const CURATED_PROGRAMS: CuratedProgram[] = [
  { planId: 'curated-12-week', name: '12-Week HYROX Open', color: '#FF6B6B', icon: '🏋️', plan: OPEN_PLAN },
  { planId: 'curated-12-week-pro', name: '12-Week HYROX Pro', color: '#9B59B6', icon: '🔥', plan: PRO_PLAN },
];

export const curatedProgram = (planId: string): CuratedProgram | undefined =>
  CURATED_PROGRAMS.find((p) => p.planId === planId);

const PROGRAM_BY_DAY = new Map(CURATED_PROGRAMS.flatMap((p) => p.plan.days.map((d) => [d.id, p] as const)));
const DAY_BY_ID = new Map(CURATED_PROGRAMS.flatMap((p) => p.plan.days.map((d) => [d.id, d] as const)));

export const byId = (id: string): Day | undefined => DAY_BY_ID.get(id);
export const programForDay = (dayId: string): CuratedProgram | undefined => PROGRAM_BY_DAY.get(dayId);
