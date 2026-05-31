import SwiftUI

// Design language — mirrors the web app's Partiful-inspired tokens.
// Celebration surfaces (result heroes, completed states) lean electric.
// Functional surfaces (forms, lists) stay clean.

enum HX {
    // Surfaces
    static let bg = Color(red: 0x0A / 255, green: 0x0A / 255, blue: 0x0A / 255)
    static let panel = Color(red: 0x14 / 255, green: 0x14 / 255, blue: 0x14 / 255)
    static let panel2 = Color(red: 0x1F / 255, green: 0x1F / 255, blue: 0x1F / 255)

    // Text
    static let text = Color.white
    static let muted = Color(red: 0x99 / 255, green: 0x99 / 255, blue: 0x99 / 255)

    // Accents
    static let accent = Color(red: 1.0, green: 0xD5 / 255, blue: 0)            // #FFD500 yellow
    static let amber = Color(red: 0xF0 / 255, green: 0xE0 / 255, blue: 0x40 / 255)
    static let engine = Color(red: 1.0, green: 0x9B / 255, blue: 0x5C / 255)    // #FF9B5C
    static let coral = Color(red: 1.0, green: 0x6B / 255, blue: 0x6B / 255)     // #FF6B6B

    // Headline gradient (yellow → amber → coral)
    static let headlineGradient = LinearGradient(
        colors: [accent, amber, engine, coral],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Result block ambient bleeds
    static let resultBackground = LinearGradient(
        colors: [
            Color.yellow.opacity(0.12),
            Color.clear,
            Color.pink.opacity(0.10),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// Arial Black is what the web app uses for `font-display`. Falls back to
// system bold-black if unavailable.
extension Font {
    static func display(_ size: CGFloat) -> Font {
        if let _ = UIFont(name: "Arial-Black", size: size) {
            return .custom("Arial-Black", size: size)
        }
        return .system(size: size, weight: .black, design: .default)
    }
}
