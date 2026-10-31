import Foundation

// Shared date helpers. Local-time based (the app reasons in the user's own
// calendar days), Monday-first weeks throughout. Mirrors src/dateUtils.ts.

enum DateUtils {
    /// "yyyy-MM-dd" in local time.
    static func isoDate(_ d: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    static func todayISO() -> String { isoDate(Date()) }

    /// Parse "yyyy-MM-dd" as local midnight (the web appends T00:00:00).
    static func parseISO(_ iso: String) -> Date {
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return Date(timeIntervalSince1970: 0) }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))!
    }

    /// Monday of the week containing d (local midnight).
    static func mondayOfWeek(_ d: Date) -> Date {
        let cal = Calendar.current
        let midnight = cal.startOfDay(for: d)
        let weekday = cal.component(.weekday, from: midnight) // 1=Sun … 7=Sat
        let daysSinceMonday = (weekday + 5) % 7               // Mon=0 … Sun=6
        return cal.date(byAdding: .day, value: -daysSinceMonday, to: midnight)!
    }

    static func addDays(_ d: Date, _ days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: d)!
    }
}
