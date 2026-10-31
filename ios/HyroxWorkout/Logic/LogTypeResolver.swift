import Foundation

// Calendar views color a day by what KIND of training happened. Resolution
// order (mirrors src/logTypeColor.ts): the log's own typeId → curated-plan day
// category → workoutId → workout.typeId. Unresolvable logged sessions render
// as "Other".

struct LogTypeInfo: Hashable {
    var name: String
    var color: String
}

let OTHER_TYPE = LogTypeInfo(name: "Other", color: "#FF6B6B")

struct LogTypeResolver {
    private let byType: [String: LogTypeInfo]
    private let byWorkout: [String: LogTypeInfo]

    /// Build from ALL workouts (including archived) so old logs still resolve.
    init(types: [WorkoutType], workouts: [CustomWorkout]) {
        var byType: [String: LogTypeInfo] = [:]
        for t in types { byType[t.id] = LogTypeInfo(name: t.name, color: t.color) }
        var byWorkout: [String: LogTypeInfo] = [:]
        for w in workouts {
            if let typeId = w.typeId, let t = byType[typeId] { byWorkout[w.id] = t }
        }
        self.byType = byType
        self.byWorkout = byWorkout
    }

    func resolve(_ log: WorkoutLog) -> LogTypeInfo? {
        if let typeId = log.typeId, let t = byType[typeId] { return t }
        if let dayId = log.dayId, let d = PLAN.day(id: dayId) {
            return LogTypeInfo(name: d.category.rawValue.lowercased(), color: d.category.hex)
        }
        if let workoutId = log.workoutId { return byWorkout[workoutId] }
        return nil
    }
}
