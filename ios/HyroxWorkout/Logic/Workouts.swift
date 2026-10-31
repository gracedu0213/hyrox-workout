import Foundation

// Helpers bridging the custom-workout model (blocks + single weight) to the
// curated library's flat { setup, exercises } shape so the log flow renders
// both the same way. Ported 1:1 from src/workouts.ts.

extension BlockRow {
    var isRest: Bool {
        if case .rest = self { return true }
        return false
    }

    var exercise: ExSpec? {
        if case .exercise(let spec) = self { return spec }
        return nil
    }
}

extension Block {
    var hasWork: Bool { rows.contains { !$0.isRest } }
}

/// Only blocks that contain work count as rounds; a rest-only block doesn't.
func totalRounds(_ blocks: [Block]) -> Int {
    blocks.filter(\.hasWork).reduce(0) { $0 + max(1, $1.repeatCount) }
}

/// Map the single personal weight onto the gendered Weight using only the men's
/// field for the chosen unit; formatWeight renders it as e.g. "24kg" when
/// called WITHOUT a gender (which is how custom workouts must format it).
private func specWeight(_ w: SingleWeight?) -> Weight? {
    guard let w else { return nil }
    return w.unit == .kg ? Weight(kgM: w.value) : Weight(lbsM: w.value)
}

private func specToExercise(_ s: ExSpec) -> Exercise {
    Exercise(name: s.name, qty: s.qty, unit: s.unit, weight: specWeight(s.weight), note: s.note)
}

private func formatToSetup(_ format: WorkoutFormat, rounds: Int) -> WorkoutSetup {
    switch format {
    case .rounds:
        return .rounds(rounds: rounds)
    case .forTime:
        // Multiple rounds → rft so the log flow offers per-round splits.
        return rounds > 1 ? .rft(rounds: rounds) : .forTime
    case .amrap(let durationSec):
        return .amrap(durationSec: durationSec)
    case .emom(let everySec, let totalRounds):
        return .emom(everySec: everySec, totalRounds: totalRounds)
    case .intervals(let rounds, let workSec, let restSec):
        return .intervals(rounds: rounds, workSec: workSec, restSec: restSec, workDescription: nil)
    }
}

/// Flatten blocks into a single exercise list, inserting "—" separator rows
/// between blocks (the curated library's divider convention).
func customToSetup(_ w: CustomWorkout) -> (setup: WorkoutSetup, exercises: [Exercise]) {
    let setup = formatToSetup(w.format, rounds: totalRounds(w.blocks))
    var exercises: [Exercise] = []
    let multiWork = w.blocks.filter(\.hasWork).count > 1
    var workIdx = 0
    for b in w.blocks {
        if b.hasWork {
            workIdx += 1
            if multiWork || b.label != nil {
                let label = b.label ?? "Block \(workIdx)"
                let rep = b.repeatCount > 1 ? " ×\(b.repeatCount)" : ""
                exercises.append(Exercise(name: "— \(label)\(rep) —"))
            }
        }
        for row in b.rows {
            switch row {
            case .rest(let restSec):
                exercises.append(Exercise(name: "— Rest\(restSec > 0 ? " \(formatSec(restSec))" : "") —"))
            case .exercise(let spec):
                exercises.append(specToExercise(spec))
            }
        }
    }
    return (setup, exercises)
}

func buildSnapshot(_ w: CustomWorkout) -> WorkoutSnapshot {
    let (setup, exercises) = customToSetup(w)
    return WorkoutSnapshot(name: w.name, setup: setup, exercises: exercises, blocks: w.blocks, notes: w.notes)
}
