import SwiftUI

// Create/edit a plan — mirrors web PlanBuilderPage.tsx. Step 1 picks a shape
// (cadence / schedule / flexible); step 2 is the shape-specific editor. The
// web's "save draft + URL round-trip" for creating a workout mid-build is
// unnecessary natively: pushing the workout builder preserves this page's
// state on the stack.

private let PLAN_COLORS = ["#FF6B6B", "#FFD500", "#5BC0EB", "#9B59B6", "#2ECC71", "#FF9B5C", "#E84393"]

enum PlanKind: String, CaseIterable {
    case cadence, schedule, flexible

    var icon: String {
        switch self {
        case .cadence: return "🔥"
        case .schedule: return "📅"
        case .flexible: return "📋"
        }
    }

    var title: String {
        switch self {
        case .cadence: return "Cadence goal"
        case .schedule: return "Weekly schedule"
        case .flexible: return "Flexible list"
        }
    }

    var blurb: String {
        switch self {
        case .cadence: return "Train X times a week"
        case .schedule: return "Pin workouts to days"
        case .flexible: return "Workouts, any day"
        }
    }
}

/// Recover the editor shape from a stored plan when editing.
private func deriveKind(_ p: UserPlan) -> PlanKind {
    switch p.content {
    case .pool: return .cadence
    case .sequenced(let weeks):
        return weeks.contains(where: \.hasDayedSlots) ? .schedule : .flexible
    default: return .cadence
    }
}

