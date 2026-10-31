import SwiftUI

// Quick log for anything outside the plan (web CustomLogPage.tsx): name,
// type, date, time, plan attribution, felt, notes. Always celebrates on save.

struct CustomLogPage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    let logId: String?
    let presetDate: String?
    let presetPlanId: String?

    @State private var savedLogId = ""
    @State private var name = ""
    @State private var typeId: String?
    @State private var date = ""
    @State private var planId: String?
    @State private var createdAt: Double = 0
    @State private var totalTimeSec: Int?
    @State private var felt: FeltLike?
    @State private var notes = ""
    @State private var loaded = false

    private var editing: Bool { logId != nil }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    BackLink(label: "Back") { router.pop() }
                    Text(editing ? "Edit log" : "Quick log")
                        .font(.display(20))
                        .tracking(-0.3)
                    Text("Anything outside the plan: basketball, long run, swim, yoga, etc.")
                        .font(.system(size: 14))
                        .foregroundStyle(HX.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.bottom, 4)
                .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)

                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "What did you do?")
                    TextField("e.g. Basketball, Long run, Swim", text: $name)
                        .textFieldStyle(HXFieldStyle())
                }

                TypePicker(selectedId: $typeId)

                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Date")
                    DateField(iso: $date)
                }

                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Total time")
                    TimeInput(valueSec: $totalTimeSec)
                }

                if !store.activePlans.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        SectionLabel(text: "Part of a plan?")
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
                }

                FeltPicker(value: $felt)

                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Notes")
                    NotesEditor(text: $notes, placeholder: "How did it feel? Anything notable?")
                }
            }
            .padding(16)
            .padding(.bottom, 96)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) {
            SaveBar(label: editing ? "Save changes" : "Save log", enabled: true, action: save)
        }
        .onAppear(perform: load)
    }

    private func load() {
        guard !loaded else { return }
        loaded = true
        if let logId, let l = store.log(id: logId) {
            savedLogId = l.id
            name = l.customName ?? ""
            typeId = l.typeId
            date = l.date
            planId = l.planId
            createdAt = l.createdAt
            totalTimeSec = l.totalTimeSec
            felt = l.feltLike
            notes = l.notes ?? ""
        } else {
            savedLogId = newID()
            date = presetDate ?? DateUtils.todayISO()
            planId = presetPlanId
            createdAt = Date().epochMillis
        }
    }

    private func save() {
        var log = WorkoutLog(id: savedLogId, kind: .custom, date: date, createdAt: createdAt, status: .logged)
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        log.customName = trimmed.isEmpty ? "Custom workout" : trimmed
        log.typeId = typeId
        log.planId = planId
        log.totalTimeSec = totalTimeSec
        log.feltLike = felt
        log.notes = notes.isEmpty ? nil : notes
        store.saveLog(log)
        router.replace(with: .logDetail(logId: log.id, celebrate: true))
    }
}
