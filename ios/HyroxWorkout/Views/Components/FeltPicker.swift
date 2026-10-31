import SwiftUI

// "How it felt" — 3 equal emoji buttons (🥵 Cooked / 🫡 Locked in / 🔥 On
// fire). Tap toggles; tapping the active one clears. Mirrors FeltPicker.tsx.

struct FeltPicker: View {
    @Binding var value: FeltLike?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: "How it felt")
            HStack(spacing: 8) {
                ForEach(FeltLike.allCases, id: \.self) { felt in
                    let active = value == felt
                    Button {
                        value = active ? nil : felt
                    } label: {
                        VStack(spacing: 4) {
                            Text(felt.emoji).font(.system(size: 28))
                            Text(felt.label)
                                .font(.system(size: 11))
                                .foregroundStyle(active ? HX.accent : HX.muted)
                        }
                        .frame(maxWidth: .infinity, minHeight: 64)
                        .background(active ? HX.accent.opacity(0.1) : HX.panel)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(active ? HX.accent : HX.line))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}
