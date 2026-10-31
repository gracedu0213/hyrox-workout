import Foundation

// Helpers around the UserPlan entity, including the synthetic descriptor for
// the curated 12-week program. Ported from src/plans.ts, with one deliberate
// difference: curated is identified by CONTENT (`content.type == curated`),
// not a magic id — matching the backend contract. The sentinel id below exists
// only for the in-memory, un-started descriptor; a committed curated plan is an
// ordinary row with a fresh uuid.

let CURATED_WEEKS = 12
let CURATED_DESCRIPTOR_ID = "curated-12-week"

extension UserPlan {
    var isCurated: Bool {
        if case .curated = content { return true }
        return false
    }

    /// Number of weeks of structured content (0 for goal-only/cadence plans).
    var weekCount: Int {
        switch content {
        case .curated: return CURATED_WEEKS
        case .sequenced(let weeks): return weeks.count
        case .pool, nil: return 0
        }
    }

    /// The go-to workouts attached to a cadence plan (empty if none).
    var poolSlots: [PlanSlot] {
        if case .pool(let slots) = content { return slots }
        return []
    }

    /// Short human label for a plan's shape, e.g. "12 weeks", "5×/week · 8 weeks".
    var subtitle: String {
        if isCadence {
            let span = durationWeeks.map { "\($0) week\($0 == 1 ? "" : "s")" } ?? "ongoing"
            return "\(goalPerWeek!)×/week · \(span)"
        }
        let weeks = weekCount
        return weeks > 0 ? "\(weeks) week\(weeks == 1 ? "" : "s")" : "Plan"
    }
}

/// Synthetic, un-started descriptor for the curated 12-week program. A real
/// row (fresh uuid, active, createdAt) replaces this once the user taps Start.
func curatedDescriptor() -> UserPlan {
    UserPlan(
        id: CURATED_DESCRIPTOR_ID,
        name: "12-Week HYROX Program",
        color: "#FF6B6B",
        icon: "🏋️",
        content: .curated,
        goalPerWeek: nil,
        durationWeeks: nil,
        startDate: nil,
        active: false,
        createdAt: 0,
        archived: nil
    )
}

/// Merge the synthetic curated descriptor with stored rows, deduping by
/// content so the curated plan shows in the library whether or not committed.
func withCurated(_ stored: [UserPlan]) -> [UserPlan] {
    if stored.contains(where: \.isCurated) { return stored }
    return [curatedDescriptor()] + stored
}

// --- PlanSlot / PlanWeek helpers ---

extension PlanSlot {
    var dayOfWeek: DayOfWeek? {
        switch self {
        case .workout(_, let dow): return dow
        case .rest(let dow): return dow
        }
    }

    var workoutId: String? {
        if case .workout(let id, _) = self { return id }
        return nil
    }

    var isRest: Bool {
        if case .rest = self { return true }
        return false
    }

    func pinned(to dow: DayOfWeek?) -> PlanSlot {
        switch self {
        case .workout(let id, _): return .workout(workoutId: id, dayOfWeek: dow)
        case .rest: return .rest(dayOfWeek: dow)
        }
    }
}

extension PlanWeek {
    func slot(for dow: DayOfWeek) -> PlanSlot? {
        slots.first { $0.dayOfWeek == dow }
    }

    /// Slots not pinned to a weekday ("any day this week").
    var anytimeSlots: [PlanSlot] {
        slots.filter { $0.dayOfWeek == nil }
    }

    var hasDayedSlots: Bool {
        slots.contains { $0.dayOfWeek != nil }
    }

    /// Replace (or clear) the slot pinned to a given weekday, immutably.
    func withDaySlot(_ dow: DayOfWeek, _ slot: PlanSlot?) -> PlanWeek {
        var out = slots.filter { $0.dayOfWeek != dow }
        if let slot { out.append(slot.pinned(to: dow)) }
        return PlanWeek(slots: out)
    }
}

// Curated plan days (mon–fri). User-built plans use the full week.
let DAYS_OF_WEEK: [DayOfWeek] = [.mon, .tue, .wed, .thu, .fri]
let WEEKDAYS_7: [DayOfWeek] = DayOfWeek.allCases
