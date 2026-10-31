# HYROX Tracker — Web UI Parity Spec (build manifest for the iOS port)

Exhaustive behavioral + visual inventory of the web app (React 19 + Tailwind + Dexie PWA),
captured 2026-07-02 for the 1:1 SwiftUI port. This is the authoritative checklist for
P3–P5 in `IOS_REBUILD_PLAN.md`.

---

## 1. DESIGN TOKENS

### Colors (from `tailwind.config.js`)
| Token | Hex | Role |
|---|---|---|
| `bg` | `#1a1a1a` | app background (also `theme_color`) |
| `panel` | `#242424` | primary card/surface |
| `panel2` | `#2e2e2e` | nested surface / inputs / pressed state |
| `accent` | `#F0E040` | primary yellow (buttons, active states, links) |
| `accent2` | `#FFD500` | brighter yellow (gradient start) — defined but rarely used directly |
| `muted` | `#8a8a8a` | secondary text |
| `line` | `#3a3a3a` | borders / hairlines |
| `foundation` | `#F0E040` | category color |
| `aerobic` | `#5BC0EB` | category color |
| `engine` | `#FF6B6B` | category color |
| `power` | `#9B59B6` | category color |
| `complete` | `#2ECC71` | category color |

Note: `bg` on buttons means **text color `#1a1a1a` on yellow** (`bg-accent text-bg`). Several places hardcode `#0a0a0a` (near-black) as text-on-color instead of `#1a1a1a` (Start buttons, cadence CTA).

`index.css` sets `html,body,#root` background `#1a1a1a`, text `#f4f4f4` (note: pure text is `#f4f4f4`, slightly off from `text-white`). `-webkit-tap-highlight-color: transparent`. `.no-scrollbar` utility hides scrollbars.

### The signature gradient (used everywhere for result numbers & big titles)
`linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)` — yellow→gold→orange→coral, at 135°. Applied as `background-clip:text; color:transparent` on display text. In `HomePage.tsx` it's the `GRADIENT` const. `#FF9B5C` (orange) appears ONLY inside this gradient (not a named token).

### Category colors (`plan.ts`)
- Tailwind class map `CATEGORY_COLOR`: FOUNDATION→`foundation`, AEROBIC→`aerobic`, ENGINE→`engine`, POWER→`power`, COMPLETE→`complete` (used as `text-${x}` / `bg-${x}`, safelisted).
- Hex twins `CAT_HEX` (for inline styles): FOUNDATION `#F0E040`, AEROBIC `#5BC0EB`, ENGINE `#FF6B6B`, POWER `#9B59B6`, COMPLETE `#2ECC71`.

### Phase colors
No dedicated phase color palette. Phase names (BASE/PACE/ACCELERATE/PRIME/RACE) render in the signature gradient (ProgramPage week header) or muted text (DayPage). `PHASE_OF_WEEK`: weeks 1–4 BASE, 5–8 PACE, 9–10 ACCELERATE, 11 PRIME, 12 RACE.

### Default workout-type colors (`db.ts` seeds)
Running `#5BC0EB`, Functional `#FF6B6B`, Deadhang `#9B59B6`.

### TypePicker new-type palette (`TypePicker.tsx`)
`#5BC0EB, #2ECC71, #FF6B6B, #9B59B6, #F0E040, #FF9F43, #FF6BB5, #4ADEDE`.

### Plan-builder color palette (`PlanBuilderPage.tsx`)
`#FF6B6B, #FFD500, #5BC0EB, #9B59B6, #2ECC71, #FF9B5C, #E84393`.

### Intensity colors — TWO INCONSISTENT MAPS (reproduce as-is or unify):
- `WorkoutDetailPage.INTENSITY_DOT`: easy `#4ade80`, moderate `#fbbf24`, hard `#f87171`.
- `WorkoutList.INTENSITY_COLOR`: easy `#2ECC71`, moderate `#FFD500`, hard `#FF6B6B`.

### "Felt like" (effort) — `FeltPicker.tsx`
`tough`→🥵 "Cooked", `ok`→🫡 "Locked in", `good`→🔥 "On fire". `FELT_EMOJI` map reused in summaries/hero/celebration.

### Progress trend colors (`ProgressPage.tsx`)
improved → `#2ECC71` with `↑`; worse → `#FF6B6B` with `↓`; flat → muted with `→`/`—`.

