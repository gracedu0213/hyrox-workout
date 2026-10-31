import SwiftUI

// Log detail (web LogDetailPage.tsx): header varies by kind, ResultHero,
// result sections, the custom snapshot / collapsible prescribed workout, and
// Edit/Delete. Arriving with celebrate=true fires confetti + the full-screen
// CelebrationScreen once.

struct LogDetailPage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let logId: String
    let celebrate: Bool

    @State private var celebrated = false
    @State private var fired = false
    @State private var showDetails = false
    @State private var confirmDelete = false

    var body: some View {
        Group {
            if let log = store.log(id: logId) {
                content(log)
                    .fullScreenCover(isPresented: $celebrated) {
                        CelebrationScreen(log: log) {
                            celebrated = false
                            router.go(.train)
                        }
                    }
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Log not found.")
                    Button("Back to overview") { router.go(.train) }
                        .foregroundStyle(HX.accent)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .onAppear {
            if celebrate && !fired {
                fired = true
                celebrated = true
            }
        }
    }

    private func content(_ log: WorkoutLog) -> some View {
        let kind = log.resolvedKind
        let planDay = log.dayId.flatMap { PLAN.day(id: $0) }

        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header(log, kind: kind, planDay: planDay)

                if kind != .rest {
                    ResultHero(log: log)
                        .frame(maxWidth: .infinity)
                        .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)
                }

                if let splits = log.roundSplits, !splits.isEmpty {
                    section("Round splits") {
                        VStack(spacing: 4) {
                            ForEach(splits, id: \.roundIndex) { r in
                                HStack {
                                    Text("Round \(r.roundIndex + 1)")
                                    Spacer()
                                    Text(r.splitSec.map(formatSec) ?? "—")
                                        .font(.system(size: 14).monospacedDigit())
                                }
                                .font(.system(size: 14))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(HX.panel)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                        }
                    }
                }

                if let amrap = log.amrap,
                   amrap.fullRounds != nil || amrap.partialReps != nil || amrap.totalCalories != nil {
                    section("AMRAP result") {
                        VStack(alignment: .leading, spacing: 4) {
                            if let r = amrap.fullRounds {
                                (Text("Rounds: ") + Text("\(r)").bold()).font(.system(size: 14))
                            }
                            if let p = amrap.partialReps {
                                (Text("Partial reps: ") + Text("\(p)").bold()).font(.system(size: 14))
                            }
                            if let c = amrap.totalCalories {
                                (Text("Total cals: ") + Text("\(c)").bold()).font(.system(size: 14))
                            }
                        }
                    }
                }

                if let windows = log.amrap?.perWindow {
                    section("Per window") {
                        VStack(spacing: 8) {
                            ForEach(Array(windows.enumerated()), id: \.offset) { _, w in
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(w.label).font(.system(size: 12)).foregroundStyle(HX.muted)
                                    Text("\(w.fullRounds.map(String.init) ?? "—") rounds + \(w.partialReps ?? 0) reps")
                                        .font(.system(size: 14))
                                    if let note = w.note {
                                        Text(note).font(.system(size: 12)).italic().foregroundStyle(HX.muted)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(8)
                                .background(HX.panel)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                        }
                    }
                }

                if let splits = log.intervals?.splits, !splits.isEmpty {
                    section("Per interval") {
                        VStack(spacing: 4) {
                            ForEach(splits, id: \.roundIndex) { s in
                                HStack {
                                    Text("Interval \(s.roundIndex + 1)").font(.system(size: 14))
                                    Spacer()
                                    Text([
                                        s.reps.map { "\($0) reps" },
                                        s.cal.map { "\($0) cal" },
                                        s.valueSec.map(formatSec),
                                    ].compactMap(\.self).joined(separator: " · "))
                                        .font(.system(size: 12).monospacedDigit())
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(HX.panel)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                        }
                    }
                }

                if let exercises = log.exercises, !exercises.isEmpty {
                    section("Weights used") {
                        VStack(spacing: 4) {
                            ForEach(Array(exercises.enumerated()), id: \.offset) { _, e in
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(e.exerciseName).font(.system(size: 14))
                                    if let w = e.weightUsed {
                                        Text(w).font(.system(size: 12)).foregroundStyle(HX.accent)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(HX.panel)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                        }
                    }
                }

                if log.notes != nil || log.modifications != nil {
                    section("Notes") {
                        VStack(alignment: .leading, spacing: 8) {
                            if let notes = log.notes {
                                Text(notes).font(.system(size: 14))
                            }
                            if let mods = log.modifications {
                                Text("Mod: \(mods)")
                                    .font(.system(size: 14))
                                    .italic()
                                    .foregroundStyle(HX.muted)
                            }
                        }
                    }
                }

                if kind == .custom, let snap = log.workoutSnapshot {
                    section("Workout") {
                        exerciseList(snap.exercises, setupLine: setupSummary(snap.setup), gender: nil)
                    }
                }

                if let planDay {
                    prescribedWorkout(planDay)
                }

                HStack(spacing: 8) {
                    if let editRoute = editRoute(log, kind: kind, planDay: planDay) {
                        Button {
                            router.push(editRoute)
                        } label: {
                            Text("EDIT")
                                .font(.system(size: 13, weight: .semibold))
                                .tracking(1.5)
                                .foregroundStyle(HX.bg)
                                .frame(maxWidth: .infinity, minHeight: 40)
                                .background(HX.accent)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                    Button {
                        confirmDelete = true
                    } label: {
                        Text("DELETE")
                            .font(.system(size: 13))
                            .tracking(1.5)
                            .foregroundStyle(HX.muted)
                            .padding(.horizontal, 16)
                            .frame(minHeight: 40)
                            .background(HX.panel)
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(HX.line))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                }
                .padding(16)
            }
            .padding(.bottom, 32)
        }
        .alert("Delete this log?", isPresented: $confirmDelete) {
            Button("Delete", role: .destructive) {
                store.deleteLog(id: log.id)
                router.go(.train)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Cannot be undone.")
        }
    }

    private func header(_ log: WorkoutLog, kind: LogKind, planDay: Day?) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            BackLink(label: "Back") { router.pop() }
            Text(log.date.uppercased())
                .font(.system(size: 10, weight: .semibold))
                .tracking(2.5)
                .foregroundStyle(HX.muted)
                .padding(.top, 4)
            switch kind {
            case .rest:
                Text("🛌 Rest day").font(.display(28)).tracking(-0.6)
            case .custom:
                Text(log.customName ?? "Custom").font(.display(28)).tracking(-0.6)
                if let type = store.typeResolver.resolve(log) {
                    HStack(spacing: 6) {
                        Circle().fill(Color(hex: type.color)).frame(width: 6, height: 6)
                        Text(type.name.uppercased())
                            .font(.system(size: 11))
                            .tracking(1.5)
                            .foregroundStyle(Color(hex: type.color))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(HX.panel2)
                    .clipShape(Capsule())
                }
            case .plan:
                if let d = planDay {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("W\(d.week) · \(d.dayOfWeek.label)").font(.display(28)).tracking(-0.6)
                        Text(d.category.rawValue)
                            .font(.system(size: 10, weight: .black))
                            .tracking(2)
                            .foregroundStyle(d.category.color)
                    }
                    Text(d.workoutLabel).font(.system(size: 16)).foregroundStyle(.white.opacity(0.9))
                    Text(setupSummary(d.setup)).font(.system(size: 12)).foregroundStyle(HX.muted)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)
    }

    private func prescribedWorkout(_ d: Day) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeOut(duration: 0.2)) { showDetails.toggle() }
            } label: {
                HStack {
                    Text(showDetails ? "Hide the workout" : "See the workout")
                        .font(.system(size: 14, weight: .semibold))
                    Spacer()
                    Text("▼")
                        .font(.system(size: 12))
                        .foregroundStyle(HX.accent)
                        .rotationEffect(.degrees(showDetails ? 180 : 0))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(HX.panel)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .padding(16)

            if showDetails {
                section("Workout") {
                    VStack(alignment: .leading, spacing: 8) {
                        if case .descendingRounds(_, let details) = d.setup, let details {
                            VStack(alignment: .leading, spacing: 4) {
                                ForEach(details, id: \.self) { r in
                                    Text("• \(r)").font(.system(size: 14)).foregroundStyle(.white.opacity(0.8))
                                }
                            }
                        }
                        if case .multiWindowAmrap(let windows) = d.setup {
                            VStack(alignment: .leading, spacing: 4) {
                                ForEach(windows, id: \.self) { w in
                                    Text("• \(w.label)").font(.system(size: 14)).foregroundStyle(.white.opacity(0.8))
                                }
                            }
                        }
                        exerciseList(d.exercises, setupLine: setupSummary(d.setup), gender: store.profile?.gender)
                    }
                }
            }
        }
    }

    private func exerciseList(_ exercises: [Exercise], setupLine: String, gender: Gender?) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(setupLine).font(.system(size: 14)).foregroundStyle(HX.muted)
            ForEach(Array(exercises.enumerated()), id: \.offset) { _, ex in
                if ex.name.hasPrefix("—") {
                    Text(ex.name.uppercased())
                        .font(.system(size: 11))
                        .tracking(1.5)
                        .foregroundStyle(HX.muted)
                        .padding(.top, 4)
                } else {
                    Text("• \(formatExercise(ex, gender: gender))")
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.9))
                }
            }
        }
    }

    private func editRoute(_ log: WorkoutLog, kind: LogKind, planDay: Day?) -> Route? {
        switch kind {
        case .plan:
            return planDay.map { .logDay(dayId: $0.id, logId: log.id, date: nil, planId: nil) }
        case .custom:
            if let workoutId = log.workoutId {
                return .logWorkout(workoutId: workoutId, logId: log.id, date: nil, planId: nil)
            }
            return .customLog(logId: log.id, date: nil, planId: nil)
        case .rest:
            return nil
        }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionLabel(text: title, color: HX.accent)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)
    }
}
