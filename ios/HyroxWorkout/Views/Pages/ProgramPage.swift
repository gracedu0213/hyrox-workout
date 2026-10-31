import SwiftUI

// Plan detail — three bodies mirroring web ProgramPage.tsx: the curated
// 12-week week-strip view, cadence plans (target + go-to pool + adherence
// heatmap), and user-built sequenced plans (day-of-week grid per week).

func formatShortDate(_ iso: String) -> String {
    let parts = iso.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3, (1...12).contains(parts[1]) else { return iso }
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return "\(months[parts[1] - 1]) \(parts[2])"
}

struct ProgramPage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let planId: String
    @State private var confirmDelete = false

    /// For the synthetic descriptor id, prefer the committed curated row (it
    /// gets a real uuid on Start).
    private var plan: UserPlan? {
        if let p = store.plan(id: planId) { return p }
        if planId == CURATED_DESCRIPTOR_ID {
            return store.visiblePlans.first(where: \.isCurated) ?? curatedDescriptor()
        }
        return nil
    }

    var body: some View {
        ScrollView {
            if let plan {
                content(plan)
            } else {
                VStack(alignment: .leading, spacing: 24) {
                    BackLink(label: "Plans") { router.pop() }
                    Text("Plan not found.").foregroundStyle(HX.muted)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func content(_ plan: UserPlan) -> some View {
        let planLogs = store.logsForPlan(plan.id)
        let progress = PlanStats.weekProgress(planLogs, plan: plan)
        let streak = PlanStats.computeStreak(planLogs, plan: plan)

        var menuItems: [MoreMenuItem] = []
        if !plan.isCurated {
            menuItems.append(MoreMenuItem(label: "Edit plan") {
                router.push(.planBuilder(editPlanId: plan.id))
            })
        }
        if plan.active {
            menuItems.append(MoreMenuItem(label: "Make inactive") { commit(plan, active: false) })
        }
        if !plan.isCurated {
            menuItems.append(MoreMenuItem(label: "Delete plan", destructive: true) { confirmDelete = true })
        }

        return VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                BackLink(label: "Plans") { router.pop() }
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            if let icon = plan.icon { Text(icon).font(.system(size: 24)) }
                            Text(plan.name)
                                .font(.display(28))
                                .tracking(-0.6)
                                .lineLimit(1)
                        }
                        HStack(spacing: 12) {
                            if let goal = plan.goalPerWeek {
                                (Text("\(progress.done)").foregroundStyle(HX.accent).fontWeight(.semibold)
                                 + Text("/\(goal) this week").foregroundStyle(HX.muted))
                                    .font(.system(size: 12))
                            }
                            if streak > 0 {
                                Text("🔥 \(streak)wk streak")
                                    .font(.system(size: 12))
                                    .foregroundStyle(HX.muted)
                            }
                        }
                    }
                    Spacer()
                    if plan.active {
                        Text("ACTIVE ✓")
                            .font(.system(size: 11, weight: .black))
                            .tracking(2)
                            .foregroundStyle(HX.muted)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(HX.panel2)
                            .clipShape(Capsule())
                    } else {
                        Button {
                            commit(plan, active: true)
                        } label: {
                            Text("START")
                                .font(.system(size: 11, weight: .black))
                                .tracking(2)
                                .foregroundStyle(Color(hex: "#0a0a0a"))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color(hex: plan.color))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                    if !menuItems.isEmpty { MoreMenu(items: menuItems) }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 20)

            if plan.isCurated {
                CuratedBody(logs: store.allLogs, planActive: plan.active)
            } else if plan.isCadence {
                CadenceBody(plan: plan, planLogs: planLogs)
            } else {
                SequencedBody(plan: plan, planLogs: planLogs)
            }
        }
        .padding(.bottom, 32)
        .alert("Delete \"\(plan.name)\"?", isPresented: $confirmDelete) {
            Button("Delete", role: .destructive) {
                store.archivePlan(id: plan.id)
                router.pop()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Your logged sessions are kept.")
        }
    }

    private func commit(_ plan: UserPlan, active: Bool) {
        var next = plan
        if next.id == CURATED_DESCRIPTOR_ID { next.id = newID() }
        next.active = active
        if next.createdAt == 0 { next.createdAt = Date().epochMillis }
        store.savePlan(next)
    }
}

// MARK: - Curated 12-week body

private struct CuratedBody: View {
    @EnvironmentObject private var router: Router
    let logs: [WorkoutLog]
    let planActive: Bool
    @State private var activeWeek = 0   // 0 = not yet initialized

    private var weeks: [(Int, [Day])] {
        Dictionary(grouping: PLAN.days, by: \.week).sorted { $0.key < $1.key }
    }

    private var completedDayIds: Set<String> {
        Set(logs.compactMap { $0.resolvedKind == .plan && $0.hasResults ? $0.dayId : nil })
    }

    var body: some View {
        let today = DateUtils.todayISO()
        let completed = completedDayIds
        let upcoming = logs
            .filter { $0.resolvedKind == .plan && $0.dayId != nil && $0.status == .planned && !$0.hasResults && $0.date > today }
            .sorted { $0.date < $1.date }
        var scheduledByDayId: [String: String] = [:]
        for l in upcoming {
            if let dayId = l.dayId, scheduledByDayId[dayId] == nil { scheduledByDayId[dayId] = l.date }
        }

        let week = max(activeWeek, 1)
        let days = weeks.first { $0.0 == week }?.1 ?? []
        let phase = days.first?.phase ?? .base

        return VStack(alignment: .leading, spacing: 0) {
            weekStrip(completed: completed)

            if !upcoming.isEmpty {
                upcomingRail(upcoming)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("WEEK \(week)")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(2.5)
                    .foregroundStyle(HX.muted)
                Text(phase.rawValue)
                    .font(.display(44))
                    .tracking(-1.3)
                    .gradientText()
            }
            .padding(.horizontal, 16)
            .padding(.top, 20)
            .padding(.bottom, 8)

            VStack(spacing: 8) {
                ForEach(days) { d in
                    dayRow(d, done: completed.contains(d.id), scheduledDate: scheduledByDayId[d.id])
                }
            }
            .padding(.horizontal, 16)

            if !planActive {
                Text("Start the program to track your progress as you go.")
                    .font(.system(size: 12))
                    .foregroundStyle(HX.muted)
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
            }
        }
        .padding(.top, 16)
        .onAppear {
            guard activeWeek == 0 else { return }
            // Land on the latest week with a completed plan log.
            var latest = 1
            for l in logs where l.resolvedKind == .plan && l.hasResults {
                if let d = l.dayId.flatMap({ PLAN.day(id: $0) }), d.week > latest { latest = d.week }
            }
            activeWeek = latest
        }
    }

    private func weekStrip(completed: Set<String>) -> some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    ForEach(weeks, id: \.0) { w, ds in
                        let complete = ds.allSatisfy { completed.contains($0.id) }
                        let active = w == max(activeWeek, 1)
                        Button {
                            activeWeek = w
                        } label: {
                            Text("W\(String(format: "%02d", w)) · \(ds[0].phase.rawValue)\(complete && !active ? " ✓" : "")")
                                .font(.system(size: 12, weight: .semibold))
                                .tracking(1)
                                .strikethrough(complete && !active)
                                .foregroundStyle(active ? HX.bg : complete ? HX.muted.opacity(0.6) : HX.muted)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(active ? HX.accent : .clear)
                                .overlay(Capsule().stroke(active ? HX.accent : HX.line))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        .id(w)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .scrollIndicators(.hidden)
            .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .top)
            .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)
            .onChange(of: activeWeek) { _, w in
                withAnimation { proxy.scrollTo(w, anchor: .center) }
            }
            .onAppear {
                DispatchQueue.main.async { proxy.scrollTo(max(activeWeek, 1), anchor: .center) }
            }
        }
    }

    private func upcomingRail(_ upcoming: [WorkoutLog]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .lastTextBaseline) {
                SectionLabel(text: "Upcoming", color: HX.accent)
                Spacer()
                Text("\(upcoming.count) SCHEDULED")
                    .font(.system(size: 10, weight: .medium))
                    .tracking(1.5)
                    .foregroundStyle(HX.muted)
            }
            .padding(.horizontal, 16)
            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    ForEach(upcoming) { l in
                        if let d = l.dayId.flatMap({ PLAN.day(id: $0) }) {
                            upcomingCard(l, d)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.viewAligned)
            .scrollIndicators(.hidden)
        }
        .padding(.top, 16)
    }

    private func upcomingCard(_ l: WorkoutLog, _ d: Day) -> some View {
        Button {
            router.push(.day(dayId: d.id))
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Capsule().fill(d.category.color).frame(width: 4, height: 24)
                    Text(formatShortDate(l.date))
                        .font(.system(size: 12))
                        .foregroundStyle(HX.accent)
                    Spacer()
                    Text(String(d.category.rawValue.prefix(4)))
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(1.5)
                        .foregroundStyle(d.category.color)
                }
                Text("W\(d.week) · \(d.dayOfWeek.label)")
                    .font(.system(size: 11))
                    .tracking(1.5)
                    .foregroundStyle(HX.muted)
                Text(d.workoutLabel)
                    .font(.system(size: 14))
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            .padding(12)
            .frame(width: 160, alignment: .topLeading)
            .background(HX.panel)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    private func dayRow(_ d: Day, done: Bool, scheduledDate: String?) -> some View {
        Button {
            router.push(.day(dayId: d.id))
        } label: {
            HStack(spacing: 12) {
                Capsule().fill(d.category.color).frame(width: 4, height: 48)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(d.dayOfWeek.label)
                            .font(.system(size: 14, weight: .semibold))
                        Text(d.category.rawValue)
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(1.5)
                            .foregroundStyle(d.category.color)
                        Spacer()
                        if done {
                            Text("DONE ✓")
                                .font(.system(size: 10, weight: .black))
                                .tracking(2)
                                .foregroundStyle(HX.bg)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(HX.accent)
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        } else if let scheduledDate {
                            Text("📅 \(scheduledDate)")
                                .font(.system(size: 10))
                                .foregroundStyle(HX.accent)
                        }
                    }
                    Text(d.workoutLabel)
                        .font(.system(size: 14))
                        .strikethrough(done)
                        .foregroundStyle(done ? HX.muted : .white.opacity(0.9))
                        .lineLimit(1)
                    Text(setupSummary(d.setup))
                        .font(.system(size: 12))
                        .foregroundStyle(HX.muted)
                        .lineLimit(1)
                }
                Text("›").foregroundStyle(HX.muted)
            }
            .padding(12)
            .background(HX.panel)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .opacity(done ? 0.5 : 1)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Cadence body

private struct CadenceBody: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let plan: UserPlan
    let planLogs: [WorkoutLog]

    private var durationLabel: String {
        guard let durationWeeks = plan.durationWeeks else { return "Ongoing" }
        if plan.active, plan.createdAt > 0 {
            let startMon = DateUtils.mondayOfWeek(Date(epochMillis: plan.createdAt))
            let nowMon = DateUtils.mondayOfWeek(Date())
            let wk = Int(nowMon.timeIntervalSince(startMon) / (7 * 86400)) + 1
            return wk > durationWeeks
                ? "Complete · \(durationWeeks) weeks"
                : "Week \(max(1, wk)) of \(durationWeeks)"
        }
        return "\(durationWeeks)-week block"
    }

    var body: some View {
        let poolIds = plan.poolSlots.compactMap(\.workoutId)
        let usingPool = !poolIds.isEmpty
        let targets: [CustomWorkout] = usingPool
            ? poolIds.compactMap { store.workout(id: $0) }.filter { $0.archived != true }
            : store.customWorkouts

        VStack(alignment: .leading, spacing: 0) {
            Text(durationLabel.uppercased())
                .font(.system(size: 12, weight: .medium))
                .tracking(2.5)
                .foregroundStyle(HX.muted)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .top)
                .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)

            VStack(alignment: .leading, spacing: 6) {
                SectionLabel(text: "Consistency")
                ConsistencyHeatmap(logs: planLogs, typeOf: store.typeResolver.resolve)
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)

            VStack(alignment: .leading, spacing: 6) {
                SectionLabel(text: usingPool ? "Go-to workouts" : "Log a workout")
                if !usingPool {
                    Text("Pick any workout — it counts toward this plan.")
                        .font(.system(size: 12))
                        .foregroundStyle(HX.muted)
                }
                if targets.isEmpty {
                    HStack(spacing: 4) {
                        Text("No workouts yet.").foregroundStyle(HX.muted)
                        Button("Build one →") { router.push(.workoutBuilder(editWorkoutId: nil)) }
                            .foregroundStyle(HX.accent)
                    }
                    .font(.system(size: 14))
                } else {
                    VStack(spacing: 8) {
                        ForEach(targets) { w in
                            Button {
                                router.push(.workoutDetail(workoutId: w.id, planId: plan.id, date: nil))
                            } label: {
                                HStack(spacing: 12) {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(w.name).font(.system(size: 14, weight: .semibold)).lineLimit(1)
                                        Text(setupSummary(customToSetup(w).setup))
                                            .font(.system(size: 12))
                                            .foregroundStyle(HX.muted)
                                            .lineLimit(1)
                                    }
                                    Spacer()
                                    Text("›").foregroundStyle(HX.muted)
                                }
                                .padding(12)
                                .background(HX.panel)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 20)
        }
        .padding(.top, 16)
    }
}

// MARK: - Sequenced body

private struct SequencedBody: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let plan: UserPlan
    let planLogs: [WorkoutLog]
    @State private var activeWeek = 1

    private var weeks: [PlanWeek] {
        if case .sequenced(let weeks) = plan.content { return weeks }
        return []
    }

    var body: some View {
        if weeks.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text(plan.goalPerWeek != nil
                     ? "This is a cadence goal — log any workout and tag it to this plan to build your streak."
                     : "This plan has no weeks yet.")
                    .font(.system(size: 14))
                    .foregroundStyle(HX.muted)
                Button("Edit plan →") { router.push(.planBuilder(editPlanId: plan.id)) }
                    .font(.system(size: 14))
                    .foregroundStyle(HX.accent)
            }
            .padding(.horizontal, 16)
            .padding(.top, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            content
        }
    }

    private var content: some View {
        let startMonday = plan.startDate.map { DateUtils.mondayOfWeek(DateUtils.parseISO($0)) }
        let doneDates = Set(planLogs.filter { PlanStats.isQualifying($0, planId: plan.id) }.map(\.date))
        let week = weeks[min(activeWeek, weeks.count) - 1]
        let dayed = WEEKDAYS_7.compactMap { dow in week.slot(for: dow).map { (dow, $0) } }
        let anytime = week.anytimeSlots

        func slotDate(_ dayIdx: Int) -> String? {
            guard let startMonday else { return nil }
            return DateUtils.isoDate(DateUtils.addDays(startMonday, (activeWeek - 1) * 7 + dayIdx))
        }

        return VStack(alignment: .leading, spacing: 0) {
            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    ForEach(1...weeks.count, id: \.self) { w in
                        let active = w == activeWeek
                        Button {
                            activeWeek = w
                        } label: {
                            Text("WEEK \(w)")
                                .font(.system(size: 12, weight: .semibold))
                                .tracking(1)
                                .foregroundStyle(active ? HX.bg : HX.muted)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(active ? HX.accent : .clear)
                                .overlay(Capsule().stroke(active ? HX.accent : HX.line))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .scrollIndicators(.hidden)
            .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .top)
            .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)

            VStack(spacing: 8) {
                ForEach(Array(dayed.enumerated()), id: \.offset) { _, pair in
                    let (dow, slot) = pair
                    let date = slotDate(WEEKDAYS_7.firstIndex(of: dow) ?? 0)
                    let done = date.map { doneDates.contains($0) } ?? false
                    HStack(spacing: 12) {
                        Text(dow.label)
                            .font(.system(size: 12, weight: .black))
                            .tracking(2)
                            .foregroundStyle(HX.muted)
                            .frame(width: 40, alignment: .leading)
                        slotContent(slot, date: date, done: done)
                        Spacer()
                        if done {
                            Text("DONE ✓")
                                .font(.system(size: 10, weight: .black))
                                .tracking(2)
                                .foregroundStyle(HX.bg)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(HX.accent)
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        } else if let date {
                            Text(formatShortDate(date))
                                .font(.system(size: 10))
                                .foregroundStyle(HX.accent)
                        }
                    }
                    .padding(12)
                    .background(HX.panel)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)

            if !anytime.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Any day this week")
                    VStack(spacing: 8) {
                        ForEach(Array(anytime.enumerated()), id: \.offset) { _, slot in
                            HStack(spacing: 12) {
                                slotContent(slot, date: nil, done: false)
                                Spacer()
                            }
                            .padding(12)
                            .background(HX.panel)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
            }

            if dayed.isEmpty && anytime.isEmpty {
                Text("Nothing scheduled this week.")
                    .font(.system(size: 14))
                    .foregroundStyle(HX.muted)
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
            }
        }
        .padding(.top, 16)
    }

    @ViewBuilder
    private func slotContent(_ slot: PlanSlot, date: String?, done: Bool) -> some View {
        if slot.isRest {
            Text("🛌 Rest").font(.system(size: 14)).foregroundStyle(HX.muted)
        } else if let w = slot.workoutId.flatMap({ store.workout(id: $0) }) {
            Button {
                router.push(.workoutDetail(workoutId: w.id, planId: plan.id, date: date))
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(w.name)
                        .font(.system(size: 14, weight: .semibold))
                        .strikethrough(done)
                        .foregroundStyle(done ? HX.muted : .white)
                        .lineLimit(1)
                    Text(setupSummary(customToSetup(w).setup))
                        .font(.system(size: 12))
                        .foregroundStyle(HX.muted)
                        .lineLimit(1)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        } else {
            Text("Workout removed")
                .font(.system(size: 14))
                .foregroundStyle(HX.muted.opacity(0.6))
        }
    }
}
