import SwiftUI

// Shared day-classification for the two calendar lenses (heatmap + month).
// Priority: a logged session always wins over a rest or planned marker.

enum DayVariant {
    case logged, rest, planned, empty
}

func dayVariant(_ logs: [WorkoutLog]) -> DayVariant {
    if logs.contains(where: { $0.resolvedKind != .rest && $0.hasResults }) { return .logged }
    if logs.contains(where: { $0.resolvedKind == .rest }) { return .rest }
    if logs.contains(where: { $0.resolvedKind != .rest && !$0.hasResults }) { return .planned }
    return .empty
}

/// Distinct workout-type colors among a day's logged sessions, in order.
func loggedTypeColors(_ dayLogs: [WorkoutLog], _ typeOf: (WorkoutLog) -> LogTypeInfo?) -> [Color] {
    var seen = Set<String>()
    var out: [Color] = []
    for l in dayLogs where l.hasResults && l.resolvedKind != .rest {
        let hex = (typeOf(l) ?? OTHER_TYPE).color
        if seen.insert(hex).inserted { out.append(Color(hex: hex)) }
    }
    return out
}
