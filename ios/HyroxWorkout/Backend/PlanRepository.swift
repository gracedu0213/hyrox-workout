import Foundation
import Supabase

// Maps `UserPlan` to/from the `user_plans` envelope. Only `active`/`archived`
// are columns; the plan's shape (content, cadence goal, looks) lives in `data`.

struct PlanRepository {
    let client: SupabaseClient

    init(client: SupabaseClient = Backend.client) { self.client = client }

    private struct Payload: Codable {
        var name: String
        var color: String
        var icon: String?
        var content: PlanContent?
        var goalPerWeek: Int?
        var durationWeeks: Int?
        var startDate: String?
    }

    private struct Row: Decodable {
        let id: String
        let active: Bool
        let archived: Bool
        let data: Payload
        let created_at: Date?

        func toDomain() -> UserPlan {
            UserPlan(
                id: id, name: data.name, color: data.color, icon: data.icon,
                content: data.content, goalPerWeek: data.goalPerWeek,
                durationWeeks: data.durationWeeks, startDate: data.startDate,
                active: active, createdAt: created_at?.epochMillis ?? 0,
                archived: archived
            )
        }
    }

    private struct Insert: Encodable {
        let id: String
        let user_id: String
        let active: Bool
        let archived: Bool
        let data: Payload
        let created_at: Date
    }

    func fetchAll() async throws -> [UserPlan] {
        let rows: [Row] = try await client
            .from("user_plans")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value
        return rows.map { $0.toDomain() }
    }

    func save(_ plan: UserPlan, userID: String) async throws {
        let payload = Payload(
            name: plan.name, color: plan.color, icon: plan.icon,
            content: plan.content, goalPerWeek: plan.goalPerWeek,
            durationWeeks: plan.durationWeeks, startDate: plan.startDate
        )
        let row = Insert(
            id: plan.id, user_id: userID, active: plan.active,
            archived: plan.archived ?? false, data: payload,
            created_at: Date(epochMillis: plan.createdAt)
        )
        try await client.from("user_plans").upsert(row).execute()
    }
}
