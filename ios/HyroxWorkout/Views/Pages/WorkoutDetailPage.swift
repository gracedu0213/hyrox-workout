import SwiftUI

// Read-only custom-workout template (web WorkoutDetailPage.tsx): programming-
// sheet block rendering, type/intensity chips, ⋯ Edit/Delete, and the sticky
// "Log this workout" + Schedule bar. planId/date carried in from the Plan tab
// keep logging attributed.

let INTENSITY_DOT: [Intensity: String] = [
    .easy: "#4ade80",
    .moderate: "#fbbf24",
    .hard: "#f87171",
]

struct WorkoutDetailPage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let workoutId: String
    let presetPlanId: String?
    let presetDate: String?

    @State private var scheduling = false
    @State private var scheduleDate = ""
    @State private var confirmDelete = false

    var body: some View {
        if let workout = store.workout(id: workoutId) {
            content(workout)
                .onAppear {
                    if scheduleDate.isEmpty { scheduleDate = presetDate ?? DateUtils.todayISO() }
                }
        } else {
            VStack(alignment: .leading, spacing: 24) {
                BackLink(label: "Plan") { router.pop() }
                Text("Workout not found.").foregroundStyle(HX.muted)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func content(_ workout: CustomWorkout) -> some View {
        let type = workout.typeId.flatMap { id in store.sortedTypes.first { $0.id == id } }
        let workBlocks = workout.blocks.filter(\.hasWork)

        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    BackLink(label: "Back") { router.pop() }
                    HStack(alignment: .top, spacing: 12) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(workout.name)
                                .font(.display(28))
                                .tracking(-0.6)
                                .lineLimit(2)
                            HStack(spacing: 6) {
                                if let type {
                                    chipView(type.name, color: Color(hex: type.color))
                                }
                                if let intensity = workout.intensity {
                                    chipView(intensity.rawValue, color: HX.muted,
                                             dot: Color(hex: INTENSITY_DOT[intensity] ?? "#8a8a8a"))
                                }
                            }
                        }
                        Spacer()
                        MoreMenu(items: [
                            MoreMenuItem(label: "Edit") { router.push(.workoutBuilder(editWorkoutId: workout.id)) },
                            MoreMenuItem(label: "Delete", destructive: true) { confirmDelete = true },
                        ])
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)

                // Blocks
                VStack(spacing: 12) {
                    ForEach(Array(workout.blocks.enumerated()), id: \.offset) { _, block in
                        if !block.hasWork {
                            restDivider(block)
                        } else {
                            blockCard(block, workBlocks: workBlocks)
                        }
                    }
                }
                .padding(16)

                if !workout.notes.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        SectionLabel(text: "Notes")
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(workout.notes, id: \.self) { Text("• \($0)") }
                        }
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.85))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                }

                if scheduling {
                    HStack(spacing: 8) {
                        DateField(iso: $scheduleDate)
                        Spacer()
                        Button("ADD") { schedule(workout) }
                            .font(.system(size: 13, weight: .semibold))
                            .tracking(1.5)
                            .foregroundStyle(HX.bg)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(HX.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                            .buttonStyle(.plain)
                    }
                    .padding(16)
                }
            }
            .padding(.bottom, 96)
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 0) {
                Rectangle().fill(HX.line).frame(height: 1)
                HStack(spacing: 8) {
                    Button {
                        router.push(.logWorkout(workoutId: workout.id, logId: nil,
                                                date: presetDate, planId: presetPlanId))
                    } label: {
                        Text("LOG THIS WORKOUT")
                            .font(.system(size: 14, weight: .semibold))
                            .tracking(1.5)
                            .foregroundStyle(HX.bg)
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(HX.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                    Button(scheduling ? "CANCEL" : "SCHEDULE") {
                        scheduling.toggle()
                    }
                    .font(.system(size: 12))
                    .tracking(1.5)
                    .foregroundStyle(HX.muted)
                    .padding(.horizontal, 16)
                    .frame(minHeight: 48)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(HX.line))
                    .buttonStyle(.plain)
                }
                .padding(12)
            }
            .background(HX.bg)
        }
        .alert("Delete \"\(workout.name)\"?", isPresented: $confirmDelete) {
            Button("Delete", role: .destructive) {
                store.deleteWorkout(id: workout.id)
                router.pop()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Past logs are kept.")
        }
    }

    private func chipView(_ label: String, color: Color, dot: Color? = nil) -> some View {
        HStack(spacing: 6) {
            Circle().fill(dot ?? color).frame(width: 6, height: 6)
            Text(label.uppercased())
                .font(.system(size: 11))
                .tracking(1.5)
                .foregroundStyle(color)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(HX.panel2)
        .clipShape(Capsule())
    }

    /// Standalone rest block → full-width divider.
    private func restDivider(_ block: Block) -> some View {
        let restSec = block.rows.compactMap { row -> Int? in
            if case .rest(let s) = row { return s }
            return nil
        }.first
        return HStack(spacing: 12) {
            Rectangle().fill(HX.line).frame(height: 1)
            Text("REST\(restSec.map { $0 > 0 ? " \(formatSec($0))" : "" } ?? "")")
                .font(.system(size: 11, weight: .medium))
                .tracking(2)
                .foregroundStyle(HX.muted)
                .fixedSize()
            Rectangle().fill(HX.line).frame(height: 1)
        }
        .padding(.vertical, 2)
    }

    private func blockCard(_ block: Block, workBlocks: [Block]) -> some View {
        let rounds = max(1, block.repeatCount)
        let workNo = (workBlocks.firstIndex(of: block) ?? 0) + 1
        let heading = block.label ?? (workBlocks.count > 1 ? "Block \(workNo)" : "Workout")

        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                SectionLabel(text: heading, color: HX.accent)
                Spacer()
                if rounds > 1 {
                    Text("×\(rounds) ROUNDS")
                        .font(.system(size: 11, weight: .black))
                        .tracking(2)
                        .foregroundStyle(HX.bg)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(HX.accent)
                        .clipShape(Capsule())
                }
            }
            VStack(spacing: 0) {
                ForEach(Array(block.rows.enumerated()), id: \.offset) { j, row in
                    switch row {
                    case .rest(let restSec):
                        HStack(spacing: 12) {
                            Rectangle().fill(HX.line.opacity(0.5)).frame(height: 1)
                            Text("REST \(formatSec(restSec))")
                                .font(.system(size: 11, weight: .medium))
                                .tracking(2)
                                .foregroundStyle(HX.muted)
                                .fixedSize()
                            Rectangle().fill(HX.line.opacity(0.5)).frame(height: 1)
                        }
                        .padding(.vertical, 8)
                    case .exercise(let ex):
                        exerciseRow(ex, isLast: j == block.rows.count - 1)
                    }
                }
            }
        }
        .panelCard()
    }

    /// Movement left, prescription right — reads like a programming sheet.
    private func exerciseRow(_ ex: ExSpec, isLast: Bool) -> some View {
        let qty = formatQty(Exercise(name: ex.name, qty: ex.qty, unit: ex.unit))
        let weight = formatSingleWeight(ex.weight)
        let prescription = [qty, weight].filter { !$0.isEmpty }.joined(separator: " · ")

        return HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(ex.name).font(.system(size: 14)).foregroundStyle(.white.opacity(0.9))
                if let note = ex.note {
                    Text(note).font(.system(size: 12)).foregroundStyle(HX.muted)
                }
            }
            Spacer()
            if !prescription.isEmpty {
                Text(prescription)
                    .font(.system(size: 14, weight: .semibold).monospacedDigit())
                    .foregroundStyle(HX.accent)
            }
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            if !isLast { Rectangle().fill(HX.line.opacity(0.4)).frame(height: 1) }
        }
    }

    private func schedule(_ workout: CustomWorkout) {
        var log = WorkoutLog(workoutId: workout.id, kind: .custom, date: scheduleDate,
                             createdAt: Date().epochMillis, status: .planned)
        log.customName = workout.name
        log.intensity = workout.intensity
        log.workoutSnapshot = buildSnapshot(workout)
        log.planId = presetPlanId
        store.saveLog(log)
        router.go(.train)
    }
}
