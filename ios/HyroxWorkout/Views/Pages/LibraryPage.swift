import SwiftUI

// The Plan tab root — every committable plan (curated merged in) + custom
// workouts. Mirrors web LibraryPage.tsx.

struct LibraryPage: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router

    var body: some View {
        let merged = withCurated(store.visiblePlans)
        let programs = merged.filter { $0.weekCount > 0 || $0.goalPerWeek != nil }

        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Plan")
                        .font(.display(44))
                        .tracking(-1.3)
                        .gradientText()
                    Text("All your plans and workouts.")
                        .font(.system(size: 14))
                        .foregroundStyle(HX.muted)
                }

                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .lastTextBaseline) {
                        SectionLabel(text: "Plans")
                        Spacer()
                        Button("+ Build a plan") { router.push(.planBuilder(editPlanId: nil)) }
                            .font(.system(size: 12))
                            .foregroundStyle(HX.accent)
                            .buttonStyle(.plain)
                    }
                    VStack(spacing: 8) {
                        ForEach(programs) { planRow($0) }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .lastTextBaseline) {
                        SectionLabel(text: "Workouts")
                        Spacer()
                        Button("+ New workout") { router.push(.workoutBuilder(editWorkoutId: nil)) }
                            .font(.system(size: 12))
                            .foregroundStyle(HX.accent)
                            .buttonStyle(.plain)
                    }
                    WorkoutList()
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 20)
            .padding(.bottom, 128)
        }
    }

    private func planRow(_ p: UserPlan) -> some View {
        HStack(spacing: 12) {
            Capsule().fill(Color(hex: p.color)).frame(width: 4, height: 40)
            Button {
                router.push(.program(planId: p.id))
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        if let icon = p.icon { Text(icon) }
                        Text(p.name)
                            .font(.display(17))
                            .tracking(-0.3)
                            .lineLimit(1)
                    }
                    Text(p.subtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(HX.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if p.active {
                Text("ACTIVE ✓")
                    .font(.system(size: 10, weight: .black))
                    .tracking(2)
                    .foregroundStyle(HX.accent)
            } else {
                Button {
                    start(p)
                } label: {
                    Text("START")
                        .font(.system(size: 12, weight: .black))
                        .tracking(2)
                        .foregroundStyle(Color(hex: "#0a0a0a"))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color(hex: p.color))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .background(HX.panel)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    /// Start commits the plan; the synthetic curated descriptor materializes as
    /// a real row with a fresh uuid at that moment.
    private func start(_ p: UserPlan) {
        var plan = p
        if plan.id == CURATED_DESCRIPTOR_ID { plan.id = newID() }
        plan.active = true
        if plan.createdAt == 0 { plan.createdAt = Date().epochMillis }
        store.savePlan(plan)
    }
}
