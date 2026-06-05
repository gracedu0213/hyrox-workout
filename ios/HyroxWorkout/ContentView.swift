import SwiftUI

struct ContentView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("hyrox")
                    .font(.display(48))
                    .tracking(-2)
                    .foregroundStyle(HX.headlineGradient)
                    .padding(.top, 24)

                TodayCard(state: .planned(
                    label: PLAN.days.first?.workoutLabel ?? "Rest day",
                    category: PLAN.days.first?.category ?? .foundation,
                    dayLabel: "MON · WEEK 1"
                ))

                TodayCard(state: .logged(headline: "18:42", caption: "TOTAL TIME · 4 ROUNDS", felt: .good))
            }
            .padding(.horizontal, 20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(HX.bg)
        .foregroundStyle(HX.text)
        .ignoresSafeArea(edges: .bottom)
    }
}

#Preview {
    ContentView()
}
