import SwiftUI

// The Train tab — mirrors web HomePage.tsx 1:1: Today rail (to-dos → cadence
// goals → done), Consistency (streak hero + heatmap/month toggle + legend +
// selected-day browser), Upcoming, Last workout, and the floating +.

struct HomePage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    @State private var selectedDate: String?
    @State private var cadenceSheet: UserPlan?
    @AppStorage("hyrox.calview.v1") private var calView = "grid"

    private var today: String { DateUtils.todayISO() }

    var body: some View {
        let logs = store.allLogs
        let typeOf = store.typeResolver
        let todayLogs = logs.filter { $0.date == today }
        let past = logs.filter { $0.date < today }
        let upcoming = logs
            .filter { $0.date > today && $0.status == .planned && !$0.hasResults }
            .sorted { $0.date < $1.date }
        let streak = PlanStats.computeActivityStreak(logs)
        let hasActivity = logs.contains { $0.resolvedKind != .rest && $0.hasResults }
        let railItems = buildRailItems(logs: logs, todayLogs: todayLogs)

        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // ── Today — one swipeable rail of everything on your plate ──
                VStack(alignment: .leading, spacing: 10) {
                    Text("TODAY · \(today)")
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(2.5)
                        .foregroundStyle(HX.muted)
                    if railItems.isEmpty {
                        EmptyDayHero()
                    } else {
                        TodayRail(items: railItems, onCadenceLog: cadenceLog)
                    }
                }

                // ── Consistency — streak hero + activity calendar ──
                if hasActivity {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(alignment: .lastTextBaseline) {
                            SectionLabel(text: "Consistency")
                            Spacer()
                            calViewToggle
                        }
                        consistencyCard(logs: logs, streak: streak, typeOf: typeOf)
                    }
                }

                // ── Upcoming scheduled ──
                if !upcoming.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        SectionLabel(text: "Upcoming")
                        VStack(spacing: 8) {
                            ForEach(upcoming.prefix(3)) { UpcomingCard(log: $0) }
                        }
                    }
                }

                // ── Last logged ──
                if let last = past.first {
                    VStack(alignment: .leading, spacing: 10) {
                        SectionLabel(text: "Last workout")
                        LastLogCard(log: last)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
            .padding(.bottom, 96)
        }
        .overlay(alignment: .bottomTrailing) { Fab() }
        .sheet(item: $cadenceSheet) { CadenceLogSheet(plan: $0) }
    }

    // Rail order: unfinished sessions → standing cadence goals → done sessions.
    private func buildRailItems(logs: [WorkoutLog], todayLogs: [WorkoutLog]) -> [RailItem] {
        let toDo = todayLogs.filter { !$0.hasResults && $0.resolvedKind != .rest }
        let done = todayLogs.filter { $0.hasResults || $0.resolvedKind == .rest }
        var items: [RailItem] = toDo.map { .log($0) }
        for p in store.activePlans where p.isCadence {
            let planLogs = logs.filter { $0.planId == p.id }
            let (doneCount, _) = PlanStats.weekProgress(planLogs, plan: p)
            let planStreak = PlanStats.computeStreak(planLogs, plan: p)
            let loggedToday = planLogs.contains { $0.date == today && PlanStats.isQualifying($0, planId: p.id) }
            items.append(.cadence(p, done: doneCount, streak: planStreak, loggedToday: loggedToday))
        }
        items.append(contentsOf: done.map { .log($0) })
        return items
    }

    // Single go-to → log that workout directly; otherwise the quick-pick sheet.
    private func cadenceLog(_ p: UserPlan) {
        let pool = p.poolSlots.compactMap(\.workoutId)
        if pool.count == 1 {
            router.push(.logWorkout(workoutId: pool[0], logId: nil, date: nil, planId: p.id))
        } else {
            cadenceSheet = p
        }
    }

    private var calViewToggle: some View {
        HStack(spacing: 0) {
            ForEach(["grid", "month"], id: \.self) { v in
                Button(v.uppercased()) { calView = v }
                    .font(.system(size: 10, weight: .medium))
                    .tracking(1)
                    .foregroundStyle(calView == v ? .white : HX.muted)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 3)
                    .background(calView == v ? HX.panel2 : .clear)
                    .buttonStyle(.plain)
            }
        }
        .clipShape(Capsule())
        .overlay(Capsule().stroke(HX.line))
    }

    private func consistencyCard(logs: [WorkoutLog], streak: Int, typeOf: LogTypeResolver) -> some View {
        // Legend: distinct types among logged sessions (+ Other for unresolved).
        var legendMap: [String: String] = [:]
        var legendOrder: [String] = []
        var hasOther = false
        for l in logs where l.hasResults && l.resolvedKind != .rest {
            if let t = typeOf.resolve(l) {
                if legendMap[t.name] == nil { legendOrder.append(t.name) }
                legendMap[t.name] = t.color
            } else {
                hasOther = true
            }
        }
        var legend = legendOrder.map { LogTypeInfo(name: $0, color: legendMap[$0]!) }
        if hasOther { legend.append(OTHER_TYPE) }

        return VStack(alignment: .leading, spacing: 12) {
            if streak > 0 {
                HStack(alignment: .lastTextBaseline, spacing: 8) {
                    Text("🔥").font(.system(size: 22))
                    Text("\(streak)")
                        .font(.display(36))
                        .tracking(-0.5)
                        .foregroundStyle(HX.accent)
                    Text("WEEK STREAK")
                        .font(.system(size: 11, weight: .medium))
                        .tracking(2)
                        .foregroundStyle(HX.muted)
                }
            }
            if calView == "grid" {
                ConsistencyHeatmap(logs: logs, typeOf: typeOf.resolve, selected: selectedDate) { toggleSelect($0) }
            } else {
                MonthCalendar(logs: logs, typeOf: typeOf.resolve, selected: selectedDate) { toggleSelect($0) }
            }
            if !legend.isEmpty {
                FlowLegend(entries: legend)
            }
            if let selectedDate {
                SelectedDay(date: selectedDate, logs: logs.filter { $0.date == selectedDate })
            } else {
                Text(calView == "grid" ? "Last 10 weeks · tap a day" : "Tap a day")
                    .font(.system(size: 10))
                    .foregroundStyle(HX.muted)
            }
        }
        .panelCard()
    }

    private func toggleSelect(_ d: String) {
        selectedDate = selectedDate == d ? nil : d
    }
}

