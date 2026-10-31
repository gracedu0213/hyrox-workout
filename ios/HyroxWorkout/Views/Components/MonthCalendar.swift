import SwiftUI

// Strava-style month view: one dot per logged session, colored by workout
// type; dashed dot = planned, dim dot = rest. Page months with ‹ › (never
// into the future). Mirrors the web MonthCalendar 1:1.

struct MonthCalendar: View {
    static let maxDots = 3
    private static let dow = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

    let logs: [WorkoutLog]
    let typeOf: (WorkoutLog) -> LogTypeInfo?
    var selected: String?
    var onSelect: ((String) -> Void)?

    @State private var offset = 0  // months back from the current one

    private var firstOfMonth: Date {
        let cal = Calendar.current
        let now = Date()
        var comps = cal.dateComponents([.year, .month], from: now)
        comps.month! -= offset
        return cal.date(from: comps)!
    }

    private var monthLabel: String {
        let f = DateFormatter()
        f.dateFormat = "LLLL yyyy"
        return f.string(from: firstOfMonth)
    }

    /// Mon-first week rows covering the month; outside days render blank.
    private var weeks: [[Date]] {
        let cal = Calendar.current
        let first = firstOfMonth
        let month = cal.component(.month, from: first)
        var cursor = DateUtils.mondayOfWeek(first)
        var rows: [[Date]] = []
        repeat {
            var row: [Date] = []
            for _ in 0..<7 {
                row.append(cursor)
                cursor = DateUtils.addDays(cursor, 1)
            }
            rows.append(row)
        } while cal.component(.month, from: cursor) == month
        return rows
    }

    var body: some View {
        let byDate = groupLogsByDate(logs)
        let today = DateUtils.todayISO()
        let month = Calendar.current.component(.month, from: firstOfMonth)

        VStack(spacing: 8) {
            HStack {
                Button("‹") { offset += 1 }
                    .foregroundStyle(HX.muted)
                    .padding(.horizontal, 12)
                Spacer()
                Text(monthLabel.uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(2)
                    .foregroundStyle(HX.muted)
                Spacer()
                Button("›") { offset = max(0, offset - 1) }
                    .foregroundStyle(HX.muted)
                    .padding(.horizontal, 12)
                    .disabled(offset == 0)
                    .opacity(offset == 0 ? 0.3 : 1)
            }
            .buttonStyle(.plain)

            let cols = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)
            LazyVGrid(columns: cols, spacing: 4) {
                ForEach(Self.dow, id: \.self) { d in
                    Text(d.uppercased())
                        .font(.system(size: 9, weight: .medium))
                        .tracking(1)
                        .foregroundStyle(HX.muted.opacity(0.7))
                }
                ForEach(Array(weeks.joined().enumerated()), id: \.offset) { _, date in
                    if Calendar.current.component(.month, from: date) != month {
                        Color.clear.frame(height: 44)
                    } else {
                        dayCell(date, byDate: byDate, today: today)
                    }
                }
            }
        }
    }

    private func dayCell(_ date: Date, byDate: [String: [WorkoutLog]], today: String) -> some View {
        let ds = DateUtils.isoDate(date)
        let dayLogs = byDate[ds] ?? []
        let future = ds > today
        let sessions = dayLogs.filter { $0.hasResults && $0.resolvedKind != .rest }
        let planned = sessions.isEmpty && dayLogs.contains { !$0.hasResults && $0.resolvedKind != .rest }
        let rest = sessions.isEmpty && dayLogs.contains { $0.resolvedKind == .rest }
        let isSel = selected == ds

        return Button {
            onSelect?(ds)
        } label: {
            VStack(spacing: 4) {
                Text("\(Calendar.current.component(.day, from: date))")
                    .font(.system(size: 11).monospacedDigit())
                    .foregroundStyle(future ? HX.muted.opacity(0.4) : .white.opacity(0.8))
                HStack(spacing: 2) {
                    ForEach(Array(sessions.prefix(Self.maxDots).enumerated()), id: \.offset) { _, l in
                        Circle()
                            .fill(Color(hex: (typeOf(l) ?? OTHER_TYPE).color))
                            .frame(width: 6, height: 6)
                    }
                    if sessions.count > Self.maxDots {
                        Text("+").font(.system(size: 8)).foregroundStyle(HX.muted)
                    }
                    if planned {
                        Circle()
                            .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [2, 1.5]))
                            .foregroundStyle(.white.opacity(0.4))
                            .frame(width: 6, height: 6)
                    }
                    if rest {
                        Circle().fill(.white.opacity(0.2)).frame(width: 6, height: 6)
                    }
                }
                .frame(height: 6)
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(isSel ? HX.panel2 : .clear)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay {
                if isSel {
                    RoundedRectangle(cornerRadius: 6).strokeBorder(.white, lineWidth: 2)
                } else if ds == today {
                    RoundedRectangle(cornerRadius: 6).strokeBorder(HX.accent, lineWidth: 1)
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(future || onSelect == nil)
    }
}
