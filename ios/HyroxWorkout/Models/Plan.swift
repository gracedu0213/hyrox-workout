import Foundation

// Static plan schema. Mirrors src/types.ts on the web side.
// Value types only — the actual plan data lives in Data/PlanData.swift.

enum Phase: String, Codable, CaseIterable {
    case base = "BASE"
    case pace = "PACE"
    case accelerate = "ACCELERATE"
    case prime = "PRIME"
    case race = "RACE"
}

enum Category: String, Codable, CaseIterable {
    case foundation = "FOUNDATION"
    case aerobic = "AEROBIC"
    case engine = "ENGINE"
    case power = "POWER"
    case complete = "COMPLETE"
}

enum DayOfWeek: String, Codable, CaseIterable {
    // Curated plan uses mon–fri; user-built plans use the full week.
    case mon, tue, wed, thu, fri, sat, sun

    var label: String { rawValue.uppercased() }
}

enum TargetUnit: String, Codable {
    case reps, meters, feet, calories, seconds, minutes, miles, failure, max
}

struct Weight: Codable, Hashable {
    var lbsM: Double?
    var kgM: Double?
    var lbsF: Double?
    var kgF: Double?
    var count: Int?
    var note: String?
}

struct Ladder: Codable, Hashable {
    var start: Int
    var step: Int
    var openEnded: Bool?
}

struct Exercise: Codable, Hashable {
    var name: String
    var qty: Double?
    var unit: TargetUnit?
    var perRound: [Int]?
    var ladder: Ladder?
    var qtyMin: Double?
    var qtyMax: Double?
    var weight: Weight?
    var modifier: String?
    var note: String?
}

struct MultiWindow: Codable, Hashable {
    var label: String
    var durationSec: Int
    var exerciseRefs: [Int]?
}

/// Curated-plan workout setup. Mirrors the web `WorkoutSetup` union; JSON shape
/// is `{ "type": "<discriminator>", ...fields }` so the bundled plan JSON (and
/// log `workoutSnapshot.setup`) round-trips byte-compatibly with the web.
enum WorkoutSetup: Codable, Hashable {
    case forTime
    case rft(rounds: Int)
    case descendingRounds(rounds: Int, roundDetails: [String]?)
    case amrap(durationSec: Int)
    case multiWindowAmrap(windows: [MultiWindow])
    case emom(everySec: Int, totalRounds: Int)
    case intervals(rounds: Int, workSec: Int?, restSec: Int?, workDescription: String?)
    case forQuality
    case ladder(sequence: [Int], ascending: Bool, openEnded: Bool?)
    case rounds(rounds: Int)

    private enum Kind: String, Codable {
        case forTime = "for_time"
        case rft
        case descendingRounds = "descending_rounds"
        case amrap
        case multiWindowAmrap = "multi_window_amrap"
        case emom
        case intervals
        case forQuality = "for_quality"
        case ladder
        case rounds
    }
    private enum Keys: String, CodingKey {
        case type, rounds, roundDetails, durationSec, windows, everySec, totalRounds
        case workSec, restSec, workDescription, sequence, ascending, openEnded
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        switch try c.decode(Kind.self, forKey: .type) {
        case .forTime:   self = .forTime
        case .rft:       self = .rft(rounds: try c.decode(Int.self, forKey: .rounds))
        case .descendingRounds:
            self = .descendingRounds(rounds: try c.decode(Int.self, forKey: .rounds),
                                     roundDetails: try c.decodeIfPresent([String].self, forKey: .roundDetails))
        case .amrap:     self = .amrap(durationSec: try c.decode(Int.self, forKey: .durationSec))
        case .multiWindowAmrap:
            self = .multiWindowAmrap(windows: try c.decode([MultiWindow].self, forKey: .windows))
        case .emom:
            self = .emom(everySec: try c.decode(Int.self, forKey: .everySec),
                         totalRounds: try c.decode(Int.self, forKey: .totalRounds))
        case .intervals:
            self = .intervals(rounds: try c.decode(Int.self, forKey: .rounds),
                              workSec: try c.decodeIfPresent(Int.self, forKey: .workSec),
                              restSec: try c.decodeIfPresent(Int.self, forKey: .restSec),
                              workDescription: try c.decodeIfPresent(String.self, forKey: .workDescription))
        case .forQuality: self = .forQuality
        case .ladder:
            self = .ladder(sequence: try c.decode([Int].self, forKey: .sequence),
                           ascending: try c.decode(Bool.self, forKey: .ascending),
                           openEnded: try c.decodeIfPresent(Bool.self, forKey: .openEnded))
        case .rounds:    self = .rounds(rounds: try c.decode(Int.self, forKey: .rounds))
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: Keys.self)
        switch self {
        case .forTime:
            try c.encode(Kind.forTime, forKey: .type)
        case .rft(let rounds):
            try c.encode(Kind.rft, forKey: .type)
            try c.encode(rounds, forKey: .rounds)
        case .descendingRounds(let rounds, let roundDetails):
            try c.encode(Kind.descendingRounds, forKey: .type)
            try c.encode(rounds, forKey: .rounds)
            try c.encodeIfPresent(roundDetails, forKey: .roundDetails)
        case .amrap(let durationSec):
            try c.encode(Kind.amrap, forKey: .type)
            try c.encode(durationSec, forKey: .durationSec)
        case .multiWindowAmrap(let windows):
            try c.encode(Kind.multiWindowAmrap, forKey: .type)
            try c.encode(windows, forKey: .windows)
        case .emom(let everySec, let totalRounds):
            try c.encode(Kind.emom, forKey: .type)
            try c.encode(everySec, forKey: .everySec)
            try c.encode(totalRounds, forKey: .totalRounds)
        case .intervals(let rounds, let workSec, let restSec, let workDescription):
            try c.encode(Kind.intervals, forKey: .type)
            try c.encode(rounds, forKey: .rounds)
            try c.encodeIfPresent(workSec, forKey: .workSec)
            try c.encodeIfPresent(restSec, forKey: .restSec)
            try c.encodeIfPresent(workDescription, forKey: .workDescription)
        case .forQuality:
            try c.encode(Kind.forQuality, forKey: .type)
        case .ladder(let sequence, let ascending, let openEnded):
            try c.encode(Kind.ladder, forKey: .type)
            try c.encode(sequence, forKey: .sequence)
            try c.encode(ascending, forKey: .ascending)
            try c.encodeIfPresent(openEnded, forKey: .openEnded)
        case .rounds(let rounds):
            try c.encode(Kind.rounds, forKey: .type)
            try c.encode(rounds, forKey: .rounds)
        }
    }
}

struct Day: Codable, Hashable, Identifiable {
    var id: String                  // "w01-mon"
    var week: Int
    var phase: Phase
    var dayOfWeek: DayOfWeek
    var category: Category
    var setup: WorkoutSetup
    var workoutLabel: String
    var exercises: [Exercise]
    var notes: [String]
}

struct Plan: Codable {
    var days: [Day]

    func day(id: String) -> Day? {
        days.first { $0.id == id }
    }
}

func phaseOf(week: Int) -> Phase {
    switch week {
    case ...4: return .base
    case ...8: return .pace
    case ...10: return .accelerate
    case 11: return .prime
    default: return .race
    }
}
