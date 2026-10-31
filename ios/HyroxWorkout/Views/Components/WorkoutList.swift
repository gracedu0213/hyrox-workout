import SwiftUI

// Browse list of custom workouts (Plan tab). Tapping a row opens its detail;
// the ⋯ menu offers Edit/Delete. Mirrors web WorkoutList.tsx.

/// Intensity tints the left bar, mirroring the plan rows' color accent.
let INTENSITY_COLOR: [Intensity: String] = [
    .easy: "#2ECC71",
    .moderate: "#FFD500",
    .hard: "#FF6B6B",
]

struct WorkoutList: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    @State private var confirmDelete: CustomWorkout?

    var body: some View {
        let workouts = store.customWorkouts
        if workouts.isEmpty {
            HStack(spacing: 4) {
                Text("No custom workouts yet.")
                    .foregroundStyle(HX.muted)
                Button("Build your first →") {
                    router.push(.workoutBuilder(editWorkoutId: nil))
                }
                .foregroundStyle(HX.accent)
            }
            .font(.system(size: 14))
        } else {
            VStack(spacing: 8) {
                ForEach(workouts) { w in
                    row(w)
                }
            }
            .alert(item: $confirmDelete) { w in
                Alert(
                    title: Text("Delete \"\(w.name)\"?"),
                    message: Text("Past logs are kept."),
                    primaryButton: .destructive(Text("Delete")) { store.deleteWorkout(id: w.id) },
                    secondaryButton: .cancel()
                )
            }
        }
    }

    private func row(_ w: CustomWorkout) -> some View {
        let type = w.typeId.flatMap { id in store.sortedTypes.first { $0.id == id } }
        let intensityHex = w.intensity.flatMap { INTENSITY_COLOR[$0] }
        let barColor = Color(hex: type?.color ?? intensityHex ?? "#5BC0EB")

        return HStack(spacing: 8) {
            Capsule().fill(barColor).frame(width: 4, height: 40)
            Button {
                router.push(.workoutDetail(workoutId: w.id, planId: nil, date: nil))
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(w.name)
                        .font(.display(17))
                        .tracking(-0.3)
                        .lineLimit(1)
                    HStack(spacing: 8) {
                        Text(setupSummary(customToSetup(w).setup))
                            .foregroundStyle(HX.muted)
                        if let type {
                            Text(type.name.uppercased())
                                .tracking(1)
                                .foregroundStyle(Color(hex: type.color))
                        }
                        if let intensity = w.intensity, let intensityHex {
                            Text(intensity.rawValue.uppercased())
                                .tracking(1)
                                .foregroundStyle(Color(hex: intensityHex))
                        }
                    }
                    .font(.system(size: 12))
                    .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            MoreMenu(items: [
                MoreMenuItem(label: "Edit") { router.push(.workoutBuilder(editWorkoutId: w.id)) },
                MoreMenuItem(label: "Delete", destructive: true) { confirmDelete = w },
            ])
        }
        .padding(12)
        .background(HX.panel)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
