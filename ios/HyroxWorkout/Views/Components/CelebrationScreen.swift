import SwiftUI
import UIKit

// Full-screen post-log celebration (web CelebrationScreen.tsx): confetti,
// giant randomized greeting, result + tilted felt emoji, stat tiles (day
// streak / this week / total), contextual line, "Keep going →".

private let GREETINGS: [(String, String?)] = [
    ("NICE", "WORK"), ("LET'S", "GO"), ("CRUSHED", "IT"), ("YOU", "DID IT"),
    ("GET", "SOME"), ("BOOM", nil), ("DONE", "AND DONE"),
]

/// Java-style string hash (mirrors the web's hashCode) so the same log always
/// gets the same greeting.
private func hashCode(_ s: String) -> Int {
    var h: Int32 = 0
    for u in s.utf16 { h = 31 &* h &+ Int32(u) }
    return Int(abs(h))
}

/// Native replacement for navigator.vibrate + canvas-confetti's haptic moment.
func celebrateHaptic() {
    UINotificationFeedbackGenerator().notificationOccurred(.success)
}

struct CelebrationScreen: View {
    @EnvironmentObject private var store: AppStore
    let log: WorkoutLog
    let onDismiss: () -> Void

    private var stats: (dayStreak: Int, thisWeek: Int, total: Int) {
        let logs = store.allLogs.filter(\.hasResults)
        let dates = Set(logs.map(\.date))
        // Consecutive calendar days with results, counting back from the log's date.
        var streak = 0
        var cursor = DateUtils.parseISO(log.date)
        while dates.contains(DateUtils.isoDate(cursor)) {
            streak += 1
            cursor = DateUtils.addDays(cursor, -1)
        }
        // Sessions in the log's Mon-first week, up to its date.
        let weekStart = DateUtils.isoDate(DateUtils.mondayOfWeek(DateUtils.parseISO(log.date)))
        let thisWeek = logs.filter { $0.date >= weekStart && $0.date <= log.date }.count
        return (streak, thisWeek, logs.count)
    }

    var body: some View {
        let greeting = GREETINGS[hashCode(log.id) % GREETINGS.count]
        let (dayStreak, thisWeek, total) = stats

        ZStack {
            HX.bg.ignoresSafeArea()
            RadialGradient(colors: [Color(hex: "#FFD500").opacity(0.16), .clear],
                           center: UnitPoint(x: 0.1, y: 0.05), startRadius: 0, endRadius: 420)
                .ignoresSafeArea()
            RadialGradient(colors: [Color(hex: "#FF6B6B").opacity(0.14), .clear],
                           center: UnitPoint(x: 0.95, y: 0.95), startRadius: 0, endRadius: 420)
                .ignoresSafeArea()

            scatteredSparkles

            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Spacer()
                    Button {
                        onDismiss()
                    } label: {
                        Text("×")
                            .font(.system(size: 26))
                            .foregroundStyle(HX.muted)
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                }

                Spacer()

                Text("WORKOUT LOGGED")
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(3)
                    .foregroundStyle(HX.muted)

                VStack(alignment: .leading, spacing: -6) {
                    Text(greeting.0)
                    if let second = greeting.1 { Text(second) }
                }
                .font(.display(76))
                .tracking(-2.5)
                .gradientText()
                .padding(.top, 8)

                HStack(spacing: 12) {
                    let summary = log.summary
                    Text(summary.isEmpty ? "Logged" : summary)
                        .font(.display(22))
                        .tracking(-0.4)
                    if let felt = log.feltLike {
                        Text(felt.emoji)
                            .font(.system(size: 34))
                            .rotationEffect(.degrees(-10))
                    }
                }
                .padding(.top, 16)

                HStack(spacing: 8) {
                    statTile("🔥", "Streak", "\(dayStreak)d")
                    statTile("💪", "This week", "\(thisWeek)")
                    statTile("📊", "Total", "\(total)")
                }
                .padding(.top, 24)

                Text(contextLine(dayStreak: dayStreak, thisWeek: thisWeek, total: total))
                    .font(.system(size: 13))
                    .foregroundStyle(HX.muted)
                    .padding(.top, 14)

                Spacer()

                Button {
                    onDismiss()
                } label: {
                    Text("KEEP GOING →")
                        .font(.system(size: 14, weight: .black))
                        .tracking(2.5)
                        .foregroundStyle(HX.bg)
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .background(HX.accent)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .padding(.bottom, 12)
            }
            .padding(.horizontal, 24)

            ConfettiBurst()
                .allowsHitTesting(false)
                .ignoresSafeArea()
        }
        .foregroundStyle(.white)
        .onAppear { celebrateHaptic() }
    }

