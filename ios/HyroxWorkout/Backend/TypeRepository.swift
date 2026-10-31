import Foundation
import Supabase

// `workout_types` is all real columns (name/color are filtered and rendered
// directly) — no jsonb payload. Defaults are seeded by the signup trigger.

struct TypeRepository {
    let client: SupabaseClient

    init(client: SupabaseClient = Backend.client) { self.client = client }

    private struct Row: Decodable {
        let id: String
        let name: String
        let color: String
        let created_at: Date?

        func toDomain() -> WorkoutType {
            WorkoutType(id: id, name: name, color: color, createdAt: created_at?.epochMillis ?? 0)
        }
    }

    private struct Insert: Encodable {
        let id: String
        let user_id: String
        let name: String
        let color: String
        let created_at: Date
    }

    func fetchAll() async throws -> [WorkoutType] {
        let rows: [Row] = try await client
            .from("workout_types")
            .select()
            .order("created_at", ascending: true)
            .execute()
            .value
        return rows.map { $0.toDomain() }
    }

    func save(_ type: WorkoutType, userID: String) async throws {
        let row = Insert(id: type.id, user_id: userID, name: type.name,
                         color: type.color, created_at: Date(epochMillis: type.createdAt))
        try await client.from("workout_types").upsert(row).execute()
    }
}
