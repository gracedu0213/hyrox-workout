import XCTest
@testable import HyroxWorkout

// End-to-end sync against the LOCAL Supabase stack: mutate an offline-first
// AppStore, push, then pull into a brand-new store (fresh device) and verify
// every entity arrives byte-identical. Auto-skipped without `supabase start`.

@MainActor
final class SyncIntegrationTests: XCTestCase {

    override func setUp() async throws {
        var req = URLRequest(url: URL(string: "http://127.0.0.1:54321/auth/v1/health")!)
        req.timeoutInterval = 2
        do {
            _ = try await URLSession.shared.data(for: req)
        } catch {
            throw XCTSkip("Local Supabase not reachable — run `supabase start`.")
        }
    }

    private func freshStore() -> AppStore {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("sync-test-\(UUID().uuidString)", isDirectory: true)
        return AppStore(local: LocalStore(directory: dir))
    }

    func testMutationsRoundTripThroughSync() async throws {
        let email = "sync-\(UUID().uuidString)@example.com"
        _ = try await Backend.client.auth.signUp(email: email, password: "password123")

        // Device 1: create a workout, commit a plan, log a session, set profile.
        let store1 = freshStore()
        await store1.loadFromDisk()

        let workout = CustomWorkout(
            id: newID(), name: "Sync Engine", format: .forTime,
            blocks: [Block(label: nil, repeatCount: 4, rows: [
                .exercise(ExSpec(name: "Row", qty: 500, unit: .meters)),
                .rest(restSec: 60),
            ])],
            typeId: nil, intensity: .hard, notes: ["Steady"], createdAt: 1_780_000_000_000,
            archived: false) // the DB's non-null column canonicalizes nil → false
        store1.saveWorkout(workout)

        var plan = curatedDescriptor()
        plan.id = newID()          // committed curated plan gets a real uuid
        plan.active = true
        plan.createdAt = 1_780_000_000_000
        plan.archived = false
        store1.savePlan(plan)

        var log = WorkoutLog(
            id: newID(), workoutId: workout.id, kind: .custom, planId: plan.id,
            workoutSnapshot: buildSnapshot(workout),
            date: "2026-07-02", createdAt: 1_780_000_100_000,
            totalTimeSec: 1122, feltLike: .good, status: .logged)
        log.roundSplits = [RoundSplit(roundIndex: 0, splitSec: 280)]
        store1.saveLog(log)

        store1.saveProfile(UserProfile(firstName: "Grace", gender: .F))

        await store1.syncNow()

        // Device 2: nothing local; pull everything.
        let store2 = freshStore()
        await store2.loadFromDisk()
        XCTAssertTrue(store2.logs.isEmpty)
        await store2.syncNow()

        // Seeded defaults + our entities all arrived.
        XCTAssertEqual(store2.sortedTypes.map(\.name), ["Running", "Functional", "Deadhang"])
        XCTAssertEqual(store2.workouts.map(\.id), [workout.id])
        XCTAssertEqual(store2.workout(id: workout.id), workout)

        let pulledPlan = try XCTUnwrap(store2.plan(id: plan.id))
        XCTAssertTrue(pulledPlan.isCurated)
        XCTAssertTrue(pulledPlan.active)
        XCTAssertEqual(pulledPlan, plan)

        let pulledLog = try XCTUnwrap(store2.log(id: log.id))
        XCTAssertEqual(pulledLog, log)
        XCTAssertEqual(pulledLog.workoutSnapshot?.setup, .rft(rounds: 4))

        XCTAssertEqual(store2.profile, UserProfile(firstName: "Grace", gender: .F))

        // Deletes propagate too.
        store2.deleteLog(id: log.id)
        await store2.syncNow()
        await store1.syncNow()
        XCTAssertNil(store1.log(id: log.id))

        try await AuthService().signOut()
    }
}
