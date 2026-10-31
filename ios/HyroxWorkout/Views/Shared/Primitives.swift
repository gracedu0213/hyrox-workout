import SwiftUI

// Small shared building blocks matching the web's visual vocabulary:
// uppercase micro-labels, display type, gradient text, panel cards, pills.

extension View {
    /// Display text filled with the signature gradient (web: background-clip:text).
    func gradientText() -> some View {
        foregroundStyle(HX.gradient)
    }

    /// Card surface — web `bg-panel rounded-xl`.
    func panelCard(_ radius: CGFloat = 12, padding: CGFloat = 16) -> some View {
        self.padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(HX.panel)
            .clipShape(RoundedRectangle(cornerRadius: radius))
    }
}

/// Uppercase micro-label — web `text-[10px] uppercase tracking-widest text-muted`.
struct SectionLabel: View {
    let text: String
    var color: Color = HX.muted

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .semibold))
            .tracking(2.5)
            .foregroundStyle(color)
    }
}

/// Web-style back link ("← Plans") — pages render their own, like the PWA.
struct BackLink: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text("← \(label)")
                .font(.system(size: 14))
                .foregroundStyle(HX.muted)
        }
        .buttonStyle(.plain)
    }
}

/// Primary yellow CTA — web `bg-accent text-bg font-semibold rounded-lg`.
struct AccentButtonStyle: ButtonStyle {
    var fullWidth = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(HX.bg)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .background(HX.accent)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

/// Pill group option — web format/intensity pickers.
struct PillToggle: View {
    let label: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: selected ? .semibold : .regular))
                .foregroundStyle(selected ? HX.bg : HX.muted)
                .padding(.vertical, 7)
                .padding(.horizontal, 14)
                .background(selected ? HX.accent : HX.panel2)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

/// Text input matching web `bg-panel2 border border-line rounded-lg px-3 py-2`.
struct HXFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.vertical, 10)
            .padding(.horizontal, 12)
            .background(HX.panel2)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(HX.line))
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

/// Colored left bar rows (plan library, workout list, upcoming cards).
struct BarRow<Content: View>: View {
    let color: Color
    var barHeight: CGFloat = 40
    @ViewBuilder let content: Content

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 4, height: barHeight)
            content
        }
    }
}

/// "✦" sparkle motif used on celebration surfaces.
struct Sparkle: View {
    var color: Color = HX.accent
    var size: CGFloat = 14
    var opacity: Double = 0.4

    var body: some View {
        Text("✦")
            .font(.system(size: size))
            .foregroundStyle(color.opacity(opacity))
    }
}

/// Category chip text — web `text-${category} text-[11px] uppercase`.
struct CategoryChip: View {
    let category: HyroxWorkout.Category

    var body: some View {
        Text(category.rawValue)
            .font(.system(size: 11, weight: .semibold))
            .tracking(1)
            .foregroundStyle(category.color)
    }
}

/// Wrapping dot-legend under the calendars (web: flex flex-wrap gap chips).
struct FlowLegend: View {
    let entries: [LogTypeInfo]

    var body: some View {
        FlowLayout(hSpacing: 12, vSpacing: 4) {
            ForEach(entries, id: \.name) { t in
                HStack(spacing: 4) {
                    Circle().fill(Color(hex: t.color)).frame(width: 6, height: 6)
                    Text(t.name.uppercased())
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1)
                        .foregroundStyle(HX.muted)
                }
            }
        }
    }
}

/// Minimal left-aligned wrapping layout (CSS flex-wrap).
struct FlowLayout: Layout {
    var hSpacing: CGFloat = 8
    var vSpacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = layout(subviews, in: proposal.width ?? .infinity)
        let height = rows.last.map { $0.y + $0.height } ?? 0
        return CGSize(width: proposal.width ?? rows.map(\.width).max() ?? 0, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + vSpacing
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += size.width + hSpacing
            rowHeight = max(rowHeight, size.height)
        }
    }

    private struct Row { var y: CGFloat; var width: CGFloat; var height: CGFloat }

    private func layout(_ subviews: Subviews, in width: CGFloat) -> [Row] {
        var rows: [Row] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                rows.append(Row(y: y, width: x - hSpacing, height: rowHeight))
                x = 0
                y += rowHeight + vSpacing
                rowHeight = 0
            }
            x += size.width + hSpacing
            rowHeight = max(rowHeight, size.height)
        }
        rows.append(Row(y: y, width: x - hSpacing, height: rowHeight))
        return rows
    }
}

/// Dot + name chip for workout types.
struct TypeChip: View {
    let name: String
    let color: Color

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 7, height: 7)
            Text(name)
                .font(.system(size: 12))
                .foregroundStyle(color)
        }
    }
}