### "Other" log type (`logTypeColor.ts`)
`{ name: 'Other', color: '#FF6B6B' }`.

### Fonts
- `font-sans` (default): `-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif`.
- `font-display`: `"Arial Black", Impact, system-ui, sans-serif` — all big numbers/titles. Display text uses very tight tracking (`-0.02em` to `-0.045em`) and tight line-height (`leading-[0.85]`–`0.95`).
- Result/time values use `font-mono tabular-nums`.

### Common shape/spacing conventions
- Radii: cards `rounded-lg`(8)/`rounded-xl`(12)/`rounded-2xl`(16); pills/chips `rounded-full`; heatmap tiles `rounded-[3px]`.
- Page padding: `px-4`. Cards: `p-3`/`p-4`. Content bottom padding for pages with a fixed save bar: `pb-32`.
- Uppercase micro-labels everywhere: `text-xs`/`text-[10px] uppercase tracking-widest text-muted` (section labels), accent variant for sub-headers.
- Shadows are mostly colored glows via inline `boxShadow` (e.g. `0 6px 22px rgba(255,107,107,0.28)`), not Tailwind shadow tokens.

---

## 2. APP SHELL / ROUTING

Root layout: `min-h-screen flex flex-col bg-bg text-white`, with Header, main (`flex-1 pb-24`), BottomNav, ProfileDialog, UpdatePrompt(PWA — drop).

### Routes
| Path | Page |
|---|---|
| `/` | HomePage (tab: Train) |
| `/plan` | LibraryPage (tab: Plan) |
| `/plan/new` | PlanBuilderPage (create) |
| `/plan/program/:planId` | ProgramPage |
| `/plan/:planId/edit` | PlanBuilderPage (edit) |
| `/plan/:dayId` | DayPage (curated day detail) |
| `/plan/:dayId/log` | LogPage (log a curated day) |
| `/custom/log` | CustomLogPage (quick log) |
| `/workout/library` | WorkoutLibraryPage (orphan — not linked) |
| `/workout/new` | WorkoutBuilderPage (create) |
| `/workout/:id/edit` | WorkoutBuilderPage (edit) |
| `/workout/:id` | WorkoutDetailPage |
| `/workout/:workoutId/log` | LogPage (log a custom workout) |
| `/log/:logId` | LogDetailPage |
| `/progress` | ProgressPage (tab: Progress) |

### Header
`px-4 pt-3 pb-2 border-b border-line`, `flex justify-between`. Left: `HYROX` in `font-display text-xl tracking-tight` + `TRACKER` in `text-accent text-xs tracking-widest`. Right: circular avatar button `w-8 h-8 rounded-full bg-panel2 border border-line`, shows first initial of profile (uppercase) or `?`, `text-accent`. Tap → ProfileDialog.

### BottomNav
`fixed bottom-0 inset-x-0 bg-panel border-t border-line`, `pb-[env(safe-area-inset-bottom)]`. Row `flex h-14` (56px), 3 equal items: **Train** (`/`), **Plan** (`/plan`), **Progress** (`/progress`). `text-xs uppercase tracking-wider`, active `text-accent` else `text-muted`. The 56px height is load-bearing: every fixed save bar sits at `bottom-[calc(env(safe-area-inset-bottom)+56px)]` flush atop the nav.

### Global behaviors
- Tap outside a focused text field dismisses the keyboard.
- Route change scrolls to top + clears scroll locks.

### Profile system (`profile.tsx`)
- localStorage `hyrox.profile.v1`, JSON `{firstName, gender:'M'|'F'}`.
- Dialog **auto-opens whenever profile is null** (forced first-run setup).
- `gender` drives weight display (`formatWeight` picks M/F column; without gender shows `M/F` combined).

---

## 3. PAGES

### 3.1 HomePage (`/`) — "Train" tab
Reads: `getAllLogs()`, `getActivePlans()`; `localStorage['hyrox.calview.v1']` ('grid'|'month'); `useLogTypeResolver()`. Writes: rest-day log (EmptyDayHero/Fab); calview choice.

Layout (`px-4 py-5 space-y-6`):

