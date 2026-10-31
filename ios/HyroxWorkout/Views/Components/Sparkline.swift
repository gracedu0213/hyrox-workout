import SwiftUI

// Line chart matching web Sparkline.tsx: gradient stroke (#FFD500→#FF9B5C→
// #FF6B6B), higher value = higher on screen; `detailed` adds dots and
// emphasizes the latest point.

struct Sparkline: View {
    let values: [Double]
    var width: CGFloat = 96
    var height: CGFloat = 28
    var detailed = false

    private var pad: CGFloat { detailed ? 8 : 3 }

    private func point(_ i: Int) -> CGPoint {
        let minV = values.min()!
        let maxV = values.max()!
        let span = maxV - minV == 0 ? 1 : maxV - minV
        return CGPoint(
            x: pad + CGFloat(i) / CGFloat(values.count - 1) * (width - pad * 2),
            y: pad + CGFloat(1 - (values[i] - minV) / span) * (height - pad * 2)
        )
    }

    private var stroke: LinearGradient {
        LinearGradient(
            stops: [
                .init(color: Color(hex: "#FFD500"), location: 0),
                .init(color: Color(hex: "#FF9B5C"), location: 0.5),
                .init(color: Color(hex: "#FF6B6B"), location: 1),
            ],
            startPoint: .leading, endPoint: .trailing
        )
    }

    var body: some View {
        if values.count >= 2 {
            ZStack {
                Path { p in
                    p.move(to: point(0))
                    for i in 1..<values.count { p.addLine(to: point(i)) }
                }
                .stroke(stroke, style: StrokeStyle(lineWidth: detailed ? 2.5 : 2, lineCap: .round, lineJoin: .round))

                if detailed {
                    ForEach(values.indices, id: \.self) { i in
                        let last = i == values.count - 1
                        Circle()
                            .fill(last ? Color(hex: "#FF6B6B") : Color(hex: "#0a0a0a"))
                            .stroke(last ? Color(hex: "#FF6B6B") : Color(hex: "#FF9B5C"), lineWidth: 1.5)
                            .frame(width: last ? 7 : 4, height: last ? 7 : 4)
                            .position(point(i))
                    }
                }
            }
            .frame(width: width, height: height)
        }
    }
}