    private var scatteredSparkles: some View {
        GeometryReader { geo in
            let spots: [(CGFloat, CGFloat, Color, CGFloat)] = [
                (0.12, 0.16, HX.accent, 16), (0.85, 0.22, HX.engine, 12),
                (0.72, 0.10, HX.power, 10), (0.20, 0.72, HX.power, 12),
                (0.90, 0.62, HX.accent, 10), (0.06, 0.45, HX.engine, 9),
            ]
            ForEach(Array(spots.enumerated()), id: \.offset) { _, s in
                Sparkle(color: s.2, size: s.3, opacity: 0.5)
                    .position(x: geo.size.width * s.0, y: geo.size.height * s.1)
            }
        }
    }

    private func statTile(_ emoji: String, _ label: String, _ value: String) -> some View {
        VStack(spacing: 4) {
            Text(emoji).font(.system(size: 18))
            Text(value).font(.display(20)).tracking(-0.3)
            Text(label.uppercased())
                .font(.system(size: 9, weight: .medium))
                .tracking(1.5)
                .foregroundStyle(HX.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 84)
        .background(HX.panel.opacity(0.8))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func contextLine(dayStreak: Int, thisWeek: Int, total: Int) -> String {
        if total == 1 { return "First one in the books. Welcome." }
        if dayStreak >= 3 { return "\(dayStreak) days in a row — you're on a heater." }
        if thisWeek >= 3 { return "\(thisWeek) sessions this week. Keep stacking." }
        return "Every session counts. See you tomorrow?"
    }
}

// MARK: - Confetti

/// Two 80-particle bursts from the lower corners (web canvas-confetti call in
/// src/celebrate.ts), simulated with a TimelineView-driven Canvas.
struct ConfettiBurst: View {
    private struct Particle {
        var origin: CGPoint      // unit coords
        var angle: Double        // radians, 0 = right, -π/2 = up
        var speed: Double        // pt/s
        var color: Color
        var size: CGFloat
        var spin: Double
    }

    @State private var start = Date()

    private let particles: [Particle] = {
        var out: [Particle] = []
        var seed: UInt64 = 0x9E3779B97F4A7C15
        func rand() -> Double {
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            return Double(seed >> 11) / Double(UInt64(1) << 53)
        }
        for originX in [0.2, 0.8] {
            for _ in 0..<80 {
                let spread = (rand() - 0.5) * (60 * .pi / 180)
                out.append(Particle(
                    origin: CGPoint(x: originX, y: 0.85),
                    angle: -Double.pi / 2 + spread + (originX < 0.5 ? -0.15 : 0.15),
                    speed: 500 + rand() * 500,
                    color: Color(hex: HX.confetti[Int(rand() * 5) % HX.confetti.count]),
                    size: 5 + rand() * 5,
                    spin: (rand() - 0.5) * 12
                ))
            }
        }
        return out
    }()

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSince(start)
                guard t < 2.6 else { return }
                let gravity = 900.0
                let drag = 0.55
                for p in particles {
                    // Damped ballistic motion.
                    let k = (1 - exp(-drag * t)) / drag
                    let x = Double(p.origin.x) * size.width + cos(p.angle) * p.speed * k
                    let y = Double(p.origin.y) * size.height + sin(p.angle) * p.speed * k
                        + gravity * (t - k) / drag
                    guard y < size.height + 20 else { continue }
                    let alpha = t < 1.8 ? 1.0 : max(0, 1 - (t - 1.8) / 0.8)
                    var rect = context
                    rect.translateBy(x: x, y: y)
                    rect.rotate(by: .radians(p.spin * t))
                    rect.opacity = alpha
                    rect.fill(
                        Path(CGRect(x: -p.size / 2, y: -p.size / 2, width: p.size, height: p.size * 0.6)),
                        with: .color(p.color)
                    )
                }
            }
        }
    }
}
