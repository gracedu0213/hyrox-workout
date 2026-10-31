import SwiftUI

// Stopwatch-style entry, ported from web TimeInput.tsx: the user types only
// digits; the colon is always rendered, digits fill from the right, and the
// commit rolls seconds ≥ 60 (1:99 → 2:39).
//
//   type "5" → 0:05 · "3" → 0:53 · "0" → 5:30 · "0" → 53:00 · "0" → 5:30:00

private let MAX_DIGITS = 6

func digitsToSec(_ d: String) -> Int? {
    guard !d.isEmpty else { return nil }
    if d.count <= 2 { return Int(d) }
    if d.count <= 4 { return Int(d.dropLast(2))! * 60 + Int(d.suffix(2))! }
    return Int(d.dropLast(4))! * 3600 + Int(d.suffix(4).prefix(2))! * 60 + Int(d.suffix(2))!
}

func digitsToDisplay(_ d: String) -> String {
    guard !d.isEmpty else { return "" }
    if d.count <= 2 { return "0:" + String(repeating: "0", count: 2 - d.count) + d }
    if d.count <= 4 { return "\(d.dropLast(2)):\(d.suffix(2))" }
    return "\(d.dropLast(4)):\(d.suffix(4).prefix(2)):\(d.suffix(2))"
}

func secToDigits(_ sec: Int) -> String {
    let h = sec / 3600
    let m = (sec % 3600) / 60
    let s = sec % 60
    if h > 0 { return "\(h)" + String(format: "%02d%02d", m, s) }
    if m == 0 { return s == 0 ? "" : String(s) }
    return "\(m)" + String(format: "%02d", s)
}

struct TimeInput: View {
    @Binding var valueSec: Int?
    var compact = false

    @State private var digits = ""
    @FocusState private var focused: Bool
    @State private var prefillOnCancel = ""

    var body: some View {
        TextField("h:mm:ss", text: Binding(
            get: { digitsToDisplay(digits) },
            set: { newValue in
                var d = newValue.filter(\.isNumber)
                while d.first == "0" { d.removeFirst() }
                digits = String(d.suffix(MAX_DIGITS))
                valueSec = digitsToSec(digits)
            }
        ))
        .keyboardType(.numberPad)
        .multilineTextAlignment(.center)
        .font(.system(size: compact ? 15 : 17).monospacedDigit())
        .padding(.vertical, compact ? 6 : 8)
        .frame(width: compact ? 96 : 128)
        .background(HX.panel2)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .focused($focused)
        .onAppear { digits = valueSec.map(secToDigits) ?? "" }
        .onChange(of: valueSec) { _, v in
            // External updates (e.g. loaded log) refresh the display when idle.
            if !focused { digits = v.map(secToDigits) ?? "" }
        }
        .onChange(of: focused) { _, isFocused in
            if isFocused {
                // Emulate the web's select-all-on-focus: typing overwrites the
                // prefill; leaving without typing restores it.
                prefillOnCancel = digits
                digits = ""
            } else {
                if digits.isEmpty { digits = prefillOnCancel }
                // Roll over seconds ≥ 60 on commit so value and display agree.
                let sec = digitsToSec(digits)
                valueSec = sec
                digits = sec.map(secToDigits) ?? ""
            }
        }
    }
}
