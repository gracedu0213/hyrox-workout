import Foundation

// Per-workout performance progression: one comparable numeric metric per logged
// session, grouped by workout, so Progress can chart "am I getting better".
// Ported 1:1 from src/progress.ts.

enum MetricUnit: String {
    case time, rounds, cal
}

struct MetricPoint: Hashable {
    var date: String   // ISO yyyy-MM-dd
    var value: Double
    var logId: String
}

struct WorkoutProgress: Identifiable {
    var key: String
    var name: String
    var unit: MetricUnit
    var lowerBetter: Bool
    var points: [MetricPoint]  // chronological

    var id: String { key }
}

private func extractMetric(_ l: WorkoutLog) -> (value: Double, unit: MetricUnit, lowerBetter: Bool)? {
    if let t = l.totalTimeSec { return (Double(t), .time, true) }
    if let amrap = l.amrap {
        if amrap.fullRounds != nil || amrap.partialReps != nil {
            return (Double(amrap.fullRounds ?? 0), .rounds, false)
        }
        if let cal = amrap.totalCalories {
            return (Double(cal), .cal, false)
        }
    }
    return nil
}

private func identity(_ l: WorkoutLog) -> (key: String, name: String)? {
    switch l.resolvedKind {
    case .custom:
        guard let key = l.workoutId ?? l.customName else { return nil }
        return ("c:\(key)", l.customName ?? l.workoutSnapshot?.name ?? "Workout")
    case .plan:
        guard let dayId = l.dayId else { return nil }
        return ("p:\(dayId)", PLAN.day(id: dayId)?.workoutLabel ?? "Workout")
    case .rest:
        return nil
    }
}

/// Build progression series for every workout logged at least `minSessions`
/// times with a consistent, comparable metric. Most recently trained first.
func buildProgress(_ logs: [WorkoutLog], minSessions: Int = 2) -> [WorkoutProgress] {
    var groups: [String: WorkoutProgress] = [:]
    var order: [String] = [] // preserve first-seen order like the JS Map

    for l in logs {
        guard l.hasResults, let metric = extractMetric(l), let id = identity(l) else { continue }
        if groups[id.key] == nil {
            groups[id.key] = WorkoutProgress(
                key: id.key, name: id.name, unit: metric.unit,
                lowerBetter: metric.lowerBetter, points: [])
            order.append(id.key)
        }
        // Only collect points that share the group's metric unit.
        guard metric.unit == groups[id.key]!.unit else { continue }
        groups[id.key]!.points.append(MetricPoint(date: l.date, value: metric.value, logId: l.id))
    }

    var out: [WorkoutProgress] = []
    for key in order {
        var g = groups[key]!
        guard g.points.count >= minSessions else { continue }
        g.points.sort { $0.date < $1.date }
        out.append(g)
    }
    out.sort { $0.points.last!.date > $1.points.last!.date }
    return out
}

/// First → latest change, expressed as improvement (nil improved = flat).
func trend(_ p: WorkoutProgress) -> (delta: Double, improved: Bool?) {
    let first = p.points.first!.value
    let last = p.points.last!.value
    let raw = last - first
    if raw == 0 { return (0, nil) }
    return (raw, p.lowerBetter ? raw < 0 : raw > 0)
}
