import SwiftUI

// Floating + button with an action-sheet-style menu, bottom-right of the
// Train tab. Mirrors the web Fab: From plans / New workout / Quick custom /
// Rest day; the + rotates 45° while open; tap outside closes.

struct Fab: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    @State private var open = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if open {
                // Tap-outside-to-close layer.
                Color.black.opacity(0.001)
                    .ignoresSafeArea()
                    .onTapGesture { open = false }
            }

            VStack(alignment: .trailing, spacing: 12) {
                if open {
                    VStack(spacing: 0) {
                        actionRow("📋", "From plans") { router.go(.plan) }
                        Divider().background(HX.line.opacity(0.5))
                        actionRow("🛠️", "New workout") { router.push(.workoutBuilder(editWorkoutId: nil)) }
                        Divider().background(HX.line.opacity(0.5))
                        actionRow("🏀", "Quick custom") { router.push(.customLog(logId: nil, date: nil, planId: nil)) }
                        Divider().background(HX.line.opacity(0.5))
                        actionRow("🛌", "Rest day") { addRest() }
                    }
                    .frame(width: 208)
                    .background(HX.panel)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(HX.line))
                    .shadow(color: .black.opacity(0.4), radius: 16, y: 6)
                    .transition(.scale(scale: 0.9, anchor: .bottomTrailing).combined(with: .opacity))
                }

                Button {
                    withAnimation(.spring(duration: 0.25)) { open.toggle() }
                } label: {
                    Text("+")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(HX.bg)
                        .frame(width: 56, height: 56)
                        .background(HX.accent)
                        .clipShape(Circle())
                        .rotationEffect(.degrees(open ? 45 : 0))
                        .shadow(color: .black.opacity(0.35), radius: 10, y: 4)
                }
                .buttonStyle(.plain)
            }
            .padding(.trailing, 16)
            .padding(.bottom, 16)
        }
    }

    private func actionRow(_ icon: String, _ label: String, action: @escaping () -> Void) -> some View {
        Button {
            open = false
            action()
        } label: {
            HStack(spacing: 12) {
                Text(icon).font(.system(size: 17)).frame(width: 24)
                Text(label).font(.system(size: 14)).foregroundStyle(.white)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func addRest() {
        store.saveLog(WorkoutLog(
            kind: .rest,
            date: DateUtils.todayISO(),
            createdAt: Date().epochMillis,
            status: .logged
        ))
    }
}