**A. Today section.** Label `Today · {ISO date}` (`text-[10px] uppercase tracking-[0.25em]`). Content = `TodayRail` OR `EmptyDayHero` when rail is empty.
- Rail items order: unfinished to-do sessions (todayLogs w/o results, not rest) → active cadence plan cards → done sessions (has results or rest). Cadence cards use `weekProgress`, `computeStreak`, `isQualifying`.
- **TodayRail**: horizontal snap scroller `flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4`. Slides `snap-start shrink-0 min-h-[164px]`, width `w-[86%]` if >1 item (peek) else `w-full`. Dots pager below (multi only): active dot `w-4 bg-accent`, others `w-1.5 bg-line`, `transition-all`. Active index = `scrollLeft / (cardWidth+12)`.
- **TodoWorkoutCard**:
  - Rest → centered card, 🛌 (text-4xl), "Rest day" (font-display text-2xl), "Recover up." → `/log/:id`.
  - Otherwise `rounded-2xl bg-panel active:bg-panel2` with radial-gradient overlay (different planned vs done) and `✦` top-right (`text-accent/40`). Chip: Custom → `text-accent` "Custom"; plan day → category-color chip + `W{week} · {DAY}`. Right badge: planned → "Planned" (muted); done → `bg-accent text-bg` "Logged ✓". Title `font-display text-2xl line-clamp-2`. Setup summary muted line-clamp-1.
  - If done: big gradient result `font-display text-4xl` = `logSummary(log)`.
  - CTA: planned → gradient pill "Log it →" (`boxShadow 0 6px 22px rgba(255,107,107,0.28)`); done → "Tap to review" + `→`.
  - CTA target (planned): custom w/ workoutId → `/workout/{workoutId}/log?id={log.id}`; plan day → `/plan/{dayId}/log?id={log.id}`; else `/log/{id}`. Done → `/log/{id}`.
- **CadenceTodoCard**: colored by `plan.color`. Border `1px solid {color}59`, radial gradient overlays in plan color, two `✦`. Header: icon+name, `🔥 {streak}wk` if streak. Big number `font-display text-6xl` in plan color w/ `textShadow 0 0 28px {color}66`, `/ {goal}`, label "this week"/"done ✓". **TrackerPips**: `goal` segments, filled = plan color + glow `0 0 10px {color}77`, unfilled `rgba(255,255,255,0.10)`. Hype text: complete "Weekly goal smashed 🎉", loggedToday "Nice — N more to go", done==0 "Let's kick off the week 💥", else "N more to hit your goal". CTA: complete → static "Crushed it 🎉" bordered; else button (plan color bg, `#0a0a0a` text, glow) "Let's go →" / "Log again →". `active:scale-[0.97]`.
  - `onLog`: pool has exactly 1 workout → `/workout/{id}/log?planId={plan.id}`; else open `CadenceLogSheet`.
- **EmptyDayHero**: `bg-panel rounded-2xl p-5`. h1 `font-display text-5xl leading-[0.9]` "What's on for **today?**" (today in gradient). Muted subtext. Primary `bg-accent text-bg` "Choose a workout →" → `/plan`. Grid of 2: "🏀 Quick log" → `/custom/log`; "🛌 Rest day" → rest log for today (`{kind:'rest', status:'logged'}`) + refresh.

**B. Consistency section** (only if any non-rest log w/ results). SectionLabel "Consistency" + grid/month toggle (pill group, active `bg-panel2 text-white`). Card `bg-panel rounded-xl p-4`:
- Streak hero (if `computeActivityStreak>0`): 🔥 + `font-display text-4xl text-accent` + "week streak".
- `ConsistencyHeatmap` OR `MonthCalendar`, fed `typeOf`, `selected`, `onSelect` (toggles selectedDate).
- Legend: distinct types present (dot + name) + "Other" if any.
- Footer: day selected → `SelectedDay`; else hint "Last 10 weeks · tap a day" (grid) / "Tap a day" (month).
- **SelectedDay**: border-top, date (accent), "N sessions · {total time} total", list of day's logs → `/log/:id` (title + `logSummary`). Empty → "Nothing logged this day."

**C. Upcoming** (future planned logs, up to 3): custom → accent left bar + date + "Custom" + name → `/workout/:id/log?id=` or `/log/:id`. Plan day → category bar + date + category + `W{week} {DAY} · {label}` → `/plan/:dayId`.

