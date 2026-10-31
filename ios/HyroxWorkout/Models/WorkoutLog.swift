import Foundation

// Logged/planned sessions. Mirrors the web `WorkoutLog` family in src/types.ts;
// Codable JSON matches what Supabase `workout_logs.data` stores, so both
// clients round-trip the same bytes.

enum LogKind: String, Codable, Hashable {
    case plan, custom, rest
}

enum FeltLike: String, Codable, Hashable, CaseIterable {
    case tough, ok, good
}

enum LogStatus: String, Codable, Hashable {
    case planned, logged
}

struct RoundSplit: Codable, Hashable {
    var roundIndex: Int
    var splitSec: Int?
    var notes: String?
}

struct ExerciseLogEntry: Codable, Hashable {
    var exerciseName: String
    var weightUsed: String?
    var repsCompleted: Int?
    var result: String?
}

struct AMRAPWindowResult: Codable, Hashable {
    var label: String
    var fullRounds: Int?
    var partialReps: Int?
    var totalCalories: Int?
    var note: String?
}

struct AMRAPResult: Codable, Hashable {
    var fullRounds: Int?
    var partialReps: Int?
    var totalCalories: Int?
    var perWindow: [AMRAPWindowResult]?
}

struct IntervalSplit: Codable, Hashable {
    var roundIndex: Int
    var valueSec: Int?
    var cal: Int?
    var reps: Int?
    var note: String?
}

struct IntervalResult: Codable, Hashable {
    var splits: [IntervalSplit]
}

/// Self-contained copy of a custom workout stored on the log, so results render
/// and edit independently of the (possibly later-changed or deleted) template.
struct WorkoutSnapshot: Codable, Hashable {
    var name: String
    var setup: WorkoutSetup
    var exercises: [Exercise]
    var blocks: [Block]
    var notes: [String]
}

struct WorkoutLog: Codable, Hashable, Identifiable {
    var id: String
    var dayId: String?              // refs Day.id (curated library workouts)
    var workoutId: String?          // refs CustomWorkout.id
    var customName: String?         // kind=custom quick logs ("Basketball")
    var kind: LogKind?              // default 'plan' when dayId is present
    var typeId: String?             // refs WorkoutType.id (quick custom logs)
    var intensity: Intensity?
    var planId: String?             // attributes the session to a UserPlan
    var workoutSnapshot: WorkoutSnapshot?
    var date: String                // ISO yyyy-MM-dd (training date, local)
    var createdAt: Double           // epoch ms, matches web
    // Structured results (present only when entered):
    var totalTimeSec: Int?
    var roundSplits: [RoundSplit]?
    var amrap: AMRAPResult?
    var intervals: IntervalResult?
    var exercises: [ExerciseLogEntry]?
    // Always available:
    var feltLike: FeltLike?
    var notes: String?
    var modifications: String?
    var status: LogStatus?          // planned (no results yet) | logged

    init(
        id: String = newID(),
        dayId: String? = nil,
        workoutId: String? = nil,
        customName: String? = nil,
        kind: LogKind? = nil,
        typeId: String? = nil,
        intensity: Intensity? = nil,
        planId: String? = nil,
        workoutSnapshot: WorkoutSnapshot? = nil,
        date: String,
        createdAt: Double,
        totalTimeSec: Int? = nil,
        roundSplits: [RoundSplit]? = nil,
        amrap: AMRAPResult? = nil,
        intervals: IntervalResult? = nil,
        exercises: [ExerciseLogEntry]? = nil,
        feltLike: FeltLike? = nil,
        notes: String? = nil,
        modifications: String? = nil,
        status: LogStatus? = nil
    ) {
        self.id = id
        self.dayId = dayId
        self.workoutId = workoutId
        self.customName = customName
        self.kind = kind
        self.typeId = typeId
        self.intensity = intensity
        self.planId = planId
        self.workoutSnapshot = workoutSnapshot
        self.date = date
        self.createdAt = createdAt
        self.totalTimeSec = totalTimeSec
        self.roundSplits = roundSplits
        self.amrap = amrap
        self.intervals = intervals
        self.exercises = exercises
        self.feltLike = feltLike
        self.notes = notes
        self.modifications = modifications
        self.status = status
    }
}
