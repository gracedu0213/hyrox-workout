import Foundation

// Custom (user-authored) workout model. Mirrors the web `CustomWorkout` family
// in src/types.ts, and — crucially — its Codable JSON matches the shape stored
// in Supabase `custom_workouts.data`, so both clients round-trip the same bytes.

enum Intensity: String, Codable, Hashable, CaseIterable {
    case easy, moderate, hard
}

enum WeightUnit: String, Codable, Hashable {
    case kg, lb
}

/// A single personal weight (simpler than the curated gendered matrix).
struct SingleWeight: Codable, Hashable {
    var value: Double
    var unit: WeightUnit
}

/// One exercise row inside a block. `TargetUnit` is shared with Plan.swift.
struct ExSpec: Codable, Hashable {
    var name: String
    var qty: Double?
    var unit: TargetUnit?
    var weight: SingleWeight?
    var note: String?
}

/// A block's rows are an ordered list of work (`ExSpec`) and timed `rest`.
/// Mirrors the web `BlockRow`, discriminated by `kind`: a row with `kind:"rest"`
/// is a rest; anything else is an exercise (the web omits `kind` on exercises).
///
/// ── Adding a new row kind ──
/// Add a case, then update the two switches below (decode/encode). The compiler
/// enumerates every switch that must change — nothing is silently missed.
enum BlockRow: Codable, Hashable {
    case exercise(ExSpec)
    case rest(restSec: Int)

    private enum Keys: String, CodingKey { case kind, restSec }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        if try c.decodeIfPresent(String.self, forKey: .kind) == "rest" {
            self = .rest(restSec: try c.decode(Int.self, forKey: .restSec))
        } else {
            self = .exercise(try ExSpec(from: decoder)) // flat: ExSpec keys sit at row level
        }
    }

    func encode(to encoder: Encoder) throws {
        switch self {
        case .exercise(let spec):
            try spec.encode(to: encoder)
        case .rest(let restSec):
            var c = encoder.container(keyedBy: Keys.self)
            try c.encode("rest", forKey: .kind)
            try c.encode(restSec, forKey: .restSec)
        }
    }
}

/// A repeated group of rows (one "round set"). `repeat` is a Swift keyword, so
/// the property is `repeatCount` mapped to the JSON key `repeat`.
struct Block: Codable, Hashable {
    var label: String?
    var repeatCount: Int
    var rows: [BlockRow]

    enum CodingKeys: String, CodingKey {
        case label
        case repeatCount = "repeat"
        case rows
    }
}

/// A custom workout's timing format — the discriminated union you extend when
/// adding a new *workout type*. Mirrors the web `WorkoutFormat`; JSON shape is
/// `{ "type": "<discriminator>", ...fields }`, matching Supabase `data`.
///
/// ── Adding a new format (e.g. `tabata`) ──
/// 1. Add a `case tabata(...)`.
/// 2. Add its discriminator to `Kind`.
/// 3. The compiler flags every exhaustive switch that must handle it (decode,
///    encode, `summary`). No migration is needed — the DB stores `data` as-is.
enum WorkoutFormat: Codable, Hashable {
    case rounds
    case forTime
    case amrap(durationSec: Int)
    case emom(everySec: Int, totalRounds: Int)
    case intervals(rounds: Int, workSec: Int?, restSec: Int?)

    private enum Kind: String, Codable {
        case rounds, forTime = "for_time", amrap, emom, intervals
    }
    private enum Keys: String, CodingKey {
        case type, durationSec, everySec, totalRounds, rounds, workSec, restSec
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        switch try c.decode(Kind.self, forKey: .type) {
        case .rounds:  self = .rounds
        case .forTime: self = .forTime
        case .amrap:   self = .amrap(durationSec: try c.decode(Int.self, forKey: .durationSec))
        case .emom:    self = .emom(everySec: try c.decode(Int.self, forKey: .everySec),
                                    totalRounds: try c.decode(Int.self, forKey: .totalRounds))
        case .intervals:
            self = .intervals(rounds: try c.decode(Int.self, forKey: .rounds),
                              workSec: try c.decodeIfPresent(Int.self, forKey: .workSec),
                              restSec: try c.decodeIfPresent(Int.self, forKey: .restSec))
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: Keys.self)
        switch self {
        case .rounds:  try c.encode(Kind.rounds, forKey: .type)
        case .forTime: try c.encode(Kind.forTime, forKey: .type)
        case .amrap(let durationSec):
            try c.encode(Kind.amrap, forKey: .type)
            try c.encode(durationSec, forKey: .durationSec)
        case .emom(let everySec, let totalRounds):
            try c.encode(Kind.emom, forKey: .type)
            try c.encode(everySec, forKey: .everySec)
            try c.encode(totalRounds, forKey: .totalRounds)
        case .intervals(let rounds, let workSec, let restSec):
            try c.encode(Kind.intervals, forKey: .type)
            try c.encode(rounds, forKey: .rounds)
            try c.encodeIfPresent(workSec, forKey: .workSec)
            try c.encodeIfPresent(restSec, forKey: .restSec)
        }
    }

    /// Short human label (mirrors setupSummary in src/format.ts). Kept on the
    /// type so adding a format forces you to give it a summary too.
    var summary: String {
        switch self {
        case .rounds:  return "For quality"
        case .forTime: return "For time"
        case .amrap(let d): return "\(d / 60) min AMRAP"
        case .emom(let every, let total): return "EMOM \(every)s × \(total)"
        case .intervals(let rounds, _, _): return "\(rounds) intervals"
        }
    }
}

/// The full custom workout. Envelope/`data` split for Supabase happens in the
/// repository layer; this is the in-app domain object.
struct CustomWorkout: Codable, Hashable, Identifiable {
    var id: String
    var name: String
    var format: WorkoutFormat
    var blocks: [Block]
    var typeId: String?
    var intensity: Intensity?
    var notes: [String]
    var createdAt: Double      // epoch ms, matches the web `createdAt: number`
    var archived: Bool?
}
