#if DEBUG
import Foundation

// DEBUG-only launch hooks for driving the simulator from the command line:
//   SIMCTL_CHILD_AUTOLOGIN=1  — sign up a throwaway local-Supabase user
//   SIMCTL_CHILD_SEED_DEMO=1  — populate the store with representative data
//   SIMCTL_CHILD_START_TAB=plan|progress — land on a specific tab
// Used for screenshot-based visual verification; no effect in release builds.

enum DemoSeed {
    static var autologin: Bool { ProcessInfo.processInfo.environment["AUTOLOGIN"] == "1" }
    static var seedRequested: Bool { ProcessInfo.processInfo.environment["SEED_DEMO"] == "1" }

    static var startTab: Tab? {
        switch ProcessInfo.processInfo.environment["START_TAB"] {
        case "plan": return .plan
        case "progress": return .progress
        default: return nil
        }
    }

    @MainActor
    static func run(store: AppStore) async {
        if autologin, !store.auth.isSignedIn {
            let email = "sim-\(UUID().uuidString.prefix(8))@example.com"
            _ = try? await Backend.client.auth.signUp(email: email, password: "password123")
        }
        guard seedRequested, store.logs.isEmpty else { return }

        store.saveProfile(UserProfile(firstName: "Grace", gender: .F))

        let today = DateUtils.todayISO()
        let now = Date().epochMillis
        func day(_ offset: Int) -> String { DateUtils.isoDate(DateUtils.addDays(Date(), offset)) }

        // A go-to workout + cadence plan mid-week.
        let engine = CustomWorkout(
            id: newID(), name: "Engine Builder", format: .amrap(durationSec: 1200),
            blocks: [Block(label: nil, repeatCount: 1, rows: [
                .exercise(ExSpec(name: "Row", qty: 500, unit: .meters)),
                .exercise(ExSpec(name: "Wall Balls", qty: 20, unit: .reps,
                                 weight: SingleWeight(value: 6, unit: .kg))),
                .rest(restSec: 60),
            ])],
            typeId: nil, intensity: .hard, notes: ["Steady pace"], createdAt: now - 86_400_000 * 30, archived: nil)
        store.saveWorkout(engine)

        var runPlan = UserPlan(
            id: newID(), name: "Run 5×/week", color: "#5BC0EB", icon: "🏃",
            content: nil, goalPerWeek: 5, durationWeeks: nil, startDate: nil,
            active: true, createdAt: now - 86_400_000 * 21, archived: nil)
        runPlan.content = .pool(slots: [.workout(workoutId: engine.id, dayOfWeek: nil)])
        store.savePlan(runPlan)

        // Today: a planned curated day.
        store.saveLog(WorkoutLog(dayId: "w01-mon", date: today, createdAt: now, status: .planned))

        // History: runs toward the plan + repeated workouts for Progress.
        for (offset, sec) in [(-16, 1260), (-9, 1200), (-2, 1122)] {
            var l = WorkoutLog(id: newID(), workoutId: engine.id, kind: .custom,
                               date: day(offset), createdAt: now + Double(offset),
                               totalTimeSec: sec, feltLike: .good, status: .logged)
            l.customName = engine.name
            l.workoutSnapshot = buildSnapshot(engine)
            store.saveLog(l)
        }
        for offset in [-1, -3, -7, -8, -10, -14] {
            var l = WorkoutLog(id: newID(), kind: .custom, date: day(offset),
                               createdAt: now + Double(offset), status: .logged)
            l.customName = "Easy run"
            l.planId = runPlan.id
            l.totalTimeSec = 2400 + offset * 30
            l.feltLike = offset % 2 == 0 ? .ok : .good
            store.saveLog(l)
        }
        var rest = WorkoutLog(kind: .rest, date: day(-4), createdAt: now - 4, status: .logged)
        rest.id = newID()
        store.saveLog(rest)
    }
}
#endif
