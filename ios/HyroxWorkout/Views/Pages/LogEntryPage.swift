import SwiftUI

// The main result-entry form (web LogPage.tsx): works over a curated Day or a
// custom workout, with setup-driven result sections — round splits, AMRAP,
// per-window, per-interval — plus weights, felt, notes, and plan attribution.

enum LogTarget: Hashable {
    case day(String)
    case workout(String)
}

/// Normalized view over a library Day or a custom workout.
private struct Target {
    var id: String
    var isCustom: Bool
    var name: String
    var setup: WorkoutSetup
    var exercises: [Exercise]
    var week: Int?
    var dayOfWeek: DayOfWeek?
    var category: HyroxWorkout.Category?
}

struct LogEntryPage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let target: LogTarget
    let logId: String?
    let presetDate: String?
    let presetPlanId: String?

    @State private var resolved: Target?
    @State private var snapshot: WorkoutSnapshot?
    @State private var resolving = true

    @State private var savedLogId = ""
    @State private var date = ""
    @State private var planId: String?
    @State private var createdAt: Double = 0
    @State private var totalTimeSec: Int?
    @State private var felt: FeltLike?
    @State private var intensity: Intensity?
    @State private var notes = ""
    @State private var modifications = ""
    @State private var roundSplits: [Int: Int] = [:]
    @State private var amrapFullRounds: Int?
    @State private var amrapPartialReps: Int?
    @State private var amrapCals: Int?
    @State private var perWindow: [Int: AMRAPWindowResult] = [:]
    @State private var intervalResults: [Int: IntervalSplit] = [:]
    @State private var exerciseLogs: [Int: ExerciseLogEntry] = [:]

    private var editing: Bool { logId != nil }

    var body: some View {
        Group {
            if resolving {
                Color.clear.onAppear(perform: resolve)
            } else if let resolved {
                form(resolved)
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Workout not found.")
                    Button("Back home") { router.go(.train) }
                        .foregroundStyle(HX.accent)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // Resolve the target and, when editing, load the existing log — mirrors
    // the web's single async pass. Prefer a custom log's snapshot so results
    // render even if the template was later edited or deleted.
    private func resolve() {
        let loaded = logId.flatMap { store.log(id: $0) }

        var t: Target?
        var snap: WorkoutSnapshot?
        if let s = loaded?.workoutSnapshot {
            snap = s
            t = Target(id: loaded?.workoutId ?? "", isCustom: true, name: s.name,
                       setup: s.setup, exercises: s.exercises)
        } else if case .day(let dayId) = target, let d = PLAN.day(id: dayId) {
            t = Target(id: d.id, isCustom: false, name: d.workoutLabel, setup: d.setup,
                       exercises: d.exercises, week: d.week, dayOfWeek: d.dayOfWeek, category: d.category)
        } else if let dayId = loaded?.dayId, let d = PLAN.day(id: dayId) {
            t = Target(id: d.id, isCustom: false, name: d.workoutLabel, setup: d.setup,
                       exercises: d.exercises, week: d.week, dayOfWeek: d.dayOfWeek, category: d.category)
        } else if case .workout(let workoutId) = target, let w = store.workout(id: workoutId) {
            let (setup, exercises) = customToSetup(w)
            t = Target(id: w.id, isCustom: true, name: w.name, setup: setup, exercises: exercises)
            snap = buildSnapshot(w)
            if loaded == nil { intensity = w.intensity }
        }

        // Initial attribution: existing log's plan, an explicit preset, or —
        // for a curated day with the 12-week committed — the curated plan.
        var initialPlan = loaded?.planId ?? presetPlanId
        if initialPlan == nil, let t, !t.isCustom,
           let curated = store.activePlans.first(where: \.isCurated) {
            initialPlan = curated.id
        }
        planId = initialPlan

        // Pre-fill weights from the prescription (gender-aware for library).
        let wgender: Gender? = (t?.isCustom == true) ? nil : store.profile?.gender
        var exLogs: [Int: ExerciseLogEntry] = [:]
        for (i, ex) in (t?.exercises ?? []).enumerated() where !ex.name.hasPrefix("—") {
            if let w = ex.weight {
                let def = formatWeight(w, gender: wgender)
                if !def.isEmpty { exLogs[i] = ExerciseLogEntry(exerciseName: ex.name, weightUsed: def) }
            }
        }

        if let loaded {
            savedLogId = loaded.id
            date = loaded.date
            createdAt = loaded.createdAt
            totalTimeSec = loaded.totalTimeSec
            felt = loaded.feltLike
            intensity = loaded.intensity
            notes = loaded.notes ?? ""
            modifications = loaded.modifications ?? ""
            for r in loaded.roundSplits ?? [] where r.splitSec != nil {
                roundSplits[r.roundIndex] = r.splitSec
            }
            if let amrap = loaded.amrap {
                amrapFullRounds = amrap.fullRounds
                amrapPartialReps = amrap.partialReps
                amrapCals = amrap.totalCalories
                for (i, w) in (amrap.perWindow ?? []).enumerated() { perWindow[i] = w }
            }
            for s in loaded.intervals?.splits ?? [] { intervalResults[s.roundIndex] = s }
            if let entries = loaded.exercises, let t {
                for e in entries {
                    if let idx = t.exercises.firstIndex(where: { $0.name == e.exerciseName }) {
                        exLogs[idx] = e
                    }
                }
            }
        } else {
            savedLogId = newID()
            date = presetDate ?? DateUtils.todayISO()
            createdAt = Date().epochMillis
        }

        exerciseLogs = exLogs
        resolved = t
        snapshot = snap
        resolving = false
    }

    private func form(_ target: Target) -> some View {
        let setup = target.setup
        let roundCount: Int = {
            switch setup {
            case .rft(let r), .descendingRounds(let r, _), .rounds(let r): return r
            default: return 0
            }
        }()
        let intervalCount: Int = {
            switch setup {
            case .emom(_, let total): return total
            case .intervals(let r, _, _, _): return r
            default: return 0
            }
        }()

        return ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header(target)

                VStack(alignment: .leading, spacing: 16) {
                    field("Date") { DateField(iso: $date) }
                    field("Total time") { TimeInput(valueSec: $totalTimeSec) }
                    field("Intensity") { IntensityPills(intensity: $intensity) }
                    if !store.activePlans.isEmpty {
                        field("Part of a plan?") { planPicker }
                    }
                    FeltPicker(value: $felt)
                }

                if roundCount > 0 { roundSplitsSection(roundCount) }
                if case .amrap = setup { amrapSection }
                if case .multiWindowAmrap(let windows) = setup { perWindowSection(windows) }
                if intervalCount > 0 { intervalsSection(intervalCount) }
                weightsSection(target)

                VStack(alignment: .leading, spacing: 12) {
                    field("Notes") {
                        NotesEditor(text: $notes, placeholder: "How did it feel? Anything notable?", lines: 3)
                    }
                    field("Modifications") {
                        NotesEditor(text: $modifications, placeholder: "What did you swap or adjust?", lines: 2)
                    }
                }
            }
            .padding(16)
            .padding(.bottom, 96)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) {
            SaveBar(label: editing ? "Save changes" : "Save log", enabled: true) { save(target) }
        }
    }

    private func header(_ target: Target) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            BackLink(label: "Back") { router.pop() }
            Text(editing ? "Edit log" : "Log workout")
                .font(.display(20))
                .tracking(-0.3)
            if target.isCustom {
                Text(target.name)
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.8))
                    .lineLimit(1)
            } else {
                HStack(spacing: 4) {
                    Text("W\(target.week ?? 0) \(target.dayOfWeek?.label ?? "") ·")
                    if let category = target.category {
                        Text(category.rawValue).foregroundStyle(category.color)
                    }
                    Text("· \(target.name)").lineLimit(1)
                }
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.8))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, 4)
        .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)
    }

    private var planPicker: some View {
        Menu {
            Button("Not part of a plan") { planId = nil }
            ForEach(store.activePlans) { p in
                Button("\(p.icon.map { "\($0) " } ?? "")\(p.name)") { planId = p.id }
            }
        } label: {
            HStack {
                let selected = planId.flatMap { id in store.activePlans.first { $0.id == id } }
                Text(selected.map { "\($0.icon.map { "\($0) " } ?? "")\($0.name)" } ?? "Not part of a plan")
                    .font(.system(size: 14))
                    .foregroundStyle(selected == nil ? HX.muted : .white)
                Spacer()
                Text("▾").font(.system(size: 11)).foregroundStyle(HX.muted)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(HX.panel)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }

    private func roundSplitsSection(_ count: Int) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: "Round splits", color: HX.accent)
            Text("Time at end of each round (optional)")
                .font(.system(size: 12))
                .foregroundStyle(HX.muted)
            VStack(spacing: 8) {
                ForEach(0..<count, id: \.self) { i in
                    HStack {
                        Text("Round \(i + 1)").font(.system(size: 14))
                        Spacer()
                        TimeInput(valueSec: binding(for: i, in: $roundSplits), compact: true)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(HX.panel)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
        }
    }

    private var amrapSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionLabel(text: "AMRAP result", color: HX.accent)
            HStack(spacing: 8) {
                NumberField(label: "Rounds", value: $amrapFullRounds)
                NumberField(label: "+ Reps", value: $amrapPartialReps)
                NumberField(label: "Cals", value: $amrapCals)
            }
        }
    }

    private func perWindowSection(_ windows: [MultiWindow]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionLabel(text: "Per window", color: HX.accent)
            VStack(spacing: 12) {
                ForEach(Array(windows.enumerated()), id: \.offset) { i, w in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(w.label).font(.system(size: 14, weight: .semibold))
                        HStack(spacing: 8) {
                            NumberField(label: "Rounds", value: windowBinding(i, w.label, \.fullRounds))
                            NumberField(label: "+ Reps", value: windowBinding(i, w.label, \.partialReps))
                        }
                        TextField("Notes for this window", text: Binding(
                            get: { perWindow[i]?.note ?? "" },
                            set: { v in
                                var entry = perWindow[i] ?? AMRAPWindowResult(label: w.label)
                                entry.note = v.isEmpty ? nil : v
                                perWindow[i] = entry
                            }
                        ))
                        .font(.system(size: 14))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(HX.panel2)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .panelCard(6, padding: 12)
                }
            }
        }
    }

    private func intervalsSection(_ count: Int) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: "Per interval", color: HX.accent)
            Text("Reps, cals, or split time per interval")
                .font(.system(size: 12))
                .foregroundStyle(HX.muted)
            VStack(spacing: 8) {
                ForEach(0..<count, id: \.self) { i in
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Interval \(i + 1)").font(.system(size: 12, weight: .semibold))
                        HStack(alignment: .bottom, spacing: 8) {
                            NumberField(label: "Reps", value: intervalBinding(i, \.reps))
                            NumberField(label: "Cals", value: intervalBinding(i, \.cal))
                            VStack(alignment: .leading, spacing: 4) {
                                Text("SPLIT")
                                    .font(.system(size: 10, weight: .medium))
                                    .tracking(1.5)
                                    .foregroundStyle(HX.muted)
                                TimeInput(valueSec: intervalBinding(i, \.valueSec), compact: true)
                            }
                        }
                    }
                    .panelCard(6, padding: 8)
                }
            }
        }
    }

    private func weightsSection(_ target: Target) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: "Weights used", color: HX.accent)
            Text("Pre-filled with the prescribed weight — edit if you used something else")
                .font(.system(size: 12))
                .foregroundStyle(HX.muted)
            VStack(spacing: 8) {
                ForEach(Array(target.exercises.enumerated()), id: \.offset) { i, ex in
                    if !ex.name.hasPrefix("—") {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(ex.name).font(.system(size: 14))
                            TextField(
                                ex.weight.map { formatWeight($0, gender: target.isCustom ? nil : store.profile?.gender) } ?? "Bodyweight / N/A",
                                text: Binding(
                                    get: { exerciseLogs[i]?.weightUsed ?? "" },
                                    set: { v in
                                        var entry = exerciseLogs[i] ?? ExerciseLogEntry(exerciseName: ex.name)
                                        entry.weightUsed = v
                                        exerciseLogs[i] = entry
                                    }
                                ))
                            .font(.system(size: 14))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .background(HX.panel2)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .panelCard(6, padding: 8)
                    }
                }
            }
        }
    }

    private func field<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: label)
            content()
        }
    }

    // MARK: - Bindings into dictionaries

    private func binding(for i: Int, in dict: Binding<[Int: Int]>) -> Binding<Int?> {
        Binding(get: { dict.wrappedValue[i] }, set: { dict.wrappedValue[i] = $0 })
    }

    private func windowBinding(_ i: Int, _ label: String, _ path: WritableKeyPath<AMRAPWindowResult, Int?>) -> Binding<Int?> {
        Binding(
            get: { perWindow[i]?[keyPath: path] },
            set: { v in
                var entry = perWindow[i] ?? AMRAPWindowResult(label: label)
                entry[keyPath: path] = v
                perWindow[i] = entry
            }
        )
    }

    private func intervalBinding(_ i: Int, _ path: WritableKeyPath<IntervalSplit, Int?>) -> Binding<Int?> {
        Binding(
            get: { intervalResults[i]?[keyPath: path] },
            set: { v in
                var entry = intervalResults[i] ?? IntervalSplit(roundIndex: i)
                entry[keyPath: path] = v
                intervalResults[i] = entry
            }
        )
    }

    // MARK: - Save

    private func save(_ target: Target) {
        var log = WorkoutLog(id: savedLogId, date: date, createdAt: createdAt, status: .logged)
        log.totalTimeSec = totalTimeSec
        log.feltLike = felt
        log.intensity = intensity
        log.planId = planId
        log.notes = notes.isEmpty ? nil : notes
        log.modifications = modifications.isEmpty ? nil : modifications
        if target.isCustom {
            log.workoutId = target.id.isEmpty ? nil : target.id
            log.kind = .custom
            log.customName = target.name
            log.workoutSnapshot = snapshot
        } else {
            log.dayId = target.id
        }

        switch target.setup {
        case .rft, .descendingRounds, .rounds:
            let splits = roundSplits.sorted { $0.key < $1.key }
                .map { RoundSplit(roundIndex: $0.key, splitSec: $0.value) }
            if !splits.isEmpty { log.roundSplits = splits }
        case .amrap:
            if amrapFullRounds != nil || amrapPartialReps != nil || amrapCals != nil {
                log.amrap = AMRAPResult(fullRounds: amrapFullRounds, partialReps: amrapPartialReps,
                                        totalCalories: amrapCals)
            }
        case .multiWindowAmrap(let windows):
            let arr = windows.enumerated().map { i, w in
                AMRAPWindowResult(label: w.label,
                                  fullRounds: perWindow[i]?.fullRounds,
                                  partialReps: perWindow[i]?.partialReps,
                                  note: perWindow[i]?.note)
            }
            if arr.contains(where: { $0.fullRounds != nil || $0.partialReps != nil || $0.note != nil }) {
                log.amrap = AMRAPResult(perWindow: arr)
            }
        case .emom, .intervals:
            let splits = intervalResults
                .filter { $0.value.reps != nil || $0.value.cal != nil || $0.value.valueSec != nil || $0.value.note != nil }
                .sorted { $0.key < $1.key }
                .map { IntervalSplit(roundIndex: $0.key, valueSec: $0.value.valueSec,
                                     cal: $0.value.cal, reps: $0.value.reps, note: $0.value.note) }
            if !splits.isEmpty { log.intervals = IntervalResult(splits: splits) }
        default:
            break
        }

        let entries = exerciseLogs
            .filter { !($0.value.weightUsed ?? "").isEmpty || $0.value.repsCompleted != nil || $0.value.result != nil }
            .sorted { $0.key < $1.key }
            .map { i, e in
                var entry = e
                entry.exerciseName = target.exercises[i].name
                return entry
            }
        if !entries.isEmpty { log.exercises = entries }

        store.saveLog(log)
        let becameLogged = log.totalTimeSec != nil
            || !(log.roundSplits ?? []).isEmpty
            || log.amrap != nil
            || !(log.intervals?.splits ?? []).isEmpty
            || !(log.exercises ?? []).isEmpty
            || log.feltLike != nil
            || log.notes != nil
        router.replace(with: .logDetail(logId: log.id, celebrate: becameLogged))
    }
}

