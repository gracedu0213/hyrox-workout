import SwiftUI

// ⋯ overflow menu for secondary actions — one primary action per card/header,
// everything else in here. Uses the native Menu (the iOS idiom for the web's
// custom dropdown).

struct MoreMenuItem: Identifiable {
    let id = UUID()
    let label: String
    var destructive = false
    let action: () -> Void
}

struct MoreMenu: View {
    let items: [MoreMenuItem]

    var body: some View {
        Menu {
            ForEach(items) { item in
                Button(role: item.destructive ? .destructive : nil, action: item.action) {
                    Text(item.label)
                }
            }
        } label: {
            Text("⋯")
                .font(.system(size: 20))
                .foregroundStyle(HX.muted)
                .frame(width: 32, height: 32)
                .contentShape(Circle())
        }
    }
}
