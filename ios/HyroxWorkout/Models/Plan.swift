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

struct Exercise: Codable, Hashable, Identifiable {
    var id = UUID()
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

    enum CodingKeys: String, CodingKey {
        case name, qty, unit, perRound, ladder, qtyMin, qtyMax, weight, modifier, note
    }
}

struct MultiWindow: Codable, Hashable {
    var label: String
    var durationSec: Int
    var exerciseRefs: [Int]?
}

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

struct Plan {
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