// MARK: - Shared form controls

/// Small labeled numeric field (web NumberField).
struct NumberField: View {
    let label: String
    @Binding var value: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .medium))
                .tracking(1.5)
                .foregroundStyle(HX.muted)
            TextField("", text: Binding(
                get: { value.map(String.init) ?? "" },
                set: { value = Int($0.filter(\.isNumber)) }
            ))
            .keyboardType(.numberPad)
            .multilineTextAlignment(.center)
            .font(.system(size: 15))
            .padding(.vertical, 6)
            .frame(maxWidth: .infinity)
            .background(HX.panel2)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }
}

/// Intensity pill group (easy/moderate/hard, toggle to clear).
struct IntensityPills: View {
    @Binding var intensity: Intensity?

    var body: some View {
        HStack(spacing: 8) {
            ForEach(Intensity.allCases, id: \.self) { it in
                let active = intensity == it
                Button {
                    intensity = active ? nil : it
                } label: {
                    Text(it.rawValue.uppercased())
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
    }
}

/// ISO yyyy-MM-dd date field (web <input type=date>).
struct DateField: View {
    @Binding var iso: String

    var body: some View {
        DatePicker("", selection: Binding(
            get: { DateUtils.parseISO(iso) },
            set: { iso = DateUtils.isoDate($0) }
        ), displayedComponents: .date)
        .labelsHidden()
        .colorScheme(.dark)
    }
}

/// Multiline notes box (web textarea).
struct NotesEditor: View {
    @Binding var text: String
    let placeholder: String
    var lines = 3

    var body: some View {
        TextField(placeholder, text: $text, axis: .vertical)
            .lineLimit(lines...max(lines, 8))
            .font(.system(size: 14))
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(HX.panel)
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
