import SwiftUI

// Workout-type chips + inline create/edit. Selected chip tints with the
// type's color; tap toggles; "+ New type" and "✎ Edit type" open the inline
// form with the shared palette. Mirrors TypePicker.tsx (colors resolve live —
// editing a type recolors past logs).

private let TYPE_COLORS = ["#5BC0EB", "#2ECC71", "#FF6B6B", "#9B59B6", "#F0E040", "#FF9F43", "#FF6BB5", "#4ADEDE"]

struct TypePicker: View {
    @EnvironmentObject private var store: AppStore
    @Binding var selectedId: String?

    @State private var editing = false          // form visible
    @State private var editingExisting = false  // editing the selected type
    @State private var formName = ""
    @State private var formColor = TYPE_COLORS[0]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionLabel(text: "Type")
            FlowLayout(hSpacing: 8, vSpacing: 8) {
                ForEach(store.sortedTypes) { t in
                    chip(t)
                }
                Button("+ New type") {
                    editingExisting = false
                    formName = ""
                    formColor = TYPE_COLORS[0]
                    editing = true
                }
                .font(.system(size: 12))
                .foregroundStyle(HX.accent)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .overlay(Capsule().stroke(style: StrokeStyle(lineWidth: 1, dash: [4, 3])).foregroundStyle(HX.accent.opacity(0.6)))
                .buttonStyle(.plain)

                if let selected = selectedType {
                    Button("✎ Edit type") {
                        editingExisting = true
                        formName = selected.name
                        formColor = selected.color
                        editing = true
                    }
                    .font(.system(size: 12))
                    .foregroundStyle(HX.muted)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .buttonStyle(.plain)
                }
            }

            if editing {
                form
            }
        }
    }

    private var selectedType: WorkoutType? {
        selectedId.flatMap { id in store.sortedTypes.first { $0.id == id } }
    }

    private func chip(_ t: WorkoutType) -> some View {
        let selected = selectedId == t.id
        let color = Color(hex: t.color)
        return Button {
            selectedId = selected ? nil : t.id
        } label: {
            HStack(spacing: 5) {
                Circle().fill(color).frame(width: 7, height: 7)
                Text(t.name)
                    .font(.system(size: 12))
                    .foregroundStyle(selected ? color : HX.muted)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(selected ? color.opacity(0.1) : HX.panel2)
            .overlay(Capsule().stroke(selected ? color : HX.line))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: 10) {
            TextField("Type name", text: $formName)
                .textFieldStyle(HXFieldStyle())
            HStack(spacing: 8) {
                ForEach(TYPE_COLORS, id: \.self) { c in
                    Button {
                        formColor = c
                    } label: {
                        Circle()
                            .fill(Color(hex: c))
                            .frame(width: 24, height: 24)
                            .overlay {
                                if formColor == c {
                                    Circle().stroke(.white, lineWidth: 2).padding(-3)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                }
            }
            HStack(spacing: 12) {
                Button(editingExisting ? "Save" : "Create") { submit() }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color(hex: formColor))
                    .disabled(formName.trimmingCharacters(in: .whitespaces).isEmpty)
                Button("Cancel") { editing = false }
                    .font(.system(size: 13))
                    .foregroundStyle(HX.muted)
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(HX.panel)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func submit() {
        let name = formName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        if editingExisting, var t = selectedType {
            t.name = name
            t.color = formColor
            store.saveType(t)
        } else {
            let t = WorkoutType(id: newID(), name: name, color: formColor, createdAt: Date().epochMillis)
            store.saveType(t)
            selectedId = t.id
        }
        editing = false
    }
}
