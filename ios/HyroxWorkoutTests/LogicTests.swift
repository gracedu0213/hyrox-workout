import XCTest
@testable import HyroxWorkout

// Ports of src/format.ts, dateUtils.ts, logSummary.ts, planStats.ts,
// progress.ts, workouts.ts, plans.ts — pinned to the web's exact behavior.

final class FormatTests: XCTestCase {

    func testFormatSec() {
        XCTAssertEqual(formatSec(45), "45s")
        XCTAssertEqual(formatSec(60), "1:00")
        XCTAssertEqual(formatSec(90), "1:30")
        XCTAssertEqual(formatSec(300), "5:00")
        XCTAssertEqual(formatSec(1122), "18:42")
        XCTAssertEqual(formatSec(3600), "1:00:00")
        XCTAssertEqual(formatSec(3725), "1:02:05")
    }

    func testSetupSummaryMatchesWeb() {
        XCTAssertEqual(setupSummary(.forTime), "For Time")
        XCTAssertEqual(setupSummary(.rft(rounds: 4)), "4 Rounds for Time")
        XCTAssertEqual(setupSummary(.descendingRounds(rounds: 3, roundDetails: nil)), "3 Rounds (descending reps)")
        XCTAssertEqual(setupSummary(.amrap(durationSec: 1500)), "25 Min AMRAP")
        XCTAssertEqual(setupSummary(.multiWindowAmrap(windows: [
            MultiWindow(label: "a", durationSec: 720, exerciseRefs: nil),
            MultiWindow(label: "b", durationSec: 720, exerciseRefs: nil),
        ])), "2-Window AMRAP")
        XCTAssertEqual(setupSummary(.emom(everySec: 90, totalRounds: 8)), "Every 1:30 × 8")
        XCTAssertEqual(
            setupSummary(.intervals(rounds: 8, workSec: nil, restSec: 120, workDescription: "400m run")),
            "8 × 400m run / 2:00 rest")
        XCTAssertEqual(
            setupSummary(.intervals(rounds: 5, workSec: 60, restSec: nil, workDescription: nil)),
            "5 × 1:00")
        XCTAssertEqual(
            setupSummary(.intervals(rounds: 6, workSec: nil, restSec: nil, workDescription: nil)),
            "6 intervals")
        XCTAssertEqual(setupSummary(.forQuality), "For Quality")
        XCTAssertEqual(setupSummary(.ladder(sequence: [5, 10, 15], ascending: true, openEnded: true)), "Ladder 5-10-15-etc")
        XCTAssertEqual(setupSummary(.rounds(rounds: 6)), "6 Rounds")
    }

    func testFormatWeightGendered() {
        let kb = Weight(lbsM: 53, kgM: 24, lbsF: 35, kgF: 16, count: 2, note: nil)
        XCTAssertEqual(formatWeight(kb), "53/35lbs / 24/16kg × 2")
        XCTAssertEqual(formatWeight(kb, gender: .M), "53lbs / 24kg × 2")
        XCTAssertEqual(formatWeight(kb, gender: .F), "35lbs / 16kg × 2")
        XCTAssertEqual(formatWeight(Weight(kgM: 12.5, note: "AHAP")), "12.5kg (AHAP)")
        XCTAssertEqual(formatWeight(nil), "")
    }

    func testFormatQty() {
        XCTAssertEqual(formatQty(Exercise(name: "x", perRound: [30, 20, 10])), "30-20-10")
        XCTAssertEqual(
            formatQty(Exercise(name: "x", unit: .calories, ladder: Ladder(start: 10, step: 5, openEnded: true))),
            "10-15-20-25-30-etc cal")
        XCTAssertEqual(formatQty(Exercise(name: "x", unit: .minutes, qtyMin: 45, qtyMax: 60)), "45-60 min")
        XCTAssertEqual(formatQty(Exercise(name: "x", unit: .failure)), "to Failure")
        XCTAssertEqual(formatQty(Exercise(name: "x", qty: 1, unit: .reps)), "1 rep")
        XCTAssertEqual(formatQty(Exercise(name: "x", qty: 20, unit: .reps)), "20 reps")
        XCTAssertEqual(formatQty(Exercise(name: "x", qty: 500, unit: .meters)), "500m")
        XCTAssertEqual(formatQty(Exercise(name: "x")), "")
    }

