import SwiftUI

// Compact HabitKit/GitHub-style activity grid: columns are Mon-first weeks
// (oldest → newest), rows are Mon…Sun. Logged tiles fill with the session's
// workout-type color; a day mixing 2+ types splits the tile into equal
// segments. Tap a tile to browse that day's sessions. Mirrors the web
// ConsistencyHeatmap 1:1.

struct ConsistencyHeatmap: View {
    static let weeks = 10

    let logs: [WorkoutLog]
    let typeOf: (WorkoutLog) -> LogTypeInfo?
    var selected: String?
    var onSelect: ((String) -> Void)?

    private var byDate: [String: [WorkoutLog]] { groupLogsByDate(logs) }

    private var columns: [[String]] {
        let start = DateUtils.addDays(DateUtils.mondayOfWeek(Date()), -(Self.weeks - 1) * 7)
        return (0..<Self.weeks).map { w in
            (0..<7).map { d in DateUtils.isoDate(DateUtils.addDays(start, w * 7 + d)) }
        }
    }

    var body: some View {
        let byDate = byDate
        let today = DateUtils.todayISO()
        HStack(spacing: 4) {
            ForEach(columns, id: \.self) { col in
                VStack(spacing: 4) {
                    ForEach(col, id: \.self) { ds in
                        tile(ds, dayLogs: byDate[ds] ?? [], today: today)
                    }
                }
            }
        }
    }

    private func tile(_ ds: String, dayLogs: [WorkoutLog], today: String) -> some View {
        let future = ds > today
        return Button {
            onSelect?(ds)
        } label: {
            tileFill(dayLogs, future: future)
                .aspectRatio(1, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: 3))
                .overlay {
                    if selected == ds {
                        RoundedRectangle(cornerRadius: 3).strokeBorder(.white, lineWidth: 2)
                    } else if ds == today {
                        RoundedRectangle(cornerRadius: 3).strokeBorder(HX.accent, lineWidth: 1)
                    }
                }
        }
        .buttonStyle(.plain)
        .disabled(future || onSelect == nil)
    }

    @ViewBuilder
    private func tileFill(_ dayLogs: [WorkoutLog], future: Bool) -> some View {
        if future {
            Color.white.opacity(0.02)
        } else {
            switch dayVariant(dayLogs) {
            case .logged:
                let colors = loggedTypeColors(dayLogs, typeOf)
                if colors.count <= 1 {
                    colors.first ?? Color(hex: OTHER_TYPE.color)
                } else {
                    HStack(spacing: 0) {
                        ForEach(Array(colors.enumerated()), id: \.offset) { _, c in c }
                    }
                }
            case .rest:
                Color.white.opacity(0.13)
            case .planned:
                Color.clear
                    .overlay(
                        RoundedRectangle(cornerRadius: 3)
                            .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [3, 2]))
                            .foregroundStyle(.white.opacity(0.22))
                    )
            case .empty:
                Color.white.opacity(0.05)
            }
        }
    }
}
