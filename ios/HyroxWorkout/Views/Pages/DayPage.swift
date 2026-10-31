import SwiftUI

// Curated day detail (web DayPage.tsx): the prescribed workout + exercises +
// notes, an "Add to plan" scheduler (with the already-booked confirm), and
// this day's log history.

struct DayPage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let dayId: String

    @State private var scheduleDate = DateUtils.todayISO()
    @State private var conflictMessage: String?
    @State private var confirmDeleteLogId: String?

    var body: some View {
        if let day = PLAN.day(id: dayId) {
            content(day)
        } else {
            VStack(alignment: .leading, spacing: 12) {
                Text("Day not found.")
                Button("Back to plan") { router.pop() }
                    .foregroundStyle(HX.accent)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func content(_ day: Day) -> some View {
        let logs = store.logsForDay(day.id)

        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 6) {
                    BackLink(label: "Plan") { router.pop() }
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("W\(String(format: "%02d", day.week)) · \(day.dayOfWeek.label)")
                            .font(.display(28))
                            .tracking(-0.6)
                        Text(day.category.rawValue)
                            .font(.system(size: 10, weight: .black))
                            .tracking(2)
                            .foregroundStyle(day.category.color)
                    }
                    Text(day.phase.rawValue)
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(2.5)
                        .foregroundStyle(HX.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)

                // Workout
                section("Workout") {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(day.workoutLabel).font(.display(20)).tracking(-0.3)
                        Text(setupSummary(day.setup)).font(.system(size: 14)).foregroundStyle(HX.muted)
                        if case .descendingRounds(_, let details) = day.setup, let details {
                            VStack(alignment: .leading, spacing: 4) {
                                ForEach(details, id: \.self) { Text("• \($0)") }
                            }
                            .font(.system(size: 14))
                            .foregroundStyle(.white.opacity(0.8))
                            .padding(.top, 8)
                        }
                        if case .multiWindowAmrap(let windows) = day.setup {
                            VStack(alignment: .leading, spacing: 4) {
                                ForEach(windows, id: \.self) { Text("• \($0.label)") }
                            }
                            .font(.system(size: 14))
                            .foregroundStyle(.white.opacity(0.8))
                            .padding(.top, 8)
                        }
                    }
                }

                // Exercises
                section("Exercises") {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(day.exercises.enumerated()), id: \.offset) { _, ex in
                            if ex.name.hasPrefix("—") {
                                Text(ex.name.uppercased())
                                    .font(.system(size: 11))
                                    .tracking(1.5)
                                    .foregroundStyle(HX.muted)
                                    .padding(.top, 8)
                            } else {
                                Text(formatExercise(ex, gender: store.profile?.gender))
                                    .font(.system(size: 14))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(HX.panel)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                        }
                    }
                }

                // Notes
                if !day.notes.isEmpty {
                    section("Notes") {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(day.notes, id: \.self) { Text("• \($0)") }
                        }
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.8))
                    }
                }

                // Add to plan
                section(nil) {
                    VStack(alignment: .leading, spacing: 8) {
                        SectionLabel(text: "Add to plan")
                        HStack(spacing: 8) {
                            DateField(iso: $scheduleDate)
                            Spacer()
                            Button("ADD") { addToPlan(day) }
                                .font(.system(size: 13, weight: .semibold))
                                .tracking(1.5)
                                .foregroundStyle(HX.bg)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(HX.accent)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                                .buttonStyle(.plain)
                        }
                        Text("Defaults to today. Pick any date — past or future — then log results from the day's entry.")
                            .font(.system(size: 12))
                            .foregroundStyle(HX.muted)
                    }
                    .panelCard(8, padding: 12)
                }

                // Log history
                section("Your Logs (\(logs.count))") {
                    if logs.isEmpty {
                        Text("No logs yet for this workout.")
                            .font(.system(size: 14))
                            .foregroundStyle(HX.muted)
                    } else {
                        VStack(spacing: 8) {
                            ForEach(logs) { l in
                                logRow(l, day: day)
                            }
                        }
                    }
                }
            }
            .padding(.bottom, 32)
        }
        .alert("Already booked", isPresented: Binding(
            get: { conflictMessage != nil },
            set: { if !$0 { conflictMessage = nil } }
        )) {
            Button("Add anyway") { schedule(day) }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(conflictMessage ?? "")
        }
        .alert("Delete this planned workout?", isPresented: Binding(
            get: { confirmDeleteLogId != nil },
            set: { if !$0 { confirmDeleteLogId = nil } }
        )) {
            Button("Delete", role: .destructive) {
                if let id = confirmDeleteLogId { store.deleteLog(id: id) }
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    private func logRow(_ l: WorkoutLog, day: Day) -> some View {
        let planned = l.status == .planned && !l.hasResults
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(l.date).font(.system(size: 14))
                Spacer()
                if planned {
                    Text("PLANNED")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1.5)
                        .foregroundStyle(HX.muted)
                } else {
                    Text(l.summary.isEmpty ? "Logged" : l.summary)
                        .font(.display(15))
                        .tracking(-0.2)
                        .gradientText()
                }
            }
            if let notes = l.notes {
                Text(notes).font(.system(size: 12)).foregroundStyle(HX.muted)
            }
            if let mods = l.modifications {
                Text("Mod: \(mods)").font(.system(size: 12)).italic().foregroundStyle(HX.muted)
            }
            HStack(spacing: 8) {
                Button(planned ? "Add results" : "Edit") {
                    router.push(.logDay(dayId: day.id, logId: l.id, date: nil, planId: nil))
                }
                .font(.system(size: 12))
                .foregroundStyle(HX.accent)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(HX.panel2)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                if planned {
                    Button("Delete") { confirmDeleteLogId = l.id }
                        .font(.system(size: 12))
                        .foregroundStyle(.red.opacity(0.8))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(HX.panel2)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
            .buttonStyle(.plain)
            .padding(.top, 2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(HX.panel)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func addToPlan(_ day: Day) {
        let existing = store.logsForDate(scheduleDate)
        if existing.isEmpty {
            schedule(day)
        } else {
            let summary = existing.map(describeExistingLog).joined(separator: "; ")
            conflictMessage = "\(scheduleDate) already has: \(summary).\n\nAdd \(day.workoutLabel) on top?"
        }
    }

    private func schedule(_ day: Day) {
        store.saveLog(WorkoutLog(dayId: day.id, date: scheduleDate,
                                 createdAt: Date().epochMillis, status: .planned))
        if scheduleDate == DateUtils.todayISO() {
            router.go(.train)
        } else {
            router.pop()
        }
    }

    private func describeExistingLog(_ l: WorkoutLog) -> String {
        switch l.resolvedKind {
        case .rest: return "a rest day"
        case .custom: return "custom \"\(l.customName ?? "workout")\""
        case .plan:
            let label = l.dayId.flatMap { PLAN.day(id: $0)?.workoutLabel } ?? "a plan workout"
            let state = l.status == .planned && !l.hasResults ? " (planned)" : " (logged)"
            return label + state
        }
    }

    private func section<Content: View>(_ title: String?, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title { SectionLabel(text: title, color: HX.accent) }
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)
    }
}