// MARK: - Rail

enum RailItem: Identifiable {
    case log(WorkoutLog)
    case cadence(UserPlan, done: Int, streak: Int, loggedToday: Bool)

    var id: String {
        switch self {
        case .log(let l): return l.id
        case .cadence(let p, _, _, _): return p.id
        }
    }
}

private struct TodayRail: View {
    let items: [RailItem]
    let onCadenceLog: (UserPlan) -> Void
    @State private var activeId: String?

    var body: some View {
        let multi = items.count > 1
        ScrollView(.horizontal) {
            LazyHStack(spacing: 12) {
                ForEach(items) { item in
                    Group {
                        switch item {
                        case .log(let l):
                            TodoWorkoutCard(log: l)
                        case .cadence(let p, let done, let streak, let loggedToday):
                            CadenceTodoCard(plan: p, done: done, goal: p.goalPerWeek ?? 1,
                                            streak: streak, loggedToday: loggedToday) { onCadenceLog(p) }
                        }
                    }
                    .containerRelativeFrame(.horizontal) { length, _ in
                        multi ? length * 0.86 : length
                    }
                    .frame(minHeight: 190)
                    .id(item.id)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.viewAligned)
        .scrollIndicators(.hidden)
        .scrollPosition(id: $activeId)

        if multi {
            HStack(spacing: 6) {
                ForEach(items) { item in
                    Capsule()
                        .fill(isActive(item) ? HX.accent : HX.line)
                        .frame(width: isActive(item) ? 16 : 6, height: 6)
                        .animation(.easeOut(duration: 0.2), value: activeId)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 10)
        }
    }

    private func isActive(_ item: RailItem) -> Bool {
        (activeId ?? items.first?.id) == item.id
    }
}

// A single workout for today — planned (Log it) or done (gradient result +
// tap to review).
private struct TodoWorkoutCard: View {
    @EnvironmentObject private var router: Router
    let log: WorkoutLog

    var body: some View {
        let kind = log.resolvedKind
        if kind == .rest {
            Button {
                router.push(.logDetail(logId: log.id, celebrate: false))
            } label: {
                VStack(spacing: 4) {
                    Text("🛌").font(.system(size: 34))
                    Text("Rest day").font(.display(22)).tracking(-0.4)
                    Text("Recover up.").font(.system(size: 12)).foregroundStyle(HX.muted)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(20)
                .background(HX.panel)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .buttonStyle(.plain)
        } else {
            card(kind: kind)
        }
    }

    @ViewBuilder
    private func card(kind: LogKind) -> some View {
        let planDay = log.dayId.flatMap { PLAN.day(id: $0) }
        let planned = log.status == .planned && !log.hasResults
        let title = kind == .custom ? (log.customName ?? "Custom") : (planDay?.workoutLabel ?? "")
        let setup: String? = kind == .custom
            ? log.workoutSnapshot.map { setupSummary($0.setup) }
            : planDay.map { setupSummary($0.setup) }

        Button {
            router.push(destination(planned: planned, planDay: planDay))
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    if kind == .custom {
                        Text("CUSTOM")
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(2)
                            .foregroundStyle(HX.accent)
                    } else if let planDay {
                        Text(planDay.category.rawValue)
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(1.5)
                            .foregroundStyle(planDay.category.color)
                        Text("W\(planDay.week) · \(planDay.dayOfWeek.label)")
                            .font(.system(size: 11))
                            .foregroundStyle(HX.muted)
                    }
                    Spacer()
                    if planned {
                        Text("PLANNED")
                            .font(.system(size: 10, weight: .medium))
                            .tracking(1.5)
                            .foregroundStyle(HX.muted)
                    } else {
                        Text("LOGGED ✓")
                            .font(.system(size: 10, weight: .black))
                            .tracking(2)
                            .foregroundStyle(HX.bg)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(HX.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
                Text(title)
                    .font(.display(22))
                    .tracking(-0.4)
                    .lineLimit(2)
                    .padding(.top, 6)
                if let setup {
                    Text(setup)
                        .font(.system(size: 12))
                        .foregroundStyle(HX.muted)
                        .lineLimit(1)
                        .padding(.top, 3)
                }
                if !planned {
                    Text(log.summary.isEmpty ? "Logged" : log.summary)
                        .font(.display(34))
                        .tracking(-0.7)
                        .gradientText()
                        .padding(.top, 12)
                }
                Spacer(minLength: 16)
                if planned {
                    Text("LOG IT →")
                        .font(.system(size: 12, weight: .black))
                        .tracking(2.5)
                        .foregroundStyle(HX.bg)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(HX.gradient)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(color: HX.engine.opacity(0.28), radius: 11, y: 6)
                } else {
                    HStack {
                        Text("Tap to review").font(.system(size: 12)).foregroundStyle(HX.muted)
                        Spacer()
                        Text("→").font(.system(size: 12)).foregroundStyle(HX.accent)
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background {
                ZStack {
                    HX.panel
                    if planned {
                        RadialGradient(colors: [Color(hex: "#FFD500").opacity(0.16), .clear],
                                       center: UnitPoint(x: 0.88, y: -0.2), startRadius: 0, endRadius: 220)
                        RadialGradient(colors: [Color(hex: "#FF6B6B").opacity(0.10), .clear],
                                       center: UnitPoint(x: 0, y: 1.2), startRadius: 0, endRadius: 220)
                    } else {
                        RadialGradient(colors: [Color(hex: "#FFD500").opacity(0.10), .clear],
                                       center: UnitPoint(x: 0.2, y: 0), startRadius: 0, endRadius: 220)
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(alignment: .topTrailing) {
                Sparkle().padding(.top, 10).padding(.trailing, 12)
            }
        }
        .buttonStyle(.plain)
    }

    private func destination(planned: Bool, planDay: Day?) -> Route {
        guard planned else { return .logDetail(logId: log.id, celebrate: false) }
        if log.resolvedKind == .custom, let workoutId = log.workoutId {
            return .logWorkout(workoutId: workoutId, logId: log.id, date: nil, planId: nil)
        }
        if let planDay {
            return .logDay(dayId: planDay.id, logId: log.id, date: nil, planId: nil)
        }
        return .logDetail(logId: log.id, celebrate: false)
    }
}

// Progress pips: one segment per planned session this week, filled + glowing
// up to `done`.
private struct TrackerPips: View {
    let done: Int
    let goal: Int
    let color: Color

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<max(goal, 1), id: \.self) { i in
                Capsule()
                    .fill(i < done ? color : .white.opacity(0.10))
                    .frame(height: 10)
                    .shadow(color: i < done ? color.opacity(0.47) : .clear, radius: 5)
            }
        }
    }
}

// Cadence to-do — plan color carries the energy; the yellow→coral gradient
// stays reserved for results.
private struct CadenceTodoCard: View {
    let plan: UserPlan
    let done: Int
    let goal: Int
    let streak: Int
    let loggedToday: Bool
    let onLog: () -> Void

    private var color: Color { Color(hex: plan.color) }
    private var complete: Bool { done >= goal }

    private var hype: String {
        let remaining = max(goal - done, 0)
        if complete { return "Weekly goal smashed 🎉" }
        if loggedToday { return "Nice — \(remaining) more to go" }
        if done == 0 { return "Let's kick off the week 💥" }
        return "\(remaining) more to hit your goal"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                if let icon = plan.icon { Text(icon).font(.system(size: 16)) }
                Text(plan.name)
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
                Spacer()
                if streak > 0 {
                    Text("🔥 \(streak)wk")
                        .font(.system(size: 12))
                        .foregroundStyle(HX.muted)
                }
            }

            HStack(alignment: .bottom, spacing: 6) {
                Text("\(done)")
                    .font(.display(56))
                    .tracking(-1)
                    .foregroundStyle(color)
                    .shadow(color: color.opacity(0.4), radius: 14)
                Text("/ \(goal)")
                    .font(.display(22))
                    .foregroundStyle(HX.muted)
                    .padding(.bottom, 6)
                Spacer()
                Text(complete ? "DONE ✓" : "THIS WEEK")
                    .font(.system(size: 10, weight: .medium))
                    .tracking(2)
                    .foregroundStyle(HX.muted)
                    .padding(.bottom, 8)
            }
            .padding(.top, 8)

            TrackerPips(done: done, goal: goal, color: color)
                .padding(.top, 12)
            Text(hype)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(complete ? color : .white)
                .padding(.top, 8)

            Spacer(minLength: 12)

            if complete {
                Text("CRUSHED IT 🎉")
                    .font(.system(size: 13, weight: .black))
                    .tracking(2.5)
                    .foregroundStyle(color)
                    .frame(maxWidth: .infinity, minHeight: 42)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(color.opacity(0.35)))
            } else {
                Button(action: onLog) {
                    Text(loggedToday ? "LOG AGAIN →" : "LET'S GO →")
                        .font(.system(size: 13, weight: .black))
                        .tracking(2.5)
                        .foregroundStyle(Color(hex: "#0a0a0a"))
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(color)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(color: color.opacity(0.33), radius: 11, y: 6)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background {
            ZStack {
                HX.panel
                RadialGradient(colors: [color.opacity(0.27), .clear],
                               center: UnitPoint(x: 0.82, y: -0.1), startRadius: 0, endRadius: 240)
                RadialGradient(colors: [color.opacity(0.14), .clear],
                               center: UnitPoint(x: 0, y: 1.2), startRadius: 0, endRadius: 220)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(color.opacity(0.35)))
        .overlay(alignment: .topTrailing) {
            Sparkle(color: color, opacity: 0.66).padding(.top, 10).padding(.trailing, 12)
        }
        .overlay(alignment: .bottomLeading) {
            Sparkle(color: color, size: 12, opacity: 0.4).padding(.bottom, 10).padding(.leading, 12)
        }
    }
}

// Empty-day hero: a real in-content CTA when nothing's on today's plate.
private struct EmptyDayHero: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            (Text("What's on for ").foregroundStyle(.white)
             + Text("today?").foregroundStyle(HX.gradient))
                .font(.display(40))
                .tracking(-1.2)
                .lineSpacing(-4)
            Text("Nothing logged yet. Pick a workout to get going.")
                .font(.system(size: 14))
                .foregroundStyle(HX.muted)
                .padding(.top, 12)
            Button {
                router.go(.plan)
            } label: {
                Text("CHOOSE A WORKOUT →")
                    .font(.system(size: 13, weight: .black))
                    .tracking(2.5)
                    .foregroundStyle(HX.bg)
                    .frame(maxWidth: .infinity, minHeight: 46)
                    .background(HX.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .padding(.top, 16)
            HStack(spacing: 8) {
                quickAction("🏀 Quick log") {
                    router.push(.customLog(logId: nil, date: nil, planId: nil))
                }
                quickAction("🛌 Rest day") {
                    store.saveLog(WorkoutLog(kind: .rest, date: DateUtils.todayISO(),
                                             createdAt: Date().epochMillis, status: .logged))
                }
            }
            .padding(.top, 8)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(HX.panel)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func quickAction(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 42)
                .background(HX.panel2)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

// Inline browse-a-past-day list, driven by tapping a calendar day.
private struct SelectedDay: View {
    @EnvironmentObject private var router: Router
    let date: String
    let logs: [WorkoutLog]

    var body: some View {
        let sessions = logs.filter { $0.resolvedKind != .rest }
        let totalSec = sessions.reduce(0) { $0 + ($1.totalTimeSec ?? 0) }

        VStack(alignment: .leading, spacing: 6) {
            Divider().background(HX.line)
            HStack(alignment: .lastTextBaseline) {
                Text(date)
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(2)
                    .foregroundStyle(HX.accent)
                Spacer()
                if !sessions.isEmpty {
                    Text("\(sessions.count) session\(sessions.count == 1 ? "" : "s")\(totalSec > 0 ? " · \(formatSec(totalSec)) total" : "")")
                        .font(.system(size: 10))
                        .foregroundStyle(HX.muted)
                }
            }
            if logs.isEmpty {
                Text("Nothing logged this day.")
                    .font(.system(size: 12))
                    .foregroundStyle(HX.muted)
            } else {
                ForEach(logs) { l in
                    Button {
                        router.push(.logDetail(logId: l.id, celebrate: false))
                    } label: {
                        HStack(spacing: 8) {
                            Text(title(for: l)).font(.system(size: 14)).lineLimit(1)
                            Spacer()
                            Text(l.summary)
                                .font(.system(size: 12))
                                .foregroundStyle(HX.muted)
                                .lineLimit(1)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(HX.panel2)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.top, 6)
    }

    private func title(for l: WorkoutLog) -> String {
        switch l.resolvedKind {
        case .rest: return "🛌 Rest day"
        case .custom: return l.customName ?? "Custom"
        case .plan: return l.dayId.flatMap { PLAN.day(id: $0)?.workoutLabel } ?? "Workout"
        }
    }
}

private struct UpcomingCard: View {
    @EnvironmentObject private var router: Router
    let log: WorkoutLog

    var body: some View {
        if log.resolvedKind == .custom {
            row(color: HX.accent, chip: "CUSTOM", chipColor: HX.muted, title: log.customName ?? "Custom") {
                if let workoutId = log.workoutId {
                    router.push(.logWorkout(workoutId: workoutId, logId: log.id, date: nil, planId: nil))
                } else {
                    router.push(.logDetail(logId: log.id, celebrate: false))
                }
            }
        } else if let d = log.dayId.flatMap({ PLAN.day(id: $0) }) {
            row(color: d.category.color, chip: d.category.rawValue, chipColor: d.category.color,
                title: "W\(d.week) \(d.dayOfWeek.label) · \(d.workoutLabel)") {
                router.push(.day(dayId: d.id))
            }
        }
    }

    private func row(color: Color, chip: String, chipColor: Color, title: String,
                     action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Capsule().fill(color).frame(width: 4, height: 40)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(log.date).font(.system(size: 12)).foregroundStyle(HX.accent)
                        Text(chip)
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(1.5)
                            .foregroundStyle(chipColor)
                    }
                    Text(title).font(.system(size: 14)).lineLimit(1)
                }
                Spacer()
                Text("›").foregroundStyle(HX.muted)
            }
            .padding(12)
            .background(HX.panel)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

private struct LastLogCard: View {
    @EnvironmentObject private var router: Router
    let log: WorkoutLog

    var body: some View {
        Button {
            router.push(.logDetail(logId: log.id, celebrate: false))
        } label: {
            content
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(HX.panel)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var content: some View {
        switch log.resolvedKind {
        case .rest:
            HStack(spacing: 12) {
                Text("🛌").font(.system(size: 24))
                VStack(alignment: .leading, spacing: 2) {
                    Text(log.date).font(.system(size: 12)).foregroundStyle(HX.muted)
                    Text("Rest day").font(.system(size: 14))
                }
                Spacer()
            }
        case .custom:
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(log.date).font(.system(size: 12)).foregroundStyle(HX.muted)
                    Spacer()
                    LogResultChip(log: log)
                }
                Text("Custom · \(log.customName ?? "")")
                    .font(.system(size: 14, weight: .semibold))
            }
        case .plan:
            if let d = log.dayId.flatMap({ PLAN.day(id: $0) }) {
                HStack(spacing: 12) {
                    Capsule().fill(d.category.color).frame(width: 4, height: 48)
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(log.date).font(.system(size: 12)).foregroundStyle(HX.muted)
                            Spacer()
                            LogResultChip(log: log)
                        }
                        Text("W\(d.week) \(d.dayOfWeek.label) · \(d.workoutLabel)")
                            .font(.system(size: 14, weight: .semibold))
                            .lineLimit(1)
                    }
                }
            }
        }
    }
}

struct LogResultChip: View {
    let log: WorkoutLog

    var body: some View {
        if log.status == .planned && !log.hasResults {
            Text("PLANNED")
                .font(.system(size: 10, weight: .medium))
                .tracking(1.5)
                .foregroundStyle(HX.muted)
        } else {
            Text(log.summary.isEmpty ? "Logged" : log.summary)
                .font(.display(17))
                .tracking(-0.3)
                .foregroundStyle(HX.accent)
        }
    }
}