    func testFormatExercise() {
        let ex = Exercise(
            name: "KB Deadlifts", qty: 20, unit: .reps,
            weight: Weight(lbsM: 53, kgM: 24, lbsF: 35, kgF: 16, count: 2),
            note: "Should be done in 1 set")
        XCTAssertEqual(
            formatExercise(ex, gender: .M),
            "20 reps KB Deadlifts (53lbs / 24kg × 2) — Should be done in 1 set")
        XCTAssertEqual(formatExercise(Exercise(name: "— Block 1 —")), "— Block 1 —")
        XCTAssertEqual(
            formatExercise(Exercise(name: "Sled Push", qty: 50, unit: .feet, modifier: "AHAP")),
            "50ft Sled Push (AHAP)")
    }
}

final class DateUtilsTests: XCTestCase {

    func testMondayOfWeek() {
        // 2026-07-02 is a Thursday → Monday is 2026-06-29.
        XCTAssertEqual(DateUtils.isoDate(DateUtils.mondayOfWeek(DateUtils.parseISO("2026-07-02"))), "2026-06-29")
        // Sunday belongs to the week that STARTED the previous Monday.
        XCTAssertEqual(DateUtils.isoDate(DateUtils.mondayOfWeek(DateUtils.parseISO("2026-07-05"))), "2026-06-29")
        // Monday maps to itself.
        XCTAssertEqual(DateUtils.isoDate(DateUtils.mondayOfWeek(DateUtils.parseISO("2026-06-29"))), "2026-06-29")
    }

    func testIsoRoundTrip() {
        XCTAssertEqual(DateUtils.isoDate(DateUtils.parseISO("2026-01-05")), "2026-01-05")
    }
}

final class LogSummaryTests: XCTestCase {

    private func log(_ mutate: (inout WorkoutLog) -> Void) -> WorkoutLog {
        var l = WorkoutLog(date: "2026-07-02", createdAt: 0)
        mutate(&l)
        return l
    }

    func testKindResolution() {
        XCTAssertEqual(log { $0.dayId = "w01-mon" }.resolvedKind, .plan)
        XCTAssertEqual(log { $0.customName = "Basketball" }.resolvedKind, .custom)
        XCTAssertEqual(log { _ in }.resolvedKind, .rest)
        XCTAssertEqual(log { $0.kind = .rest; $0.dayId = "w01-mon" }.resolvedKind, .rest)
    }

    func testHasResults() {
        XCTAssertTrue(log { $0.kind = .rest }.hasResults)                      // rest is done by itself
        XCTAssertFalse(log { $0.dayId = "w01-mon" }.hasResults)
        XCTAssertFalse(log { $0.dayId = "w01-mon"; $0.notes = "" }.hasResults) // empty string is falsy on web
        XCTAssertTrue(log { $0.dayId = "w01-mon"; $0.notes = "hard" }.hasResults)
        XCTAssertTrue(log { $0.dayId = "w01-mon"; $0.feltLike = .good }.hasResults)
        XCTAssertTrue(log { $0.dayId = "w01-mon"; $0.totalTimeSec = 300 }.hasResults)
    }

    func testSummary() {
        XCTAssertEqual(log { $0.kind = .rest }.summary, "Rest day")
        XCTAssertEqual(log { $0.dayId = "d"; $0.status = .planned }.summary, "Planned — no results yet")
        XCTAssertEqual(log { $0.dayId = "d"; $0.totalTimeSec = 1122; $0.feltLike = .good }.summary, "18:42 · 🔥")
        XCTAssertEqual(
            log { $0.dayId = "d"; $0.amrap = AMRAPResult(fullRounds: 5, partialReps: 12) }.summary,
            "5+12")
        XCTAssertEqual(
            log {
                $0.dayId = "d"
                $0.amrap = AMRAPResult(perWindow: [
                    AMRAPWindowResult(label: "w1", fullRounds: 3, partialReps: 4),
                    AMRAPWindowResult(label: "w2", fullRounds: nil, partialReps: nil),
                ])
            }.summary,
            "(3+4)")
        XCTAssertEqual(
            log { $0.dayId = "d"; $0.intervals = IntervalResult(splits: [
                IntervalSplit(roundIndex: 0, valueSec: 90),
                IntervalSplit(roundIndex: 1, valueSec: 92),
            ]) }.summary,
            "2 intervals logged")
    }
}