struct PlanBuilderPage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let editPlanId: String?

    @State private var planId = ""
    @State private var createdAt: Double = 0
    @State private var active = false
    @State private var curatedContent = false
    @State private var kind: PlanKind?
    @State private var name = ""
    @State private var color = PLAN_COLORS[0]
    @State private var icon = ""
    @State private var goalPerWeek: Int?
    @State private var ongoing = true
    @State private var durationWeeks: Int? = 8
    @State private var startDate = ""
    @State private var weeks: [PlanWeek] = [PlanWeek(slots: [])]
    @State private var loaded = false

    private var editing: Bool { editPlanId != nil }

    // Drop incomplete workout slots (an added row where no workout was picked).
    private var cleanWeeks: [PlanWeek] {
        weeks.map { w in PlanWeek(slots: w.slots.filter { $0.isRest || !($0.workoutId ?? "").isEmpty }) }
    }

    private var hasSlots: Bool { cleanWeeks.contains { !$0.slots.isEmpty } }
    private var goalValid: Bool { (goalPerWeek ?? 0) > 0 }

    // A plan built around a single typed workout wears that type's color.
    private var soleWorkoutAndType: (CustomWorkout, WorkoutType)? {
        let ids = Set(cleanWeeks.flatMap { $0.slots.compactMap(\.workoutId) })
        guard ids.count == 1,
              let w = store.workout(id: ids.first!),
              let t = w.typeId.flatMap({ id in store.sortedTypes.first { $0.id == id } })
        else { return nil }
        return (w, t)
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
            && (curatedContent || (kind == .cadence ? goalValid : hasSlots))
    }

    var body: some View {
        Group {
            if let kind {
                form(kind)
            } else {
                kindChooser
            }
        }
        .onAppear(perform: load)
    }

    private func load() {
        guard !loaded else { return }
        loaded = true
        if let editPlanId, let p = store.plan(id: editPlanId) {
            planId = p.id
            createdAt = p.createdAt
            active = p.active
            name = p.name
            color = p.color
            icon = p.icon ?? ""
            goalPerWeek = p.goalPerWeek
            ongoing = p.durationWeeks == nil
            if let d = p.durationWeeks { durationWeeks = d }
            startDate = p.startDate ?? ""
            kind = deriveKind(p)
            switch p.content {
            case .sequenced(let ws): weeks = ws.isEmpty ? [PlanWeek(slots: [])] : ws
            case .pool(let slots): weeks = [PlanWeek(slots: slots)]
            case .curated: curatedContent = true
            default: break
            }
        } else {
            planId = newID()
            createdAt = Date().epochMillis
        }
    }

    // --- Step 1: pick a plan shape (new plans only) ---
    private var kindChooser: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    BackLink(label: "Plans") { router.pop() }
                    Text("Build a plan").font(.display(20)).tracking(-0.3)
                    Text("Pick a shape — you can change the details after.")
                        .font(.system(size: 14))
                        .foregroundStyle(HX.muted)
                }
                .padding(.bottom, 4)

                ForEach(PlanKind.allCases, id: \.self) { k in
                    Button {
                        kind = k
                    } label: {
                        HStack(spacing: 16) {
                            Text(k.icon).font(.system(size: 28))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(k.title).font(.display(17)).tracking(-0.3)
                                Text(k.blurb).font(.system(size: 14)).foregroundStyle(HX.muted)
                            }
                            Spacer()
                            Text("›").font(.system(size: 20)).foregroundStyle(HX.muted)
                        }
                        .padding(16)
                        .background(HX.panel)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
        }
    }

    // --- Step 2: the shape-specific form ---
    private func form(_ kind: PlanKind) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    if editing {
                        BackLink(label: "Plans") { router.pop() }
                    } else {
                        BackLink(label: "Plan type") { self.kind = nil }
                    }
                    HStack(spacing: 8) {
                        Text(kind.icon)
                        Text(editing ? "Edit plan" : kind.title)
                    }
                    .font(.display(20))
                    .tracking(-0.3)
                    if !editing {
                        Text(kind.blurb).font(.system(size: 14)).foregroundStyle(HX.muted)
                    }
                }
                .padding(.bottom, 4)
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)

                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Name")
                    TextField(kind == .cadence ? "e.g. Run 5×/week" : "e.g. Strength block", text: $name)
                        .textFieldStyle(HXFieldStyle())
                }

                HStack(alignment: .top, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        SectionLabel(text: "Color")
                        if let (w, t) = soleWorkoutAndType {
                            HStack(spacing: 8) {
                                Circle().fill(Color(hex: t.color)).frame(width: 28, height: 28)
                                Text("from \(w.name) · \(t.name)")
                                    .font(.system(size: 12))
                                    .foregroundStyle(HX.muted)
                            }
                        } else {
                            HStack(spacing: 8) {
                                ForEach(PLAN_COLORS, id: \.self) { c in
                                    Button {
                                        color = c
                                    } label: {
                                        Circle()
                                            .fill(Color(hex: c))
                                            .frame(width: 28, height: 28)
                                            .overlay {
                                                if color == c {
                                                    Circle().stroke(.white, lineWidth: 2).padding(-3)
                                                }
                                            }
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        SectionLabel(text: "Icon")
                        TextField(kind.icon, text: $icon)
                            .textFieldStyle(HXFieldStyle())
                            .frame(width: 64)
                            .multilineTextAlignment(.center)
                            .onChange(of: icon) { _, v in icon = String(v.prefix(2)) }
                    }
                }

                if curatedContent {
                    VStack(alignment: .leading, spacing: 8) {
                        SectionLabel(text: "Content", color: HX.accent)
                        Text("This is the curated 12-week program — its content is fixed.")
                            .font(.system(size: 14))
                            .foregroundStyle(HX.muted)
                    }
                } else if kind == .cadence {
                    cadenceSections
                } else {
                    weeksSections(kind)
                }
            }
            .padding(16)
            .padding(.bottom, 96)
        }
        .safeAreaInset(edge: .bottom) {
            SaveBar(label: editing ? "Save changes" : "Save plan", enabled: canSave, action: save)
        }
    }

    private var cadenceSections: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Weekly goal", color: HX.accent)
                HStack(spacing: 12) {
                    NumberBox(value: $goalPerWeek, placeholder: "5")
                    Text("sessions / week").font(.system(size: 14)).foregroundStyle(HX.muted)
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Duration", color: HX.accent)
                HStack(spacing: 8) {
                    stripPill("Ongoing", selected: ongoing) { ongoing = true }
                    stripPill("Fixed weeks", selected: !ongoing) { ongoing = false }
                }
                if !ongoing {
                    HStack(spacing: 12) {
                        NumberBox(value: $durationWeeks, placeholder: "8")
                        Text("weeks").font(.system(size: 14)).foregroundStyle(HX.muted)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Go-to workouts", color: HX.accent)
                Text("Optional — workouts you reach for to hit the goal. Log any of them, any day, to build your streak.")
                    .font(.system(size: 12))
                    .foregroundStyle(HX.muted)
                anytimeRows(0).panelCard(8, padding: 12)
            }
        }
    }

    private func weeksSections(_ kind: PlanKind) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                SectionLabel(text: kind == .schedule ? "Schedule" : "Workouts", color: HX.accent)
                Text(kind == .schedule
                     ? "Pin a workout (or rest) to each day you train."
                     : "List the workouts for the week — do them any day.")
                    .font(.system(size: 12))
                    .foregroundStyle(HX.muted)
            }

            if kind == .schedule {
                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Start date")
                    StartDateField(startDate: $startDate)
                    Text("Optional — pins weeks to real dates.")
                        .font(.system(size: 10))
                        .foregroundStyle(HX.muted)
                }
            }

            ForEach(weeks.indices, id: \.self) { wi in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Week \(wi + 1)").font(.system(size: 14, weight: .semibold))
                        Spacer()
                        if weeks.count > 1 {
                            Button("Remove") { weeks.remove(at: wi) }
                                .font(.system(size: 12))
                                .foregroundStyle(.red.opacity(0.8))
                                .buttonStyle(.plain)
                        }
                    }
                    if kind == .schedule {
                        VStack(spacing: 6) {
                            ForEach(WEEKDAYS_7, id: \.self) { dow in
                                HStack(spacing: 8) {
                                    Text(dow.label)
                                        .font(.system(size: 12, weight: .black))
                                        .tracking(2)
                                        .foregroundStyle(HX.muted)
                                        .frame(width: 36, alignment: .leading)
                                    daySlotPicker(wi, dow)
                                }
                            }
                        }
                    } else {
                        anytimeRows(wi)
                    }
                }
                .panelCard(8, padding: 12)
            }

            Button("+ Add week") { weeks.append(PlanWeek(slots: [])) }
                .font(.system(size: 14))
                .foregroundStyle(HX.muted)
                .frame(maxWidth: .infinity, minHeight: 40)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(HX.line))
                .buttonStyle(.plain)
        }
    }

    // Shared "pick a workout / make a new one" rows used by cadence + flexible.
    private func anytimeRows(_ wi: Int) -> some View {
        let anytime = weeks[wi].anytimeSlots
        return VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(anytime.enumerated()), id: \.offset) { n, slot in
                HStack(spacing: 8) {
                    workoutPicker(selectedId: slot.workoutId ?? "") { id in
                        setAnytime(wi, n, workoutId: id)
                    }
                    Button("×") { removeAnytime(wi, n) }
                        .font(.system(size: 18))
                        .foregroundStyle(HX.muted)
                        .buttonStyle(.plain)
                }
            }
            Button("+ Add workout") {
                weeks[wi].slots.append(.workout(workoutId: "", dayOfWeek: nil))
            }
            .font(.system(size: 14))
            .foregroundStyle(HX.accent)
            .buttonStyle(.plain)
            .padding(.top, 2)
        }
    }

    /// The web's <select> as a Menu: — / 🛌 Rest / workouts / + Create new.
    private func daySlotPicker(_ wi: Int, _ dow: DayOfWeek) -> some View {
        let slot = weeks[wi].slot(for: dow)
        let label = slot == nil ? "—" : slot!.isRest ? "🛌 Rest"
            : store.workout(id: slot!.workoutId ?? "")?.name ?? "Workout removed"
        return Menu {
            Button("—") { weeks[wi] = weeks[wi].withDaySlot(dow, nil) }
            Button("🛌 Rest") { weeks[wi] = weeks[wi].withDaySlot(dow, .rest(dayOfWeek: dow)) }
            ForEach(store.customWorkouts) { w in
                Button(w.name) { weeks[wi] = weeks[wi].withDaySlot(dow, .workout(workoutId: w.id, dayOfWeek: dow)) }
            }
            Button("+ Create new workout…") { router.push(.workoutBuilder(editWorkoutId: nil)) }
        } label: {
            pickerLabel(label, empty: slot == nil)
        }
    }

    private func workoutPicker(selectedId: String, onPick: @escaping (String) -> Void) -> some View {
        let name = store.workout(id: selectedId)?.name
        return Menu {
            ForEach(store.customWorkouts) { w in
                Button(w.name) { onPick(w.id) }
            }
            Button("+ Create new workout…") { router.push(.workoutBuilder(editWorkoutId: nil)) }
        } label: {
            pickerLabel(name ?? "— pick a workout —", empty: name == nil)
        }
    }

    private func pickerLabel(_ text: String, empty: Bool) -> some View {
        HStack {
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(empty ? HX.muted : .white)
                .lineLimit(1)
            Spacer()
            Text("▾").font(.system(size: 11)).foregroundStyle(HX.muted)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(HX.panel2)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func stripPill(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label.uppercased())
                .font(.system(size: 12, weight: .semibold))
                .tracking(1)
                .foregroundStyle(selected ? HX.bg : HX.muted)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(selected ? HX.accent : .clear)
                .overlay(Capsule().stroke(selected ? HX.accent : HX.line))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func setAnytime(_ wi: Int, _ n: Int, workoutId: String) {
        let target = weeks[wi].anytimeSlots[n]
        weeks[wi] = PlanWeek(slots: weeks[wi].slots.map {
            $0 == target ? .workout(workoutId: workoutId, dayOfWeek: nil) : $0
        })
    }

    private func removeAnytime(_ wi: Int, _ n: Int) {
        let target = weeks[wi].anytimeSlots[n]
        if let i = weeks[wi].slots.firstIndex(of: target) {
            weeks[wi].slots.remove(at: i)
        }
    }

    private func save() {
        guard canSave, let kind else { return }
        let cadence = kind == .cadence
        let clean = cleanWeeks
        var content: PlanContent?
        if curatedContent {
            content = .curated
        } else if cadence {
            let pool = clean.first?.slots ?? []
            content = pool.isEmpty ? nil : .pool(slots: pool)
        } else if hasSlots {
            content = .sequenced(weeks: clean)
        }
        let plan = UserPlan(
            id: planId,
            name: name.trimmingCharacters(in: .whitespaces),
            color: soleWorkoutAndType?.1.color ?? color,
            icon: icon.trimmingCharacters(in: .whitespaces).isEmpty ? nil : icon.trimmingCharacters(in: .whitespaces),
            content: content,
            goalPerWeek: cadence && goalValid ? goalPerWeek : nil,
            durationWeeks: cadence && !ongoing && (durationWeeks ?? 0) > 0 ? durationWeeks : nil,
            startDate: kind == .schedule && !startDate.isEmpty ? startDate : nil,
            active: active,
            createdAt: createdAt,
            archived: nil
        )
        store.savePlan(plan)
        router.pop()
    }
}

/// Numeric entry box (web NumberBox): selects-all on focus via a fresh field.
struct NumberBox: View {
    @Binding var value: Int?
    var placeholder = ""
    var width: CGFloat = 80

    var body: some View {
        TextField(placeholder, text: Binding(
            get: { value.map(String.init) ?? "" },
            set: { value = Int($0.filter(\.isNumber)) }
        ))
        .keyboardType(.numberPad)
        .multilineTextAlignment(.center)
        .font(.system(size: 17))
        .padding(.vertical, 8)
        .frame(width: width)
        .background(HX.panel)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

/// Optional ISO start-date field: unset shows a set button, set shows a
/// DatePicker + clear.
private struct StartDateField: View {
    @Binding var startDate: String

    var body: some View {
        HStack(spacing: 8) {
            if startDate.isEmpty {
                Button("Set start date") { startDate = DateUtils.todayISO() }
                    .font(.system(size: 14))
                    .foregroundStyle(HX.accent)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .background(HX.panel)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .buttonStyle(.plain)
            } else {
                DatePicker("", selection: Binding(
                    get: { DateUtils.parseISO(startDate) },
                    set: { startDate = DateUtils.isoDate($0) }
                ), displayedComponents: .date)
                .labelsHidden()
                .colorScheme(.dark)
                Button("×") { startDate = "" }
                    .font(.system(size: 18))
                    .foregroundStyle(HX.muted)
                    .buttonStyle(.plain)
            }
        }
    }
}

/// Fixed bottom save bar sitting flush atop the tab bar (web save bars).
struct SaveBar: View {
    let label: String
    let enabled: Bool
    let action: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Rectangle().fill(HX.line).frame(height: 1)
            Button(action: action) {
                Text(label.uppercased())
                    .font(.system(size: 14, weight: .semibold))
                    .tracking(1.5)
                    .foregroundStyle(HX.bg)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(HX.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .disabled(!enabled)
            .opacity(enabled ? 1 : 0.4)
            .padding(12)
        }
        .background(HX.bg)
    }
}
