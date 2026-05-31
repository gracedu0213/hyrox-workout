import SwiftUI

// Hero card on HomePage. Two states:
//   .planned — show today's workout label and category
//   .logged(result) — show the celebration treatment with gradient headline
//
// Matches the canonical implementation in src/pages/HomePage.tsx.

struct TodayCard: View {
    enum State {
        case planned(label: String, category: Category, dayLabel: String)
        case logged(headline: String, caption: String, felt: FeltLike)
    }

    var state: State

    var body: some View {
        switch state {
        case .planned(let label, let category, let dayLabel):
            plannedView(label: label, category: category, dayLabel: dayLabel)
        case .logged(let headline, let caption, let felt):
            loggedView(headline: headline, caption: caption, felt: felt)
        }
    }

    // MARK: - Planned (functional, clean)

    private func plannedView(label: String, category: Category, dayLabel: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(dayLabel)
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(4)
                    .foregroundStyle(HX.muted)
                Spacer()
                CategoryChip(category: category)
            }
            Text(label)
                .font(.system(size: 28, weight: .heavy))
                .foregroundStyle(HX.text)
                .multilineTextAlignment(.leading)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(HX.panel)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    // MARK: - Logged (celebration)

    private func loggedView(headline: String, caption: String, felt: FeltLike) -> some View {
        ZStack(alignment: .topLeading) {
            // Ambient bleeds
            HX.resultBackground

            // Sparkles in corners
            Text("✦")
                .font(.system(size: 24))
                .foregroundStyle(HX.accent.opacity(0.5))
                .padding(.top, 16)
                .padding(.leading, 16)

            Text("✦")
                .font(.system(size: 18))
                .foregroundStyle(HX.engine.opacity(0.4))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .padding(.bottom, 20)
                .padding(.trailing, 24)

            VStack(alignment: .leading, spacing: 8) {
                // "Logged ✓" pill — upright, functional
                Text("LOGGED ✓")
                    .font(.system(size: 10, weight: .black))
                    .tracking(2)
                    .foregroundStyle(HX.bg)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(HX.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                // Headline number with gradient text
                ZStack(alignment: .bottomTrailing) {
                    Text(headline)
                        .font(.display(96))
                        .tracking(-4)
                        .lineSpacing(-8)
                        .foregroundStyle(HX.headlineGradient)
                        .padding(.trailing, 12)

                    // Felt-emoji sticker — rotated chip
                    FeltSticker(felt: felt)
                        .offset(x: 4, y: 8)
                }

                Text(caption)
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(2.5)
                    .foregroundStyle(HX.muted)
                    .textCase(.uppercase)
            }
            .padding(.top, 32)
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
        .background(HX.panel)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}

private struct CategoryChip: View {
    var category: Category

    var body: some View {
        Text(category.rawValue)
            .font(.system(size: 10, weight: .bold))
            .tracking(2)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }

    private var color: Color {
        switch category {
        case .foundation: return HX.accent
        case .aerobic: return HX.coral
        case .engine: return HX.engine
        case .power: return Color(red: 0xC0 / 255, green: 0x9B / 255, blue: 1.0)
        case .complete: return Color(red: 0x80 / 255, green: 1.0, blue: 0xB0 / 255)
        }
    }
}

private struct FeltSticker: View {
    var felt: FeltLike

    var emoji: String {
        switch felt {
        case .tough: return "🥵"
        case .ok: return "😮‍💨"
        case .good: return "💪"
        }
    }

    var body: some View {
        Text(emoji)
            .font(.system(size: 30))
            .frame(width: 56, height: 56)
            .background(HX.panel2)
            .clipShape(Circle())
            .overlay(Circle().stroke(HX.bg, lineWidth: 3))
            .shadow(color: .black.opacity(0.4), radius: 10, y: 4)
            .rotationEffect(.degrees(-12))
    }
}

#Preview("Planned") {
    TodayCard(state: .planned(label: "4 RFT — Row, KB DL, Wall Balls, Farmer Carry", category: .foundation, dayLabel: "MON · WEEK 1"))
        .padding()
        .background(HX.bg)
}

#Preview("Logged") {
    TodayCard(state: .logged(headline: "18:42", caption: "TOTAL TIME · 4 ROUNDS", felt: .good))
        .padding()
        .background(HX.bg)
}
