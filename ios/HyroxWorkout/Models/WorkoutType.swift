import Foundation

/// A reusable label for workouts (Running, Functional, …). Mirrors the web
/// `WorkoutType`; defaults are seeded server-side on first sign-in.
struct WorkoutType: Codable, Hashable, Identifiable {
    var id: String
    var name: String
    var color: String   // hex, rendered via Color(hex:)
    var createdAt: Double
}
