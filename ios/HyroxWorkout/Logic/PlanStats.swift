import Foundation

// Pure stats for committed plans: weekly cadence progress, streaks. Mon-first
// weeks throughout. Ported 1:1 from src/planStats.ts.

enum PlanStats {
    /// A session counts toward a plan when it's attributed to that plan, has
    /// results, and isn't a rest day.
    static func isQualifying(_ l: WorkoutLog, planId: String) -> Bool {
        l.planId == planId && l.resolvedKind != .rest && l.hasResults
    }

    /// Group a plan's qualifying logs into Mon-first week buckets, keyed by the
    /// ISO date of that week's Monday.
    static func weekBuckets(_ logs: [WorkoutLog], planId: String) -> [String: [WorkoutLog]] {
        var m: [String: [WorkoutLog]] = [:]
        for l in logs where isQualifying(l, planId: planId) {
            let key = DateUtils.isoDate(DateUtils.mondayOfWeek(DateUtils.parseISO(l.date)))
            m[key, default: []].append(l)
        }
        return m
    }

    /// Sessions done this week vs the plan's weekly goal (if any).
    static func weekProgress(_ logs: [WorkoutLog], plan: UserPlan, refDate: Date = Date()) -> (done: Int, goal: Int?) {
        let weekKey = DateUtils.isoDate(DateUtils.mondayOfWeek(refDate))
        let done = weekBuckets(logs, planId: plan.id)[weekKey]?.count ?? 0
        return (done, plan.goalPerWeek)
    }

    /// Consecutive Mon-first weeks containing at least one logged (non-rest)
    /// workout, counting back from now. Plan-agnostic; current week graced.
    static func computeActivityStreak(_ logs: [WorkoutLog], refDate: Date = Date()) -> Int {
        var weeks = Set<String>()
        for l in logs where l.resolvedKind != .rest && l.hasResults {
            weeks.insert(DateUtils.isoDate(DateUtils.mondayOfWeek(DateUtils.parseISO(l.date))))
        }
        var cursor = DateUtils.mondayOfWeek(refDate)
        var streak = 0
        if weeks.contains(DateUtils.isoDate(cursor)) { streak += 1 }
        cursor = DateUtils.addDays(cursor, -7)
        while weeks.contains(DateUtils.isoDate(cursor)) {
            streak += 1
            cursor = DateUtils.addDays(cursor, -7)
        }
        return streak
    }

    /// Consecutive weeks meeting the cadence target, counting back from now.
    /// The current (in-progress) week is graced: it adds when already met, but
    /// an unmet current week never breaks the streak.
    static func computeStreak(_ logs: [WorkoutLog], plan: UserPlan, refDate: Date = Date()) -> Int {
        let target = (plan.goalPerWeek ?? 0) > 0 ? plan.goalPerWeek! : 1
        let buckets = weekBuckets(logs, planId: plan.id)
        func qualifies(_ weekStart: Date) -> Bool {
            (buckets[DateUtils.isoDate(weekStart)]?.count ?? 0) >= target
        }

        var cursor = DateUtils.mondayOfWeek(refDate)
        var streak = 0
        if qualifies(cursor) { streak += 1 }
        cursor = DateUtils.addDays(cursor, -7)
        while qualifies(cursor) {
            streak += 1
            cursor = DateUtils.addDays(cursor, -7)
        }
        return streak
    }
}
