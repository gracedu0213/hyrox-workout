import Foundation
import Supabase

// Maps the `CustomWorkout` domain object to/from the `custom_workouts` row
// envelope: indexed columns (id, name, type_id, archived, timestamps) + a `data`
// jsonb payload holding the variant-shaped fields. A new workout format lives
// entirely inside `data.format`, so this mapping never changes to support one.

struct WorkoutRepository {
    let client: SupabaseClient

    init(client: SupabaseClient = Backend.client) { self.client = client }

    /// The jsonb payload — everything the DB doesn't index on.
    private struct Payload: Codable {
        var format: WorkoutFormat
        var blocks: [Block]
        var intensity: Intensity?
        var notes: [String]
    }

    private struct Row: Decodable {
        let id: String
        let name: String
        let type_id: String?
        let archived: Bool
        let data: Payload
        let created_at: Date?

        func toDomain() -> CustomWorkout {
            CustomWorkout(
                id: id, name: name, format: data.format, blocks: data.blocks,
                typeId: type_id, intensity: data.intensity, notes: data.notes,
                createdAt: created_at?.epochMillis ?? 0, archived: archived
            )
        }
    }

    private struct Insert: Encodable {
        let id: String
        let user_id: String
        let name: String
        let type_id: String?
        let archived: Bool
        let data: Payload
        let created_at: Date
    }

    /// All rows, archived included — filtering is a UI concern (matching the
    /// web, which keeps archived rows in the store too).
    func fetchAll() async throws -> [CustomWorkout] {
        let rows: [Row] = try await client
            .from("custom_workouts")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value
        return rows.map { $0.toDomain() }
    }

    /// Upsert on the primary key so save handles both create and edit.
    func save(_ workout: CustomWorkout, userID: String) async throws {
        let payload = Payload(format: workout.format, blocks: workout.blocks,
                              intensity: workout.intensity, notes: workout.notes)
        let row = Insert(id: workout.id, user_id: userID, name: workout.name,
                         type_id: workout.typeId, archived: workout.archived ?? false,
                         data: payload, created_at: Date(epochMillis: workout.createdAt))
        try await client.from("custom_workouts").upsert(row).execute()
    }

    func delete(id: String) async throws {
        try await client.from("custom_workouts").delete().eq("id", value: id).execute()
    }
}
