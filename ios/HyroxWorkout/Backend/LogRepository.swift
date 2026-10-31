import Foundation
import Supabase

// Maps `WorkoutLog` to/from the `workout_logs` row envelope: indexed columns
// (id, day_id, date, kind, status, workout_id, plan_id, type_id, timestamps)
// + a `data` jsonb payload with the variant-shaped result fields. New result
// shapes live entirely inside `data` — this mapping never changes for one.

struct LogRepository {
    let client: SupabaseClient

    init(client: SupabaseClient = Backend.client) { self.client = client }

    /// Everything the DB doesn't index on.
    private struct Payload: Codable {
        var customName: String?
        var intensity: Intensity?
        var workoutSnapshot: WorkoutSnapshot?
        var totalTimeSec: Int?
        var roundSplits: [RoundSplit]?
        var amrap: AMRAPResult?
        var intervals: IntervalResult?
        var exercises: [ExerciseLogEntry]?
        var feltLike: FeltLike?
        var notes: String?
        var modifications: String?
    }

    private struct Row: Decodable {
        let id: String
        let day_id: String?
        let workout_id: String?
        let plan_id: String?
        let type_id: String?
        let date: String
        let kind: LogKind?
        let status: LogStatus?
        let data: Payload
        let created_at: Date?

        func toDomain() -> WorkoutLog {
            WorkoutLog(
                id: id, dayId: day_id, workoutId: workout_id,
                customName: data.customName, kind: kind, typeId: type_id,
                intensity: data.intensity, planId: plan_id,
                workoutSnapshot: data.workoutSnapshot,
                date: date, createdAt: created_at?.epochMillis ?? 0,
                totalTimeSec: data.totalTimeSec, roundSplits: data.roundSplits,
                amrap: data.amrap, intervals: data.intervals,
                exercises: data.exercises, feltLike: data.feltLike,
                notes: data.notes, modifications: data.modifications,
                status: status
            )
        }
    }

    private struct Insert: Encodable {
        let id: String
        let user_id: String
        let day_id: String?
        let workout_id: String?
        let plan_id: String?
        let type_id: String?
        let date: String
        let kind: LogKind?
        let status: LogStatus?
        let data: Payload
        let created_at: Date
    }

    func fetchAll() async throws -> [WorkoutLog] {
        let rows: [Row] = try await client
            .from("workout_logs")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value
        return rows.map { $0.toDomain() }
    }

    func save(_ log: WorkoutLog, userID: String) async throws {
        let payload = Payload(
            customName: log.customName, intensity: log.intensity,
            workoutSnapshot: log.workoutSnapshot, totalTimeSec: log.totalTimeSec,
            roundSplits: log.roundSplits, amrap: log.amrap, intervals: log.intervals,
            exercises: log.exercises, feltLike: log.feltLike,
            notes: log.notes, modifications: log.modifications
        )
        let row = Insert(
            id: log.id, user_id: userID, day_id: log.dayId,
            workout_id: log.workoutId, plan_id: log.planId, type_id: log.typeId,
            date: log.date, kind: log.kind, status: log.status,
            data: payload, created_at: Date(epochMillis: log.createdAt)
        )
        try await client.from("workout_logs").upsert(row).execute()
    }

    func delete(id: String) async throws {
        try await client.from("workout_logs").delete().eq("id", value: id).execute()
    }
}
