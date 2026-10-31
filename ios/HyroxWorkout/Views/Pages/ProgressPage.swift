import SwiftUI

// The Progress tab (web ProgressPage.tsx): per-workout metric trends built by
// buildProgress — rows with sparkline + trend chip, expanding to a detailed
// chart and the reverse-chron session list.

private func fmtValue(_ unit: MetricUnit, _ v: Double) -> String {
    switch unit {
    case .time: return formatSec(Int(v))
    case .cal: return "\(Int(v)) cal"
    case .rounds: return "\(Int(v)) rounds"
    }
}

private func fmtDelta(_ unit: MetricUnit, _ delta: Double) -> String {
    let sign = delta > 0 ? "+" : "−"
    let mag = abs(delta)
    switch unit {
    case .time: return "\(sign)\(formatSec(Int(mag)))"
    case .cal: return "\(sign)\(Int(mag)) cal"
    case .rounds: return "\(sign)\(Int(mag)) rounds"
    }
}

struct ProgressPage: View {
    @EnvironmentObject private var store: AppStore
    @State private var expanded: String?

    var body: some View {
        let progress = buildProgress(store.allLogs)

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Progress")
                        .font(.display(44))
                        .tracking(-1.3)
                        .gradientText()
                    Text("How your results are trending, workout by workout.")
                        .font(.system(size: 14))
                        .foregroundStyle(HX.muted)
                }

                if progress.isEmpty {
                    VStack(spacing: 12) {
                        Text("📈").font(.system(size: 34))
                        Text("Log the same workout at least twice and your progression shows up here — time, rounds, and reps over time.")
                            .font(.system(size: 14))
                            .foregroundStyle(HX.muted)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 32)
                } else {
                    VStack(spacing: 8) {
                        ForEach(progress) { p in
                            ProgressRow(p: p, open: expanded == p.key) {
                                expanded = expanded == p.key ? nil : p.key
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 20)
            .padding(.bottom, 32)
        }
    }
}

private struct ProgressRow: View {
    @EnvironmentObject private var router: Router
    let p: WorkoutProgress
    let open: Bool
    let onToggle: () -> Void

    var body: some View {
        let latest = p.points.last!.value
        let t = trend(p)
        let trendColor: Color = t.improved == nil ? HX.muted : t.improved! ? Color(hex: "#2ECC71") : Color(hex: "#FF6B6B")
        let arrow = t.improved == nil ? "→" : t.improved! ? "↑" : "↓"

        VStack(spacing: 0) {
            Button(action: onToggle) {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(p.name)
                            .font(.system(size: 14, weight: .semibold))
                            .lineLimit(1)
                        (Text("\(p.points.count) sessions · latest ").foregroundStyle(HX.muted)
                         + Text(fmtValue(p.unit, latest)).foregroundStyle(.white.opacity(0.8)))
                            .font(.system(size: 12))
                    }
                    Spacer()
                    Sparkline(values: p.points.map(\.value))
                    Text(t.improved == nil ? "—" : "\(fmtDelta(p.unit, t.delta)) \(arrow)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(trendColor)
                        .frame(width: 72, alignment: .trailing)
                }
                .padding(12)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if open {
                VStack(spacing: 8) {
                    VStack(spacing: 6) {
                        GeometryReader { geo in
                            Sparkline(values: p.points.map(\.value),
                                      width: geo.size.width, height: 130, detailed: true)
                        }
                        .frame(height: 130)
                        HStack {
                            Text(p.points.first!.date)
                            Spacer()
                            Text(p.points.last!.date)
                        }
                        .font(.system(size: 10))
                        .foregroundStyle(HX.muted)
                    }
                    .padding(12)
                    .background(HX.panel2)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                    VStack(spacing: 2) {
                        ForEach(p.points.reversed(), id: \.logId) { pt in
                            Button {
                                router.push(.logDetail(logId: pt.logId, celebrate: false))
                            } label: {
                                HStack {
                                    Text(pt.date).font(.system(size: 12)).foregroundStyle(HX.muted)
                                    Spacer()
                                    Text(fmtValue(p.unit, pt.value))
                                        .font(.system(size: 14))
                                        .foregroundStyle(.white.opacity(0.85))
                                }
                                .padding(.vertical, 4)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
            }
        }
        .background(HX.panel)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
