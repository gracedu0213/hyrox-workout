import Foundation

/// Mirrors the web profile (localStorage `hyrox.profile.v1`): first name +
/// weight preference. `gender` picks the M/F column of curated weights.
struct UserProfile: Codable, Hashable {
    var firstName: String
    var gender: Gender
}