**D. Last workout** (most recent past log): `LastLogCard` (rest/custom/plan variants) → `/log/:id`, with `LogResultChip` (planned→"Planned"; else accent `font-display text-lg` summary).

**E. Fab** + conditional `CadenceLogSheet`.

No logs at all → only EmptyDayHero (B/C/D hidden).

### 3.2 LibraryPage (`/plan`) — "Plan" tab
Reads `getPlans()`, merges curated via `withCurated`. Writes: `start(plan)` → `savePlan {active:true}`.
- Title "Plan" (text-5xl gradient) + "All your plans and workouts."
- **Plans** section: header + "+ Build a plan" → `/plan/new`. Plan row: colored left bar, icon+name (`font-display text-lg`), `planSubtitle` ("12 weeks", "5×/week · 8 weeks", "ongoing"). Right: "Active ✓" (accent) or Start button (plan.color bg, `#0a0a0a` text). Row → `/plan/program/:id`. `programs` filter = has weeks or goalPerWeek.
- **Workouts** section: header + "+ New workout" → `/workout/new`. `<WorkoutList/>`.

### 3.3 ProgramPage (`/plan/program/:planId`)
Reads `getAllLogs`, `getPlan` (or `curatedDescriptor`). Writes: `commit(active)`; `remove()` → confirm `Delete "{name}"? Your logged sessions are kept.` → `archivePlan` → `/plan`.

Header: "← Plans", icon+name (`font-display text-3xl`), meta (`{done}/{goalPerWeek} this week`, `🔥 {streak}wk streak`). Right: "Active ✓" pill OR "Start" button. `MoreMenu`: "Edit plan" (non-curated) → `/plan/:id/edit`; "Make inactive" (if active); "Delete plan" (non-curated, destructive).

- **CuratedBody** (12-week):
  - Week strip (`border-y border-line`, h-scroll): pills `W{01} · {PHASE}`; active `bg-accent text-bg border-accent`; complete `line-through text-muted/60` + " ✓". `?week=` syncs (replace). Auto-centers active pill (smooth). Initial week = URL, else latest week with completed plan log.
  - "Upcoming" h-snap rail (future planned curated logs): cards `w-40` → `/plan/:dayId`.
  - Week header: "Week N" + phase in gradient (`text-5xl`).
  - Day list → `/plan/:dayId`: category bar `h-12`; `{DAY}` + category chip; "Done ✓" / "📅 {date}" badge; workoutLabel (line-through+muted if done); setup summary. Done rows `opacity-50`.
  - Inactive plan: "Start the program to track your progress as you go."
  - `completedDayIds` = plan logs w/ results; `scheduledByDayId` = earliest future planned date per day.
- **CadenceBody**: duration bar ("Ongoing" / "Week X of N" from createdAt Monday / "N-week block" / "Complete · N weeks"). "Consistency" `ConsistencyHeatmap` (plan logs only). "Go-to workouts" (pool) or "Log a workout" ("Pick any workout — it counts toward this plan."). Workout rows → `/workout/:id?planId={plan.id}`. Empty → "No workouts yet. Build one →".
- **SequencedBody**: week pill strip ("Week N"). Per week: day-pinned slots (day label + workout link/rest/"Workout removed") with "Done ✓"/date badges when `startDate` set + qualifying log that date. "Any day this week" anytime slots. Links → `/workout/:id?planId=&date=`. Empty week → "Nothing scheduled this week."

### 3.4 PlanBuilderPage (`/plan/new`, `/plan/:planId/edit`)
Reads `getCustomWorkouts`, `getWorkoutTypes`, `getPlan`. Writes `savePlan`. `?kind=` round-trips when bouncing to workout builder.

**Step 1 (new only)**: "Build a plan" — 3 rows: 🔥 "Cadence goal" / "Train X times a week"; 📅 "Weekly schedule" / "Pin workouts to days"; 📋 "Flexible list" / "Workouts, any day".

