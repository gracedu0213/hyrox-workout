import XCTest
@testable import HyroxWorkout

// Integration tests against the LOCAL Supabase stack (`supabase start`). They
// exercise the real path: email signup → RLS-scoped reads/writes → repository
// mapping → onboarding trigger. Auto-skipped if the stack isn't reachable, so
// they don't break a plain `xcodebuild test` on a machine without Docker.

final class BackendIntegrationTests: XCTestCase {
    private let auth = AuthService()
    private let repo = WorkoutRepository()

    override func setUp() async throws {
        var req = URLRequest(url: URL(string: "http://127.0.0.1:54321/auth/v1/health")!)
        req.timeoutInterval = 2
        do {
            _ = try await URLSession.shared.data(for: req)
        } catch {
            throw XCTSkip("Local Supabase not reachable — run `supabase start`.")
        }
    }

    func testSignupSeedsDefaultTypesAndWorkoutRoundTrips() async throws {
        // Email confirmations are off locally, so signUp returns an active session.
        let email = "test-\(UUID().uuidString)@example.com"
        _ = try await Backend.client.auth.signUp(email: email, password: "password123")
        let userID = try XCTUnwrap(Backend.client.auth.currentUser).id.uuidString

        // 1) The on-signup trigger seeded three default types, visible under RLS.
        struct TypeRow: Decodable { let name: String }
        let types: [TypeRow] = try await Backend.client
            .from("workout_types").select().order("created_at").execute().value
        XCTAssertEqual(types.map(\.name), ["Running", "Functional", "Deadhang"])

        // 2) Save a workout, read it back through the repository (RLS + envelope mapping).
        let workout = CustomWorkout(
            id: newID(),
            name: "Engine Builder",
            format: .amrap(durationSec: 900),
            blocks: [Block(label: nil, repeatCount: 1, rows: [
                .exercise(ExSpec(name: "Row", qty: 1000, unit: .meters, weight: nil, note: nil)),
                .rest(restSec: 60),
            ])],
            typeId: nil, intensity: .moderate, notes: ["Steady"],
            createdAt: 0, archived: false
        )
        try await repo.save(workout, userID: userID)

        let fetched = try await repo.fetchAll()
        let mine = try XCTUnwrap(fetched.first { $0.id == workout.id })
        XCTAssertEqual(mine.name, "Engine Builder")
        XCTAssertEqual(mine.format, .amrap(durationSec: 900))          // jsonb round-trip
        XCTAssertEqual(mine.blocks.first?.rows.count, 2)
        XCTAssertEqual(mine.blocks.first?.rows.last, .rest(restSec: 60))
        XCTAssertEqual(mine.intensity, .moderate)

        // 3) Delete removes it.
        try await repo.delete(id: workout.id)
        let after = try await repo.fetchAll()
        XCTAssertNil(after.first { $0.id == workout.id })

        try await auth.signOut()
    }
}
