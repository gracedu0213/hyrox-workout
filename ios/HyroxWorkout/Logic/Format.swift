import Foundation

// Display formatters, ported 1:1 from src/format.ts. String outputs must match
// the web exactly (they appear in logs, summaries, and the curated plan UI).

enum Gender: String, Codable {
    case M, F
}

/// Render a Double the way JS renders a number: no trailing ".0".
func fmtNum(_ n: Double) -> String {
    n == n.rounded() && abs(n) < 1e15
        ? String(Int(n))
        : String(n)
}

func formatSec(_ sec: Int) -> String {
    if sec < 60 { return "\(sec)s" }
    let h = sec / 3600
    let m = (sec % 3600) / 60
    let s = sec % 60
    if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
    return s == 0 ? "\(m):00" : String(format: "%d:%02d", m, s)
}

func formatWeight(_ w: Weight?, gender: Gender? = nil) -> String {
    guard let w else { return "" }
    var parts: [String] = []
    switch gender {
    case .M:
        if let lbs = w.lbsM { parts.append("\(fmtNum(lbs))lbs") }
        if let kg = w.kgM { parts.append("\(fmtNum(kg))kg") }
    case .F:
        if let lbs = w.lbsF { parts.append("\(fmtNum(lbs))lbs") }
        if let kg = w.kgF { parts.append("\(fmtNum(kg))kg") }
    case nil:
        if let m = w.lbsM, let f = w.lbsF { parts.append("\(fmtNum(m))/\(fmtNum(f))lbs") }
        else if let m = w.lbsM { parts.append("\(fmtNum(m))lbs") }
        if let m = w.kgM, let f = w.kgF { parts.append("\(fmtNum(m))/\(fmtNum(f))kg") }
        else if let m = w.kgM { parts.append("\(fmtNum(m))kg") }
    }
    var out = parts.joined(separator: " / ")
    if let count = w.count, count > 1 { out += " × \(count)" }
    if let note = w.note { out += " (\(note))" }
    return out
}

private func unitSuffix(_ u: TargetUnit?, _ valueStr: String, plural: Bool = true) -> String {
    switch u {
    case .reps:     return "\(valueStr) rep\(plural ? "s" : "")"
    case .meters:   return "\(valueStr)m"
    case .feet:     return "\(valueStr)ft"
    case .calories: return "\(valueStr) cal"
    case .seconds:  return "\(valueStr) sec"
    case .minutes:  return "\(valueStr) min"
    case .miles:    return "\(valueStr) mile\(plural ? "s" : "")"
    default:        return valueStr
    }
}

func formatQty(_ ex: Exercise) -> String {
    if let perRound = ex.perRound, !perRound.isEmpty {
        return perRound.map(String.init).joined(separator: "-")
    }
    if let ladder = ex.ladder {
        let seq = (0..<5).map { String(ladder.start + $0 * ladder.step) }.joined(separator: "-")
        return unitSuffix(ex.unit, ladder.openEnded == true ? "\(seq)-etc" : seq)
    }
    if let lo = ex.qtyMin, let hi = ex.qtyMax {
        return unitSuffix(ex.unit, "\(fmtNum(lo))-\(fmtNum(hi))")
    }
    if ex.unit == .failure { return "to Failure" }
    if ex.unit == .max { return "Max" }
    guard let qty = ex.qty else { return "" }
    return unitSuffix(ex.unit, fmtNum(qty), plural: qty != 1)
}

func formatExercise(_ ex: Exercise, gender: Gender? = nil) -> String {
    if ex.name.hasPrefix("—") { return ex.name } // separator row
    let qty = formatQty(ex)
    let head = qty.isEmpty ? ex.name : "\(qty) \(ex.name)"
    var bits = [head]
    if let modifier = ex.modifier { bits.append("(\(modifier))") }
    if let weight = ex.weight { bits.append("(\(formatWeight(weight, gender: gender)))") }
    if let note = ex.note { bits.append("— \(note)") }
    return bits.joined(separator: " ")
}

func setupSummary(_ s: WorkoutSetup) -> String {
    switch s {
    case .forTime: return "For Time"
    case .rft(let rounds): return "\(rounds) Rounds for Time"
    case .descendingRounds(let rounds, _): return "\(rounds) Rounds (descending reps)"
    case .amrap(let durationSec): return "\(Int((Double(durationSec) / 60).rounded())) Min AMRAP"
    case .multiWindowAmrap(let windows): return "\(windows.count)-Window AMRAP"
    case .emom(let everySec, let totalRounds): return "Every \(formatSec(everySec)) × \(totalRounds)"
    case .intervals(let rounds, let workSec, let restSec, let workDescription):
        let work = workSec.map(formatSec) ?? workDescription
        let rest = restSec.map { "\(formatSec($0)) rest" } ?? ""
        let label = work.map { "\(rounds) × \($0)" } ?? "\(rounds) intervals"
        return rest.isEmpty ? label : "\(label) / \(rest)"
    case .forQuality: return "For Quality"
    case .ladder(let sequence, _, let openEnded):
        return "Ladder \(sequence.map(String.init).joined(separator: "-"))\(openEnded == true ? "-etc" : "")"
    case .rounds(let rounds): return "\(rounds) Rounds"
    }
}

func formatSingleWeight(_ w: SingleWeight?) -> String {
    guard let w else { return "" }
    return "\(fmtNum(w.value)) \(w.unit.rawValue)"
}