**Step 2 (form)**: back → "← Plans" (edit) or "← Plan type". Title = icon + ("Edit plan"|kind title).
- Name input (placeholder varies by kind).
- Color: swatches; OR if all slots reference ONE workout with a type, color **inherited**, shown as swatch + "from {workout} · {type}". Icon: 2-char emoji input.
- **Cadence**: "Weekly goal" number + "sessions / week". Duration: Ongoing/Fixed weeks; weeks number. "Go-to workouts" optional rows (select + "+ Create new workout…" sentinel) with × remove, "+ Add workout".
- **Schedule**: "Start date" (optional). Per-week card: 7 weekday rows each a select (—/🛌 Rest/workouts/+Create new). "+ Add week", "Remove" (if >1).
- **Flexible**: per-week anytime rows. "+ Add week".
- **Curated content** (editing curated): "This is the curated 12-week program — its content is fixed."
- `createNewWorkout()`: saves draft plan, nav `/workout/new?returnTo=/plan/{id}/edit?kind={kind}` — no lost work.
- Save bar: "Save plan"/"Save changes", enabled iff name + (curated OR goalValid OR hasSlots). `buildPlan()` derives content/goalPerWeek/durationWeeks/startDate. On save → `/plan`.

### 3.5 DayPage (`/plan/:dayId`)
Reads `byId(dayId)`, `getLogsForDay`. Writes: `addToPlan()` planned log; `removeLog` (confirm "Delete this planned workout?").

Header: "← Plan" → `/plan/program/{curated}?week={week}`. `W{01} · {DAY}` + category chip + phase.
- "Workout": label (`font-display text-xl`) + setup summary; descending_rounds → roundDetails bullets; multi_window_amrap → window labels.
- "Exercises": separator rows ("—" prefix) as muted uppercase labels; others `bg-panel rounded-md` rows via `formatExercise(ex,{gender})`.
- "Notes": bullets.
- "Add to plan" card: date input (default today) + "Add". If date has logs → confirm `"{date} already has: {summary}.\n\nAdd {label} on top?"`. Creates `{dayId, status:'planned'}`. Nav: today → `/`, else → program week. Hint about past/future.
- "Your Logs (N)": date + ("Planned" or gradient summary), notes/mods. Actions: "Add results"/"Edit" → `/plan/{dayId}/log?id={id}`; "Delete" (planned only, red).

### 3.6 LogPage (`/plan/:dayId/log`, `/workout/:workoutId/log`)
Result entry. Reads `getLog` (`?id=`), `byId`/`getWorkout`, `getActivePlans`, gender. Query: `id`, `date`, `planId`. Writes `saveLog`.

Target resolution: prefer editing log's `workoutSnapshot`; else dayId (Day); else workoutId (custom → `customToSetup` + `buildSnapshot`, prefill intensity). Plan attribution: log's planId / `?planId` / curated day + curated committed → curated plan id. Pre-fills exercise weight fields from prescription (gender-aware for library).

Header: "← Back" (custom → back; plan → `/plan/:dayId`). Title "Log workout"/"Edit log". Subtitle: custom name, or `W{week} {DAY} · {category} · {label}`.

Always: Date input; "Total time" (`TimeInput`); Intensity pills (easy/moderate/hard, toggle); "Part of a plan?" select (if activePlans; options "Not part of a plan" + plans); `FeltPicker`.

**Conditional sections by `setup.type`:**
- `rft` | `descending_rounds` | `rounds` → "Round splits": one `TimeInput` per round, "Time at end of each round (optional)". Count = setup.rounds.
- `amrap` → "AMRAP result": Rounds / + Reps / Cals number fields.
- `multi_window_amrap` → "Per window": per-window Rounds/+Reps + note input.
- `emom` (totalRounds) | `intervals` (rounds) → "Per interval": Reps / Cals / Split (TimeInput compact) per interval.
- Always: "Weights used" — every non-separator exercise gets a text input prefilled with prescribed weight (placeholder "Bodyweight / N/A").
- Always: "Notes" ("How did it feel? Anything notable?") + "Modifications" ("What did you swap or adjust?").

Save bar: "Save log"/"Save changes". Assembles log (status:'logged'), attaches only non-empty structures, → `/log/{id}` with `?celebrate=1` iff real results were entered.

### 3.7 CustomLogPage (`/custom/log`)
Quick log. Query: `id`, `date`, `planId`. Writes kind:'custom', status:'logged', customName default "Custom workout", `typeId` direct.
Fields: "What did you do?" (placeholder "e.g. Basketball, Long run, Swim"); `TypePicker`; Date; Total time; "Part of a plan?"; `FeltPicker`; Notes. Save → `/log/{id}?celebrate=1` (always). Subtitle "Anything outside the plan: basketball, long run, swim, yoga, etc."

