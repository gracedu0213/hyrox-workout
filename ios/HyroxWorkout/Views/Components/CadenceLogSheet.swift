import SwiftUI

// Bottom sheet for logging a session toward a cadence plan: its go-to pool as
// one-tap log targets, each tagged to the plan. Shown when a cadence plan has
// 2+ pool workouts (single → logged directly; empty → all workouts).

struct CadenceLogSheet: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    @Environment(\.dismiss) private var dismiss
    let plan: UserPlan

    var body: some View {
        let poolIds = plan.poolSlots.compactMap(\.workoutId)
        let targets: [CustomWorkout] = poolIds.isEmpty
            ? store.customWorkouts
            : poolIds.compactMap { store.workout(id: $0) }.filter { $0.archived != true }

        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    if let icon = plan.icon { Text(icon).font(.system(size: 18)) }
                    Text("Log toward \(plan.name)")
                        .font(.display(18))
                        .tracking(-0.3)
                }
                if poolIds.isEmpty {
                    Text("Pick any workout — it'll count toward this plan.")
                        .font(.system(size: 12))
                        .foregroundStyle(HX.muted)
                }

                if targets.isEmpty {
                    HStack(spacing: 4) {
                        Text("No workouts yet.")
                            .font(.system(size: 14))
                            .foregroundStyle(HX.muted)
                        Button("Build one →") {
                            dismiss()
                            router.push(.workoutBuilder(editWorkoutId: nil))
                        }
                        .font(.system(size: 14))
                        .foregroundStyle(HX.accent)
                    }
                    .padding(.vertical, 8)
                } else {
                    VStack(spacing: 8) {
                        ForEach(targets) { w in
                            Button {
                                dismiss()
                                router.push(.logWorkout(workoutId: w.id, logId: nil, date: nil, planId: plan.id))
                            } label: {
                                HStack(spacing: 12) {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(w.name)
                                            .font(.system(size: 14, weight: .semibold))
                                            .lineLimit(1)
                                        Text(setupSummary(customToSetup(w).setup))
                                            .font(.system(size: 12))
                                            .foregroundStyle(HX.muted)
                                            .lineLimit(1)
                                    }
                                    Spacer()
                                    Text("LOG →")
                                        .font(.system(size: 12, weight: .black))
                                        .tracking(2)
                                        .foregroundStyle(HX.accent)
                                }
                                .padding(12)
                                .background(HX.panel2)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.top, 8)
                }

                Button("View plan details") {
                    dismiss()
                    router.push(.program(planId: plan.id))
                }
                .font(.system(size: 12))
                .foregroundStyle(HX.muted)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }
            .padding(16)
        }
        .background(HX.panel)
        .foregroundStyle(.white)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}
