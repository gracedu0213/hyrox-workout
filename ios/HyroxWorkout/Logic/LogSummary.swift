import Foundation

// Ported 1:1 from src/logSummary.ts (+ the FELT_EMOJI map from FeltPicker.tsx).

extension FeltLike {
    var emoji: String {
        switch self {
        case .tough: return "🥵"
        case .ok:    return "🫡"
        case .good:  return "🔥"
        }
    }

    var label: String {
        switch self {
        case .tough: return "Cooked"
        case .ok:    return "Locked in"
        case .good:  return "On fire"
        }
    }
}

extension WorkoutLog {
    /// Effective kind — default 'plan' when dayId is present. Mirrors logKind().
    var resolvedKind: LogKind {
        if let kind { return kind }
        if dayId != nil { return .plan }
        if customName != nil { return .custom }
        return .rest
    }

    /// A log "has results" when any result field is filled in. Mirrors hasResults().
    var hasResults: Bool {
        if resolvedKind == .rest { return true } // rest day is "done" by itself
        return totalTimeSec != nil
            || !(roundSplits ?? []).isEmpty
            || amrap != nil
            || !(intervals?.splits ?? []).isEmpty
            || !(exercises ?? []).isEmpty
            || !(notes ?? "").isEmpty
            || feltLike != nil
    }

    /// One-line result summary ("18:42 · 🔥"). Mirrors logSummary().
    var summary: String {
        if resolvedKind == .rest { return "Rest day" }
        if status == .planned && !hasResults { return "Planned — no results yet" }
        var parts: [String] = []
        if let t = totalTimeSec { parts.append(formatSec(t)) }
        if let amrap {
            if amrap.fullRounds != nil || amrap.partialReps != nil {
                parts.append("\(amrap.fullRounds ?? 0)+\(amrap.partialReps ?? 0)")
            }
            if let cal = amrap.totalCalories { parts.append("\(cal) cal") }
            if let windows = amrap.perWindow, !windows.isEmpty {
                let w = windows
                    .compactMap { win -> String? in
                        if win.fullRounds == nil && win.partialReps == nil { return nil }
                        return "\(win.fullRounds ?? 0)+\(win.partialReps ?? 0)"
                    }
                    .joined(separator: " / ")
                if !w.isEmpty { parts.append("(\(w))") }
            }
        }
        if let splits = intervals?.splits, !splits.isEmpty {
            parts.append("\(splits.count) intervals logged")
        }
        if let feltLike { parts.append(feltLike.emoji) }
        return parts.joined(separator: " · ")
    }
}

/// Group logs by training date (ISO) — the shape every calendar view needs.
func groupLogsByDate(_ logs: [WorkoutLog]) -> [String: [WorkoutLog]] {
    var m: [String: [WorkoutLog]] = [:]
    for l in logs { m[l.date, default: []].append(l) }
    return m
}