### 3.8 LogDetailPage (`/log/:logId`)
**Celebrate**: `?celebrate=1` + not yet fired → `celebrate()` (confetti+haptic), show `CelebrationScreen` overlay, strip query. Delete → confirm "Delete this log? Cannot be undone." → `/`.

Header: "← Back", date micro-label. Title: rest "🛌 Rest day"; custom → name + type chip (dot + name in type color); plan → `W{week} · {DAY}` + category chip + label + setup summary.
- ResultHero (non-rest, size page).
- Sections (if data): "Round splits", "AMRAP result", "Per window", "Per interval" (reps·cal·time), "Weights used" (exercise + accent weight), "Notes" (+ "Mod:" italic).
- Custom snapshot → "Workout" section (setup summary + exercises, separators styled).
- Plan day → collapsible "See the workout"/"Hide the workout" (▼ rotates) with prescribed exercises/roundDetails/windows.
- Footer: "Edit" (accent; plan→`/plan/:dayId/log?id=`, custom w/ workoutId→`/workout/:id/log?id=`, custom w/o→`/custom/log?id=`, rest→none) + "Delete".

### 3.9 WorkoutBuilderPage (`/workout/new`, `/workout/:id/edit`)
Query `?returnTo=` (exit default `/workout/library`). Header: "← Back"/"← Workouts". Title "New workout"/"Edit workout". Live preview = `setupSummary`.
- Name input. **Type**: TypePicker.
- **Format** pills: Rounds / For Time / AMRAP / EMOM / Intervals. AMRAP → Duration TimeInput (default 20:00). EMOM → "Every" TimeInput (60s) × rounds NumberBox (10). Intervals → rounds (5) · work · rest TimeInputs.
- **Exercises** (blocks): block card: label input (only when >1 work block, else "Rounds") + "×" + repeat NumberBox + Remove (if >1). Exercise rows: name, × remove, qty NumberBox (hidden for failure/max), unit select, optional weight (value + kg/lb + remove) or "+ weight". Rest rows: Rest + TimeInput + ×. "+ Add exercise" / "+ Add rest" per block. Standalone rest block → "Rest" + TimeInput + Remove. Footer: "+ Add block" / "+ Add rest".
- **Intensity** pills. **Notes** textarea ("One note per line").
- Save bar: enabled iff name + ≥1 exercise row. `cleanBlocks()` strips empties. Save → exitTo.
- NumberBox: numeric, focus selects all. UNITS: reps, meters, feet, calories, seconds, minutes, miles, failure, max.

### 3.10 WorkoutDetailPage (`/workout/:id`)
Query `planId`, `date`. `remove()` → confirm `Delete "{name}"? Past logs are kept.` → `/plan`. `schedule()` → planned custom log w/ snapshot → `/`.
Header: "← Back", name (`font-display text-3xl`), type chip + intensity chip (INTENSITY_DOT), MoreMenu (Edit, Delete).
Blocks read-only: standalone rest → centered divider "Rest {time}". Work block: heading (label/"Block N"/"Workout") + "×N rounds" accent badge (if >1). ExerciseRow: name (+note) left, prescription (qty · weight, accent tabular-nums) right; rest rows inline dividers.
Notes list. Schedule mode: date input + Add. Save bar: "Log this workout" (→ `/workout/:id/log{?planId&date}`) + "Schedule"/"Cancel".

### 3.11 WorkoutLibraryPage (`/workout/library`)
Title "Workouts" (gradient) + "Your own workouts. Build once, log anytime." + "+ New workout". `<WorkoutList/>`. Orphan route (unlinked); low priority.

### 3.12 ProgressPage (`/progress`)
`buildProgress` (≥2 sessions with comparable metric: time/rounds/cal).
Title "Progress" (gradient). Empty → 📈 + "Log the same workout at least twice and your progression shows up here — time, rounds, and reps over time."
`ProgressRow`: name, "{N} sessions · latest {value}", Sparkline, trend delta+arrow (colored). Tap expands → detailed Sparkline (320×130, dots) + first/last dates + reverse-chron point list → `/log/:logId`.
`fmtValue`/`fmtDelta` by unit (time via formatSec, cal, rounds). Trend: time lower=better.