final class PlanStatsTests: XCTestCase {
    private let ref = DateUtils.parseISO("2026-07-02") // Thu; week of Mon 06-29

    private func qualifyingLog(date: String, planId: String? = "p1") -> WorkoutLog {
        var l = WorkoutLog(date: date, createdAt: 0)
        l.kind = .custom
        l.customName = "X"
        l.planId = planId
        l.totalTimeSec = 600
        l.status = .logged
        return l
    }

    private var plan: UserPlan {
        UserPlan(id: "p1", name: "Run", color: "#5BC0EB", icon: nil, content: nil,
                 goalPerWeek: 2, durationWeeks: nil, startDate: nil,
                 active: true, createdAt: 0, archived: nil)
    }

    func testIsQualifying() {
        XCTAssertTrue(PlanStats.isQualifying(qualifyingLog(date: "2026-07-01"), planId: "p1"))
        XCTAssertFalse(PlanStats.isQualifying(qualifyingLog(date: "2026-07-01", planId: nil), planId: "p1"))
        var rest = WorkoutLog(date: "2026-07-01", createdAt: 0)
        rest.kind = .rest
        rest.planId = "p1"
        XCTAssertFalse(PlanStats.isQualifying(rest, planId: "p1"))
        var planned = qualifyingLog(date: "2026-07-01")
        planned.totalTimeSec = nil
        XCTAssertFalse(PlanStats.isQualifying(planned, planId: "p1"))
    }

    func testWeekProgress() {
        let logs = [
            qualifyingLog(date: "2026-06-29"),
            qualifyingLog(date: "2026-07-01"),
            qualifyingLog(date: "2026-06-25"), // previous week
        ]
        let (done, goal) = PlanStats.weekProgress(logs, plan: plan, refDate: ref)
        XCTAssertEqual(done, 2)
        XCTAssertEqual(goal, 2)
    }

    func testStreakGracesCurrentWeek() {
        // Two prior weeks met the 2×/week goal; current week has only 1 so far.
        let logs = [
            qualifyingLog(date: "2026-06-15"), qualifyingLog(date: "2026-06-17"),
            qualifyingLog(date: "2026-06-22"), qualifyingLog(date: "2026-06-24"),
            qualifyingLog(date: "2026-06-29"),
        ]
        // Unmet current week doesn't break the prior streak.
        XCTAssertEqual(PlanStats.computeStreak(logs, plan: plan, refDate: ref), 2)
        // Meeting it adds the current week.
        XCTAssertEqual(
            PlanStats.computeStreak(logs + [qualifyingLog(date: "2026-07-01")], plan: plan, refDate: ref), 3)
        // A gap week resets.
        XCTAssertEqual(
            PlanStats.computeStreak(
                [qualifyingLog(date: "2026-06-08"), qualifyingLog(date: "2026-06-10")],
                plan: plan, refDate: ref),
            0)
    }

    func testActivityStreakIgnoresPlanAndRest() {
        var noPlan = qualifyingLog(date: "2026-06-24", planId: nil)
        noPlan.planId = nil
        var rest = WorkoutLog(date: "2026-07-01", createdAt: 0)
        rest.kind = .rest
        let logs = [qualifyingLog(date: "2026-07-01"), noPlan, rest]
        XCTAssertEqual(PlanStats.computeActivityStreak(logs, refDate: ref), 2)
    }
}

final class ProgressTests: XCTestCase {

    private func timedLog(id: String, date: String, sec: Int, workoutId: String) -> WorkoutLog {
        var l = WorkoutLog(id: id, date: date, createdAt: 0)
        l.kind = .custom
        l.workoutId = workoutId
        l.customName = "Engine"
        l.totalTimeSec = sec
        return l
    }

    func testBuildProgressGroupsAndTrends() {
        let logs = [
            timedLog(id: "a", date: "2026-06-01", sec: 1200, workoutId: "w1"),
            timedLog(id: "b", date: "2026-06-15", sec: 1100, workoutId: "w1"),
            timedLog(id: "c", date: "2026-06-20", sec: 900, workoutId: "w2"), // only once → dropped
        ]
        let progress = buildProgress(logs)
        XCTAssertEqual(progress.count, 1)
        let g = progress[0]
        XCTAssertEqual(g.key, "c:w1")
        XCTAssertEqual(g.unit, .time)
        XCTAssertTrue(g.lowerBetter)
        XCTAssertEqual(g.points.map(\.value), [1200, 1100])

        let t = trend(g)
        XCTAssertEqual(t.delta, -100)
        XCTAssertEqual(t.improved, true)
    }

