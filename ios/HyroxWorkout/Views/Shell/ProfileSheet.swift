import SwiftUI

// First-run + edit profile — mirrors the web ProfileDialog: first name and
// the weight preference that picks the M/F column of curated weights.
// First-run is mandatory (no cancel, no swipe-dismiss).

struct ProfileSheet: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let firstRun: Bool

    @State private var name = ""
    @State private var gender: Gender?
    @FocusState private var nameFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 4) {
                Text(firstRun ? "Welcome" : "Profile")
                    .font(.display(28))
                    .tracking(-0.5)
                Text(firstRun ? "Set up your profile" : "Edit profile")
                    .font(.system(size: 14))
                    .foregroundStyle(HX.muted)
                Text("Your weight preference picks which prescribed loads you see.")
                    .font(.system(size: 12))
                    .foregroundStyle(HX.muted)
            }

            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "First name")
                TextField("First name", text: $name)
                    .textFieldStyle(HXFieldStyle())
                    .focused($nameFocused)
            }

            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Weight preference")
                HStack(spacing: 10) {
                    genderOption(.M, title: "Men's", caption: "Heavier loads")
                    genderOption(.F, title: "Women's", caption: "Lighter loads")
                }
            }

            HStack(spacing: 12) {
                if !firstRun {
                    Button("Cancel") { dismiss() }
                        .font(.system(size: 15))
                        .foregroundStyle(HX.muted)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(HX.panel2)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .buttonStyle(.plain)
                }
                Button("Save") { save() }
                    .buttonStyle(AccentButtonStyle())
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || gender == nil)
            }

            if !firstRun {
                Button("Sign out") {
                    Task { await store.signOut() }
                }
                .font(.system(size: 13))
                .foregroundStyle(HX.engine)
                .frame(maxWidth: .infinity)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(HX.panel)
        .foregroundStyle(.white)
        .presentationDetents([.medium])
        .presentationDragIndicator(firstRun ? .hidden : .visible)
        .onAppear {
            name = store.profile?.firstName ?? ""
            gender = store.profile?.gender
            if firstRun { nameFocused = true }
        }
    }

    private func genderOption(_ g: Gender, title: String, caption: String) -> some View {
        Button {
            gender = g
        } label: {
            VStack(spacing: 2) {
                Text(title).font(.system(size: 14, weight: .semibold))
                Text(caption).font(.system(size: 11)).foregroundStyle(HX.muted)
            }
            .foregroundStyle(gender == g ? HX.accent : .white)
            .frame(maxWidth: .infinity, minHeight: 56)
            .background(gender == g ? HX.accent.opacity(0.1) : HX.panel2)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(gender == g ? HX.accent : HX.line))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }

    private func save() {
        guard let gender else { return }
        store.saveProfile(UserProfile(firstName: name.trimmingCharacters(in: .whitespaces), gender: gender))
        dismiss()
    }
}
