import SwiftUI

// Create/edit a custom workout (web WorkoutBuilderPage.tsx): name, type,
// format pills (+ per-format timing controls), the block/row editor (exercise
// rows with qty/unit/weight, rest rows, repeat counts, standalone rest
// blocks), intensity, notes — with a live setup-summary preview.

private let UNITS: [TargetUnit] = [.reps, .meters, .feet, .calories, .seconds, .minutes, .miles, .failure, .max]

/// Editable mirror of WorkoutFormat, split into fields for the form.
private enum FormatType: String, CaseIterable {
    case rounds, forTime = "for_time", amrap, emom, intervals

    var label: String {
        switch self {
        case .rounds: return "Rounds"
        case .forTime: return "For Time"
        case .amrap: return "AMRAP"
        case .emom: return "EMOM"
        case .intervals: return "Intervals"
        }
    }
}

struct WorkoutBuilderPage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let editWorkoutId: String?

    @State private var workoutId = ""
    @State private var createdAt: Double = 0
    @State private var name = ""
    @State private var formatType: FormatType = .rounds
    @State private var amrapSec: Int? = 20 * 60
    @State private var emomEverySec: Int? = 60
    @State private var emomTotal: Int? = 10
    @State private var intervalRounds: Int? = 5
    @State private var intervalWorkSec: Int?
    @State private var intervalRestSec: Int?
    @State private var blocks: [Block] = [emptyBlock()]
    @State private var intensity: Intensity?
    @State private var notes = ""
    @State private var typeId: String?
    @State private var loaded = false

    private var editing: Bool { editWorkoutId != nil }

    private static func emptyBlock() -> Block {
        Block(label: nil, repeatCount: 1, rows: [.exercise(ExSpec(name: "", unit: .reps))])
    }

    var body: some View {
        let clean = cleanBlocks()
        let canSave = !name.trimmingCharacters(in: .whitespaces).isEmpty && clean.contains(where: \.hasWork)
        let preview = setupSummary(customToSetup(CustomWorkout(
            id: workoutId, name: name, format: buildFormat(),
            blocks: clean.isEmpty ? blocks : clean,
            typeId: typeId, intensity: intensity, notes: [], createdAt: createdAt, archived: nil
        )).setup)
        let multiWork = blocks.filter(\.hasWork).count > 1

        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    BackLink(label: editing ? "Back" : "Workouts") { router.pop() }
                    Text(editing ? "Edit workout" : "New workout")
                        .font(.display(20))
                        .tracking(-0.3)
                    Text(preview).font(.system(size: 14)).foregroundStyle(HX.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.bottom, 4)
                .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)

                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Name")
                    TextField("e.g. Deadhang circuit, Easy run", text: $name)
                        .textFieldStyle(HXFieldStyle())
                }

                TypePicker(selectedId: $typeId)

                formatSection

                blocksSection(multiWork: multiWork)

                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Intensity")
                    IntensityPills(intensity: $intensity)
                }

                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Notes")
                    NotesEditor(text: $notes, placeholder: "One note per line")
                }
            }
            .padding(16)
            .padding(.bottom, 96)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) {
            SaveBar(label: editing ? "Save changes" : "Save workout", enabled: canSave, action: save)
        }
        .onAppear(perform: load)
    }

    private func load() {
        guard !loaded else { return }
        loaded = true
        if let editWorkoutId, let w = store.workout(id: editWorkoutId) {
            workoutId = w.id
            createdAt = w.createdAt
            name = w.name
            switch w.format {
            case .rounds: formatType = .rounds
            case .forTime: formatType = .forTime
            case .amrap(let d): formatType = .amrap; amrapSec = d
            case .emom(let every, let total): formatType = .emom; emomEverySec = every; emomTotal = total
            case .intervals(let r, let work, let rest):
                formatType = .intervals; intervalRounds = r; intervalWorkSec = work; intervalRestSec = rest
            }
            blocks = w.blocks.isEmpty ? [Self.emptyBlock()] : w.blocks
            typeId = w.typeId
            intensity = w.intensity
            notes = w.notes.joined(separator: "\n")
        } else {
            workoutId = newID()
            createdAt = Date().epochMillis
        }
    }

    // MARK: - Format

    private var formatSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionLabel(text: "Format")
            FlowLayout(hSpacing: 8, vSpacing: 8) {
                ForEach(FormatType.allCases, id: \.self) { f in
                    let active = formatType == f
                    Button {
                        formatType = f
                    } label: {
                        Text(f.label.uppercased())
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

            switch formatType {
            case .amrap:
                HStack(spacing: 12) {
                    Text("Duration").font(.system(size: 14)).foregroundStyle(HX.muted)
                    TimeInput(valueSec: $amrapSec)
                }
            case .emom:
                HStack(spacing: 8) {
                    Text("Every").font(.system(size: 14)).foregroundStyle(HX.muted)
                    TimeInput(valueSec: $emomEverySec, compact: true)
                    Text("×").font(.system(size: 14)).foregroundStyle(HX.muted)
                    NumberBox(value: $emomTotal, width: 64)
                    Text("rounds").font(.system(size: 14)).foregroundStyle(HX.muted)
                }
            case .intervals:
                HStack(spacing: 8) {
                    NumberBox(value: $intervalRounds, width: 64)
                    Text("rounds ·").font(.system(size: 14)).foregroundStyle(HX.muted)
                    Text("work").font(.system(size: 14)).foregroundStyle(HX.muted)
                    TimeInput(valueSec: $intervalWorkSec, compact: true)
                    Text("rest").font(.system(size: 14)).foregroundStyle(HX.muted)
                    TimeInput(valueSec: $intervalRestSec, compact: true)
                }
            default:
                EmptyView()
            }
        }
    }

    private func buildFormat() -> WorkoutFormat {
        switch formatType {
        case .amrap: return .amrap(durationSec: amrapSec ?? 0)
        case .emom: return .emom(everySec: emomEverySec ?? 60, totalRounds: emomTotal ?? 1)
        case .intervals: return .intervals(rounds: intervalRounds ?? 1, workSec: intervalWorkSec, restSec: intervalRestSec)
        case .forTime: return .forTime
        case .rounds: return .rounds
        }
    }

    // MARK: - Blocks editor

    private func blocksSection(multiWork: Bool) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionLabel(text: "Exercises", color: HX.accent)
            ForEach(blocks.indices, id: \.self) { bi in
                if blocks[bi].hasWork {
                    workBlock(bi, multiWork: multiWork)
                } else {
                    standaloneRestBlock(bi)
                }
            }
            HStack(spacing: 8) {
                addFooterButton("+ Add block") { blocks.append(Self.emptyBlock()) }
                addFooterButton("+ Add rest") {
                    blocks.append(Block(label: nil, repeatCount: 1, rows: [.rest(restSec: 60)]))
                }
            }
        }
    }

    private func standaloneRestBlock(_ bi: Int) -> some View {
        HStack(spacing: 8) {
            Text("Rest").font(.system(size: 14, weight: .semibold))
            Spacer()
            TimeInput(valueSec: restBinding(bi, 0), compact: true)
            Button("Remove") { blocks.remove(at: bi) }
                .font(.system(size: 12))
                .foregroundStyle(.red.opacity(0.8))
                .buttonStyle(.plain)
        }
        .panelCard(8, padding: 12)
    }

    private func workBlock(_ bi: Int, multiWork: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                if multiWork {
                    TextField("Block \(bi + 1)", text: Binding(
                        get: { blocks[bi].label ?? "" },
                        set: { blocks[bi].label = $0.isEmpty ? nil : $0 }
                    ))
                    .font(.system(size: 14))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(HX.panel2)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                } else {
                    Text("Rounds").font(.system(size: 14, weight: .semibold))
                    Spacer()
                }
                Text("×").font(.system(size: 12)).foregroundStyle(HX.muted)
                NumberBox(value: Binding(
                    get: { blocks[bi].repeatCount },
                    set: { blocks[bi].repeatCount = $0 ?? 1 }
                ), width: 56)
                if blocks.count > 1 {
                    Button("Remove") { blocks.remove(at: bi) }
                        .font(.system(size: 12))
                        .foregroundStyle(.red.opacity(0.8))
                        .buttonStyle(.plain)
                }
            }

            VStack(spacing: 8) {
                ForEach(blocks[bi].rows.indices, id: \.self) { ri in
                    rowEditor(bi, ri)
                }
            }

            HStack(spacing: 16) {
                Button("+ Add exercise") {
                    blocks[bi].rows.append(.exercise(ExSpec(name: "", unit: .reps)))
                }
                Button("+ Add rest") {
                    blocks[bi].rows.append(.rest(restSec: 60))
                }
            }
            .font(.system(size: 14))
            .foregroundStyle(HX.accent)
            .buttonStyle(.plain)
        }
        .panelCard(8, padding: 12)
    }

    @ViewBuilder
    private func rowEditor(_ bi: Int, _ ri: Int) -> some View {
        switch blocks[bi].rows[ri] {
        case .rest:
            HStack(spacing: 8) {
                Text("Rest").font(.system(size: 14)).foregroundStyle(HX.muted)
                Spacer()
                TimeInput(valueSec: restBinding(bi, ri), compact: true)
                removeRowButton(bi, ri)
            }
            .padding(8)
            .background(HX.panel2)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        case .exercise(let ex):
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    TextField("Exercise (e.g. Deadhang, Run)", text: exerciseBinding(bi, ri, \.name))
                        .font(.system(size: 14))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(HX.bg)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    removeRowButton(bi, ri)
                }
                HStack(spacing: 8) {
                    let noQty = ex.unit == .failure || ex.unit == .max
                    if !noQty {
                        NumberBox(value: Binding(
                            get: { exSpec(bi, ri)?.qty.map { Int($0) } },
                            set: { v in mutateExercise(bi, ri) { $0.qty = v.map(Double.init) } }
                        ), placeholder: "qty", width: 56)
                    }
                    Menu {
                        ForEach(UNITS, id: \.self) { u in
                            Button(u.rawValue) { mutateExercise(bi, ri) { $0.unit = u } }
                        }
                    } label: {
                        Text(ex.unit?.rawValue ?? "reps")
                            .font(.system(size: 13))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .background(HX.bg)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    if let weight = ex.weight {
                        NumberBox(value: Binding(
                            get: { weight.value > 0 ? Int(weight.value) : nil },
                            set: { v in mutateExercise(bi, ri) {
                                $0.weight = SingleWeight(value: Double(v ?? 0), unit: $0.weight?.unit ?? .kg)
                            } }
                        ), placeholder: "wt", width: 56)
                        Menu {
                            Button("kg") { mutateExercise(bi, ri) {
                                $0.weight = SingleWeight(value: $0.weight?.value ?? 0, unit: .kg) } }
                            Button("lb") { mutateExercise(bi, ri) {
                                $0.weight = SingleWeight(value: $0.weight?.value ?? 0, unit: .lb) } }
                        } label: {
                            Text(weight.unit.rawValue)
                                .font(.system(size: 13))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 6)
                                .background(HX.bg)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        Button("remove") { mutateExercise(bi, ri) { $0.weight = nil } }
                            .font(.system(size: 12))
                            .foregroundStyle(HX.muted)
                            .buttonStyle(.plain)
                    } else {
                        Button("+ weight") { mutateExercise(bi, ri) {
                            $0.weight = SingleWeight(value: 0, unit: .kg) } }
                            .font(.system(size: 12))
                            .foregroundStyle(HX.accent)
                            .buttonStyle(.plain)
                    }
                    Spacer()
                }
            }
            .padding(8)
            .background(HX.panel2)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }

    private func removeRowButton(_ bi: Int, _ ri: Int) -> some View {
        Button("×") { blocks[bi].rows.remove(at: ri) }
            .font(.system(size: 18))
            .foregroundStyle(HX.muted)
            .buttonStyle(.plain)
    }

    private func addFooterButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(label, action: action)
            .font(.system(size: 14))
            .foregroundStyle(HX.muted)
            .frame(maxWidth: .infinity, minHeight: 40)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(HX.line))
            .buttonStyle(.plain)
    }

    // MARK: - Row plumbing

    private func exSpec(_ bi: Int, _ ri: Int) -> ExSpec? {
        blocks[bi].rows[ri].exercise
    }

    private func restBinding(_ bi: Int, _ ri: Int) -> Binding<Int?> {
        Binding(
            get: {
                if case .rest(let s) = blocks[bi].rows[ri] { return s }
                return nil
            },
            set: { blocks[bi].rows[ri] = .rest(restSec: $0 ?? 0) }
        )
    }

    private func exerciseBinding(_ bi: Int, _ ri: Int, _ path: WritableKeyPath<ExSpec, String>) -> Binding<String> {
        Binding(
            get: { exSpec(bi, ri)?[keyPath: path] ?? "" },
            set: { v in mutateExercise(bi, ri) { $0[keyPath: path] = v } }
        )
    }

    /// Mutate an exercise row in place.
    private func mutateExercise(_ bi: Int, _ ri: Int, _ mutate: (inout ExSpec) -> Void) {
        guard var spec = exSpec(bi, ri) else { return }
        mutate(&spec)
        blocks[bi].rows[ri] = .exercise(spec)
    }

    // MARK: - Save

    /// Strip empty rows/weights/blocks — mirrors web cleanBlocks().
    private func cleanBlocks() -> [Block] {
        blocks
            .map { b in
                var out = b
                out.rows = b.rows
                    .filter { row in
                        switch row {
                        case .rest(let s): return s > 0
                        case .exercise(let e): return !e.name.trimmingCharacters(in: .whitespaces).isEmpty
                        }
                    }
                    .map { row in
                        if case .exercise(var e) = row {
                            if let w = e.weight, w.value <= 0 { e.weight = nil }
                            return .exercise(e)
                        }
                        return row
                    }
                return out
            }
            .filter { !$0.rows.isEmpty }
    }

    private func save() {
        let workout = CustomWorkout(
            id: workoutId,
            name: name.trimmingCharacters(in: .whitespaces),
            format: buildFormat(),
            blocks: cleanBlocks().map { b in
                var out = b
                out.repeatCount = max(1, b.repeatCount)
                out.label = b.label?.trimmingCharacters(in: .whitespaces).isEmpty == true ? nil : b.label
                return out
            },
            typeId: typeId,
            intensity: intensity,
            notes: notes.split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty },
            createdAt: createdAt,
            archived: nil
        )
        store.saveWorkout(workout)
        router.pop()
    }
}