    func testAmrapMetricHigherIsBetter() {
        func amrapLog(id: String, date: String, rounds: Int) -> WorkoutLog {
            var l = WorkoutLog(id: id, date: date, createdAt: 0)
            l.kind = .custom
            l.workoutId = "w1"
            l.amrap = AMRAPResult(fullRounds: rounds, partialReps: 3)
            return l
        }
        let progress = buildProgress([
            amrapLog(id: "a", date: "2026-06-01", rounds: 5),
            amrapLog(id: "b", date: "2026-06-10", rounds: 7),
        ])
        XCTAssertEqual(progress[0].unit, .rounds)
        XCTAssertEqual(trend(progress[0]).improved, true)
    }

    func testCuratedDayIdentityUsesWorkoutLabel() {
        func planLog(id: String, date: String, sec: Int) -> WorkoutLog {
            var l = WorkoutLog(id: id, date: date, createdAt: 0)
            l.dayId = "w01-mon"
            l.totalTimeSec = sec
            return l
        }
        let progress = buildProgress([
            planLog(id: "a", date: "2026-06-01", sec: 1200),
            planLog(id: "b", date: "2026-06-08", sec: 1150),
        ])
        XCTAssertEqual(progress[0].key, "p:w01-mon")
        XCTAssertEqual(progress[0].name, "4 RFT")
    }
}

final class WorkoutsLogicTests: XCTestCase {

    private func workout(format: WorkoutFormat, blocks: [Block]) -> CustomWorkout {
        CustomWorkout(id: "w1", name: "Test", format: format, blocks: blocks,
                      typeId: nil, intensity: nil, notes: [], createdAt: 0, archived: nil)
    }

    func testTotalRoundsSkipsRestOnlyBlocks() {
        let blocks = [
            Block(label: nil, repeatCount: 3, rows: [.exercise(ExSpec(name: "Row"))]),
            Block(label: nil, repeatCount: 1, rows: [.rest(restSec: 120)]),
            Block(label: nil, repeatCount: 2, rows: [.exercise(ExSpec(name: "Run"))]),
        ]
        XCTAssertEqual(totalRounds(blocks), 5)
    }

    func testForTimeWithMultipleRoundsBecomesRFT() {
        let w = workout(format: .forTime, blocks: [
            Block(label: nil, repeatCount: 4, rows: [.exercise(ExSpec(name: "Row"))]),
        ])
        XCTAssertEqual(customToSetup(w).setup, .rft(rounds: 4))

        let single = workout(format: .forTime, blocks: [
            Block(label: nil, repeatCount: 1, rows: [.exercise(ExSpec(name: "Row"))]),
        ])
        XCTAssertEqual(customToSetup(single).setup, .forTime)
    }

    func testFlattenInsertsSeparatorsAndRest() {
        let w = workout(format: .rounds, blocks: [
            Block(label: nil, repeatCount: 3, rows: [
                .exercise(ExSpec(name: "Row", qty: 500, unit: .meters)),
                .rest(restSec: 60),
            ]),
            Block(label: "Finisher", repeatCount: 1, rows: [
                .exercise(ExSpec(name: "Burpees", qty: 20, unit: .reps,
                                 weight: SingleWeight(value: 24, unit: .kg))),
            ]),
        ])
        let (_, exercises) = customToSetup(w)
        XCTAssertEqual(exercises.map(\.name), [
            "— Block 1 ×3 —", "Row", "— Rest 1:00 —", "— Finisher —", "Burpees",
        ])
        // Single weight maps onto kgM so genderless formatWeight prints "24kg".
        XCTAssertEqual(formatWeight(exercises[4].weight), "24kg")
    }

    func testSingleUnlabeledBlockHasNoSeparator() {
        let w = workout(format: .rounds, blocks: [
            Block(label: nil, repeatCount: 1, rows: [.exercise(ExSpec(name: "Row"))]),
        ])
        XCTAssertEqual(customToSetup(w).exercises.map(\.name), ["Row"])
    }