---

## 4. COMPONENTS

### CadenceLogSheet
Bottom sheet. Backdrop `bg-black/60` (tap closes). Sheet `bg-panel rounded-t-2xl max-h-[75vh]`, safe-area bottom. Header icon+name "Log toward {plan}". Targets = pool workouts (fallback all customs; "Pick any workout — it'll count toward this plan."). Rows → `/workout/:id/log?planId=` (closes), "Log →" accent. Empty → "Build one →". Footer "View plan details" → program.

### CelebrationScreen
Full-screen overlay. Stats from all logs: **day streak** (consecutive calendar days with results, back from log date); thisWeek count (Mon-first up to log date); total logs with results. Background: dual radial-gradient (yellow TL, coral BR) over `#1a1a1a`. Scattered `✦` (accent/engine/power). Close ×. "Workout logged" micro-label; giant 2-line greeting from GREETINGS (NICE/WORK, LET'S/GO, CRUSHED/IT, YOU/DID IT, GET/SOME, BOOM, DONE/AND DONE) in gradient `clamp(4.5rem,20vw,8.5rem)`, chosen by `hashCode(log.id) % 7`. Result line + tilted felt emoji (`rotate-[-10deg]`). 3 stat tiles: 🔥 Streak {n}d, 💪 This week, 📊 Total. Contextual line (streak≥3 / thisWeek≥3 / first-ever "Welcome."). "Keep going →" accent pill (dismiss → `/`). Locks scroll.

### ConsistencyHeatmap
10 Mon-first weeks, columns oldest→newest, rows Mon–Sun. `flex gap-1`, tiles `aspect-square rounded-[3px]`. Variant precedence: logged > rest > planned > empty. Fill: future `rgba(255,255,255,0.02)`; logged → type color, 2+ distinct types → horizontal linear-gradient splitting tile into equal segments; rest `rgba(255,255,255,0.13)`; planned transparent + `1px dashed rgba(255,255,255,0.22)`; empty `rgba(255,255,255,0.05)`. Today `ring-1 ring-accent inset`; selected `ring-2 ring-white inset`. Future/no-handler disabled. Tap → onSelect(iso).

### MonthCalendar
Paged ‹ › (no future). Header `‹ {Month YYYY} ›`. DOW `Mo Tu We Th Fr Sa Su`. 7-col grid, `h-11` day buttons: number + up to 3 session dots (type color), "+" if more, dashed dot planned, `bg-white/20` dot rest. Today accent ring; selected `bg-panel2 ring-2 ring-white`.

### Fab
Fixed bottom-right (safe-area+16 right, +72 bottom). 56px accent circle, "+" rotates 45° when open (`active:scale-95`). Tap-outside closes. Menu (`w-52 bg-panel border rounded-2xl divide-y`): 📋 "From plans" → `/plan`; 🛠️ "New workout" → `/workout/new`; 🏀 "Quick custom" → `/custom/log`; 🛌 "Rest day" → rest log today + refresh.

### FeltPicker
"How it felt" + 3 buttons (🥵 Cooked / 🫡 Locked in / 🔥 On fire), text-3xl emoji + tiny label. Active `bg-accent/10 border-accent` label accent; else panel/line, muted.

### MoreMenu
⋯ (`w-8 h-8 rounded-full text-muted`). Dropdown `bg-panel2 border rounded-lg shadow-xl`. Items `{label, onClick?/to?, destructive?}`, destructive `text-red-400`. Outside-tap closes.

### ProfileDialog
Bottom sheet (mobile). Backdrop `bg-black/70 blur` — dismissable only if NOT first-time. "Welcome"/"Profile", "Set up your profile"/"Edit profile" + weight-preference helper. First name (autofocus). "Weight preference" 2-up: Men's (Heavier loads) / Women's (Lighter loads), active `bg-accent/10 border-accent text-accent`. Cancel (non-first) + Save (needs name+gender).

### ResultHero
Headline priority: total time ("Total time") → AMRAP rounds+reps (dimmed "+reps", "Rounds + reps") → cals ("Calories") → intervals ("Intervals logged") → "No results recorded." Gradient text `clamp(5rem,26vw,9rem)` (page) / `clamp(4.5rem,22vw,7rem)` (card). Felt sticker: `bg-panel2 ring-[3px] ring-bg rotate-[-12deg]` bottom-right. Dual radial background, `✦` sparkles, bottom micro-label.

### RpeSlider — **UNUSED — skip.**

### Sparkline
SVG line. Default 96×28; detailed adds dots (latest coral #FF6B6B). Stroke gradient `#FFD500→#FF9B5C→#FF6B6B`. Null if <2 points.

### TimeInput
Digits-only stopwatch entry, colon auto-rendered, fills right-to-left (5→0:05 → mm:ss → h:mm:ss, MAX 6 digits). Focus selects all; caret pinned to end. Blur commits `digitsToSec` (rolls sec≥60). Variants default (`w-32 text-lg`) / compact (`w-24`). `bg-panel2 font-mono tabular-nums`, placeholder "h:mm:ss".

### TypePicker
Chip row: dot + name; selected tinted (`color`, border, bg `{color}1A`), unselected muted. Tap toggles. "+ New type" (dashed, accent) inline create; "✎ Edit type" (one selected). Form: name + TYPE_COLORS swatches + Create/Save (text in chosen color). Colors resolve live (editing recolors past logs).

### UpdatePrompt — **PWA-only, drop.**

### WorkoutList
Empty → "No custom workouts yet. Build your first →". Row: colored bar (type color → intensity color → `#5BC0EB`), name (`font-display text-lg`), setup summary + type name + intensity (INTENSITY_COLOR). Row → `/workout/:id`. MoreMenu: Edit, Delete (confirm `Delete "{name}"? Past logs are kept.`).

---

## 5. DATA MODEL

Dexie DB `hyrox-tracker`: `logs`, `workouts` (soft-delete `archived`), `plans` (soft-delete `archived`), `workoutTypes` (seeded Running/Functional/Deadhang). Full field lists in `src/types.ts`. Curated plan id `curated-12-week`, virtual until Started. Curated days Mon–Fri; user plans full week.

Logic to port: `format.ts` (formatWeight/formatQty/formatExercise/setupSummary/formatSec); `logSummary.ts` (logKind/logSummary/hasResults/groupLogsByDate); `planStats.ts` (weekBuckets/weekProgress/computeStreak/computeActivityStreak/isQualifying — Mon-first, current week graced); `progress.ts` (buildProgress/trend/extractMetric); `workouts.ts` (customToSetup/buildSnapshot/normalizeBlocks/totalRounds); `plans.ts`; `logTypeColor.ts` (resolution order: log.typeId → curated day category → workout.typeId → "Other").

---

## 6. CROSS-CUTTING

- **localStorage**: `hyrox.profile.v1`, `hyrox.calview.v1` ('grid'|'month').
- **Haptics**: celebrate = `navigator.vibrate([20,40,20])` → iOS `UINotificationFeedbackGenerator.success`. Confetti: two 80-particle bursts from lower corners (x 0.2/0.8, y 0.85), colors `#F0E040,#FFD500,#5BC0EB,#FF6B6B,#2ECC71`.
- **Celebration trigger**: `?celebrate=1` when a log gains real results (LogPage) or any CustomLog save; consumed once on LogDetailPage. → transient flag on navigation in SwiftUI.
- **Confirm copy**: "Delete this log? Cannot be undone."; "Delete this planned workout?"; `"{date} already has: {summary}.\n\nAdd {label} on top?"`; `Delete "{name}"? Your logged sessions are kept.` (plan); `Delete "{name}"? Past logs are kept.` (workout).
- **Dates**: local-time ISO `yyyy-mm-dd`; Mon-first weeks; ordering by createdAt desc; parse ISO with `T00:00:00` (local).
- **Streaks**: activity = consecutive Mon-first weeks with any non-rest logged session (current graced); cadence = weeks meeting goalPerWeek (current graced); celebration day-streak = consecutive days.
- **Rails/bars**: snap rails w/ peek + dots; week strips auto-center; fixed save bars flush atop 56px tab bar; overlays lock scroll.
- **Dead code**: RpeSlider.tsx, App.css, `/workout/library` orphan, `accent2` class unused.
- **Inconsistencies to resolve**: two intensity maps; text-on-accent `#1a1a1a` vs `#0a0a0a`; body text `#f4f4f4` vs `#fff`.
