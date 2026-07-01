import Foundation

// Committable plans. Mirrors the web `UserPlan` family in src/types.ts; Codable
// JSON matches Supabase `user_plans.data`.

/// One item in a user-built week. Discriminated by `kind`. `dayOfWeek` is
/// optional: pin it to a weekday, or omit for "any day this week".
enum PlanSlot: Codable, Hashable {
    case workout(workoutId: String, dayOfWeek: DayOfWeek?)
    case rest(dayOfWeek: DayOfWeek?)

    private enum Kind: String, Codable { case workout, rest }
    private enum Keys: String, CodingKey { case kind, workoutId, dayOfWeek }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        let dow = try c.decodeIfPresent(DayOfWeek.self, forKey: .dayOfWeek)
        switch try c.decode(Kind.self, forKey: .kind) {
        case .workout: self = .workout(workoutId: try c.decode(String.self, forKey: .workoutId), dayOfWeek: dow)
        case .rest:    self = .rest(dayOfWeek: dow)
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: Keys.self)
        switch self {
        case .workout(let workoutId, let dayOfWeek):
            try c.encode(Kind.workout, forKey: .kind)
            try c.encode(workoutId, forKey: .workoutId)
            try c.encodeIfPresent(dayOfWeek, forKey: .dayOfWeek)
        case .rest(let dayOfWeek):
            try c.encode(Kind.rest, forKey: .kind)
            try c.encodeIfPresent(dayOfWeek, forKey: .dayOfWeek)
        }
    }
}

struct PlanWeek: Codable, Hashable {
    var slots: [PlanSlot]
}

/// The shape of a plan's structured content — the discriminated union you extend
/// when adding a new *plan type*. Mirrors the web `PlanContent`; JSON shape is
/// `{ "type": "<discriminator>", ...fields }`, matching Supabase `data`.
///
/// ── Adding a new plan shape (e.g. `periodized`) ──
/// 1. Add a `case periodized(...)`.
/// 2. Add its discriminator to `Kind`.
/// 3. The compiler flags every switch that must handle it. No migration needed.
///
/// Note: the curated 12-week program is identified by `.curated` here — NOT by a
/// magic id — matching the backend's `data->content->>'type' = 'curated'`.
enum PlanContent: Codable, Hashable {
    case curated
    case sequenced(weeks: [PlanWeek])
    case pool(slots: [PlanSlot])

    private enum Kind: String, Codable { case curated, sequenced, pool }
    private enum Keys: String, CodingKey { case type, weeks, slots }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        switch try c.decode(Kind.self, forKey: .type) {
        case .curated:   self = .curated
        case .sequenced: self = .sequenced(weeks: try c.decode([PlanWeek].self, forKey: .weeks))
        case .pool:      self = .pool(slots: try c.decode([PlanSlot].self, forKey: .slots))
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: Keys.self)
        switch self {
        case .curated:
            try c.encode(Kind.curated, forKey: .type)
        case .sequenced(let weeks):
            try c.encode(Kind.sequenced, forKey: .type)
            try c.encode(weeks, forKey: .weeks)
        case .pool(let slots):
            try c.encode(Kind.pool, forKey: .type)
            try c.encode(slots, forKey: .slots)
        }
    }
}

/// A plan is "a thing you commit to": optional structured content and/or a
/// weekly cadence goal, plus active/progress state.
struct UserPlan: Codable, Hashable, Identifiable {
    var id: String
    var name: String
    var color: String
    var icon: String?
    var content: PlanContent?
    var goalPerWeek: Int?
    var durationWeeks: Int?
    var startDate: String?
    var active: Bool
    var createdAt: Double
    var archived: Bool?

    /// Cadence = a weekly target that isn't the curated program. Mirrors
    /// isCadence() in src/plans.ts.
    var isCadence: Bool {
        if case .curated = content { return false }
        return goalPerWeek != nil
    }
}