    func testBuildSnapshotCarriesEverything() {
        let w = workout(format: .amrap(durationSec: 720), blocks: [
            Block(label: nil, repeatCount: 1, rows: [.exercise(ExSpec(name: "Row"))]),
        ])
        let snap = buildSnapshot(w)
        XCTAssertEqual(snap.name, "Test")
        XCTAssertEqual(snap.setup, .amrap(durationSec: 720))
        XCTAssertEqual(snap.blocks, w.blocks)
    }
}

final class PlanHelpersTests: XCTestCase {

    private func plan(content: PlanContent?, goal: Int? = nil, weeks: Int? = nil) -> UserPlan {
        UserPlan(id: "p", name: "P", color: "#fff", icon: nil, content: content,
                 goalPerWeek: goal, durationWeeks: weeks, startDate: nil,
                 active: false, createdAt: 0, archived: nil)
    }

    func testSubtitles() {
        XCTAssertEqual(plan(content: .curated).subtitle, "12 weeks")
        XCTAssertEqual(plan(content: nil, goal: 5).subtitle, "5×/week · ongoing")
        XCTAssertEqual(plan(content: .pool(slots: []), goal: 3, weeks: 8).subtitle, "3×/week · 8 weeks")
        XCTAssertEqual(plan(content: .sequenced(weeks: [PlanWeek(slots: []), PlanWeek(slots: [])])).subtitle, "2 weeks")
        XCTAssertEqual(plan(content: .sequenced(weeks: [PlanWeek(slots: [])])).subtitle, "1 week")
        XCTAssertEqual(plan(content: nil).subtitle, "Plan")
    }

    func testCuratedIsNotCadence() {
        var curated = plan(content: .curated)
        curated.goalPerWeek = 5
        XCTAssertFalse(curated.isCadence)
        XCTAssertTrue(plan(content: nil, goal: 5).isCadence)
    }

    func testWithCuratedDedupesByContent() {
        XCTAssertEqual(withCurated([]).count, 1)
        XCTAssertTrue(withCurated([]).first!.isCurated)
        // A committed curated row (uuid id) suppresses the synthetic descriptor.
        var committed = plan(content: .curated)
        committed.id = "5f0c9d2e-0000-4000-8000-000000000000"
        let merged = withCurated([committed])
        XCTAssertEqual(merged.count, 1)
        XCTAssertEqual(merged.first?.id, committed.id)
    }

    func testWithDaySlot() {
        let week = PlanWeek(slots: [.workout(workoutId: "a", dayOfWeek: .mon)])
        let replaced = week.withDaySlot(.mon, .rest(dayOfWeek: .mon))
        XCTAssertEqual(replaced.slots, [.rest(dayOfWeek: .mon)])
        let cleared = week.withDaySlot(.mon, nil)
        XCTAssertTrue(cleared.slots.isEmpty)
        let added = week.withDaySlot(.tue, .workout(workoutId: "b", dayOfWeek: nil))
        XCTAssertEqual(added.slots.count, 2)
        XCTAssertEqual(added.slot(for: .tue)?.workoutId, "b")
    }

    func testLogTypeResolverPrecedence() {
        let types = [WorkoutType(id: "t1", name: "Running", color: "#5BC0EB", createdAt: 0)]
        let workouts = [CustomWorkout(id: "w1", name: "X", format: .rounds, blocks: [],
                                      typeId: "t1", intensity: nil, notes: [], createdAt: 0, archived: true)]
        let resolver = LogTypeResolver(types: types, workouts: workouts)

        var byTypeId = WorkoutLog(date: "2026-07-01", createdAt: 0)
        byTypeId.typeId = "t1"
        XCTAssertEqual(resolver.resolve(byTypeId)?.name, "Running")

        var byDay = WorkoutLog(date: "2026-07-01", createdAt: 0)
        byDay.dayId = "w01-mon"
        XCTAssertEqual(resolver.resolve(byDay), LogTypeInfo(name: "foundation", color: "#F0E040"))

        var byWorkout = WorkoutLog(date: "2026-07-01", createdAt: 0)
        byWorkout.workoutId = "w1" // archived workouts still resolve
        XCTAssertEqual(resolver.resolve(byWorkout)?.color, "#5BC0EB")

        XCTAssertNil(resolver.resolve(WorkoutLog(date: "2026-07-01", createdAt: 0)))
    }
}
