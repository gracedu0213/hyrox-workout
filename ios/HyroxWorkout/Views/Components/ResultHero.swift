import SwiftUI

// The celebration-styled result display (web ResultHero.tsx). Headline
// priority: total time → AMRAP rounds+reps → calories → intervals count →
// "No results recorded." Gradient display text, tilted felt sticker,
// ambient radial bleeds, ✦ sparkles.

struct ResultHero: View {
    let log: WorkoutLog
    var page = true   // web size="page" vs card

    private var headline: (value: Text, label: String)? {
        if let t = log.totalTimeSec {
            return (Text(formatSec(t)), "Total time")
        }
        if let amrap = log.amrap {
            if amrap.fullRounds != nil || amrap.partialReps != nil {
                let value = Text("\(amrap.fullRounds ?? 0)")
                    + Text("+\(amrap.partialReps ?? 0)").foregroundColor(.white.opacity(0.45))
                return (value, "Rounds + reps")
            }
            if let cal = amrap.totalCalories {
                return (Text("\(cal)"), "Calories")
            }
        }
        if let splits = log.intervals?.splits, !splits.isEmpty {
            return (Text("\(splits.count)"), "Intervals logged")
        }
        return nil
    }

    var body: some View {
        ZStack {
            RadialGradient(colors: [Color(hex: "#FFD500").opacity(0.14), .clear],
                           center: UnitPoint(x: 0.15, y: 0), startRadius: 0, endRadius: 280)
            RadialGradient(colors: [Color(hex: "#FF6B6B").opacity(0.12), .clear],
                           center: UnitPoint(x: 0.9, y: 1.1), startRadius: 0, endRadius: 280)

            VStack(spacing: 8) {
                if let (value, label) = headline {
                    ZStack(alignment: .bottomTrailing) {
                        value
                            .font(.display(page ? 76 : 60))
                            .tracking(-2)
                            .gradientText()
                            .lineLimit(1)
                            .minimumScaleFactor(0.4)
                        if let felt = log.feltLike {
                            feltSticker(felt)
                                .offset(x: 18, y: 6)
                        }
                    }
                    Text(label.uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(2.5)
                        .foregroundStyle(HX.muted)
                } else {
                    if let felt = log.feltLike {
                        feltSticker(felt)
                    }
                    Text("No results recorded.")
                        .font(.system(size: 14))
                        .foregroundStyle(HX.muted)
                }
            }
            .padding(.vertical, page ? 36 : 24)
            .padding(.horizontal, 16)
        }
        .overlay(alignment: .topTrailing) {
            Sparkle().padding(12)
        }
        .overlay(alignment: .bottomLeading) {
            Sparkle(color: HX.engine, size: 11, opacity: 0.35).padding(12)
        }
    }

    private func feltSticker(_ felt: FeltLike) -> some View {
        Text(felt.emoji)
            .font(.system(size: 30))
            .padding(8)
            .background(HX.panel2)
            .clipShape(Circle())
            .overlay(Circle().stroke(HX.bg, lineWidth: 3))
            .rotationEffect(.degrees(-12))
    }
}
