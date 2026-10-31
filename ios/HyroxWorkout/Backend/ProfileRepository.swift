import Foundation
import Supabase

// `profiles` is 1:1 with auth.users — first name + weight preference.

struct ProfileRepository {
    let client: SupabaseClient

    init(client: SupabaseClient = Backend.client) { self.client = client }

    private struct Row: Codable {
        let id: String
        let first_name: String?
        let gender: Gender?
    }

    func fetch(userID: String) async throws -> UserProfile? {
        let rows: [Row] = try await client
            .from("profiles")
            .select()
            .eq("id", value: userID)
            .execute()
            .value
        guard let row = rows.first, let name = row.first_name, let gender = row.gender else { return nil }
        return UserProfile(firstName: name, gender: gender)
    }

    func save(_ profile: UserProfile, userID: String) async throws {
        let row = Row(id: userID, first_name: profile.firstName, gender: profile.gender)
        try await client.from("profiles").upsert(row).execute()
    }
}
