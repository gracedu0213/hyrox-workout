import SwiftUI

// Design language — the SINGLE source of truth on iOS, mirroring the web's
// tailwind.config.js palette exactly (Partiful-inspired energy on celebration
// surfaces; functional surfaces stay clean). If a value changes there, change
// it here.

enum HX {
    // Surfaces (web: bg / panel / panel2 / line)
    static let bg = Color(hex: "#1a1a1a")
    static let panel = Color(hex: "#242424")
    static let panel2 = Color(hex: "#2e2e2e")
    static let line = Color(hex: "#3a3a3a")

    // Text
    static let text = Color.white
    static let muted = Color(hex: "#8a8a8a")

    // Accents (web: accent / accent2)
    static let accent = Color(hex: "#F0E040")
    static let accent2 = Color(hex: "#FFD500")

    // Curated-plan category colors (web: foundation/aerobic/engine/power/complete)
    static let foundation = Color(hex: "#F0E040")
    static let aerobic = Color(hex: "#5BC0EB")
    static let engine = Color(hex: "#FF6B6B")
    static let power = Color(hex: "#9B59B6")
    static let complete = Color(hex: "#2ECC71")

    /// "Other"/unresolved log type — web OTHER_TYPE (#FF6B6B).
    static let coral = Color(hex: "#FF6B6B")

    /// Confetti palette (web src/celebrate.ts).
    static let confetti = ["#F0E040", "#FFD500", "#5BC0EB", "#FF6B6B", "#2ECC71"]

    /// The signature gradient — web `linear-gradient(135deg, #FFD500 0%,
    /// #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)`. Used for result numbers and
    /// big display titles via .gradientText().
    static let gradient = LinearGradient(
        stops: [
            .init(color: Color(hex: "#FFD500"), location: 0),
            .init(color: Color(hex: "#F0E040"), location: 0.35),
            .init(color: Color(hex: "#FF9B5C"), location: 0.70),
            .init(color: Color(hex: "#FF6B6B"), location: 1),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Result block ambient bleeds
    static let resultBackground = LinearGradient(
        colors: [
            accent.opacity(0.12),
            Color.clear,
            engine.opacity(0.10),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

extension Category {
    /// Hex twin used where the web inlines CAT_HEX (calendar tiles, dots).
    var hex: String {
        switch self {
        case .foundation: return "#F0E040"
        case .aerobic:    return "#5BC0EB"
        case .engine:     return "#FF6B6B"
        case .power:      return "#9B59B6"
        case .complete:   return "#2ECC71"
        }
    }

    var color: Color { Color(hex: hex) }
}

extension Color {
    /// Parse "#RRGGBB" (the only form the app stores — workout type + plan
    /// colors are user data rendered via inline styles on the web).
    init(hex: String) {
        var value: UInt64 = 0
        Scanner(string: String(hex.dropFirst(hex.hasPrefix("#") ? 1 : 0))).scanHexInt64(&value)
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
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
