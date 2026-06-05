import Foundation

// Sample plan data — currently just Week 1 as a smoke test.
// Full 12-week plan will be ported (or loaded from a generated JSON resource)
// once the rendering pipeline is verified.

private let KB24 = Weight(lbsM: 53, kgM: 24, lbsF: 35, kgF: 16)
private let KB24x2 = Weight(lbsM: 53, kgM: 24, lbsF: 35, kgF: 16, count: 2)
private let HC24 = Weight(lbsM: 53, kgM: 24, lbsF: 35, kgF: 16)
private let DB15x2 = Weight(lbsM: 35, kgM: 15, lbsF: 20, kgF: 10, count: 2)
private let WB6 = Weight(lbsM: 14, kgM: 6, lbsF: 10, kgF: 4)

private func ex(
    _ name: String,
    _ qty: Double? = nil,
    _ unit: TargetUnit? = nil,
    weight: Weight? = nil,
    modifier: String? = nil,
    note: String? = nil,
    perRound: [Int]? = nil,
    qtyMin: Double? = nil,
    qtyMax: Double? = nil
) -> Exercise {
    Exercise(
        name: name,
        qty: qty,
        unit: unit,
        perRound: perRound,
        ladder: nil,
        qtyMin: qtyMin,
        qtyMax: qtyMax,
        weight: weight,
        modifier: modifier,
        note: note
    )
}

let PLAN = Plan(days: [
    Day(
        id: "w01-mon", week: 1, phase: .base, dayOfWeek: .mon, category: .foundation,
        setup: .rft(rounds: 4), workoutLabel: "4 RFT",
        exercises: [
            ex("Row", 500, .meters),
            ex("KB Deadlifts", 20, .reps, weight: KB24x2, note: "Should be done in 1 set"),
            ex("Wall Balls", 20, .reps, weight: WB6),
            ex("Farmer Carry", 100, .meters, weight: KB24x2),
        ],
        notes: [
            "Pay attention to pace on row, stay consistent",
            "KB Deadlifts should be able to be done in 1 set",
            "Wall balls should be unbroken",
            "Go heavier on Farmer Carry if desired",
        ]
    ),
    Day(
        id: "w01-tue", week: 1, phase: .base, dayOfWeek: .tue, category: .aerobic,
        setup: .forQuality, workoutLabel: "45-60 Min Run",
        exercises: [
            ex("Run", nil, .minutes, note: "Finish with 6 x 20 second strides", qtyMin: 45, qtyMax: 60),
        ],
        notes: [
            "Conversational Pace",
            "During strides, start slow and build to sprint effort for the last 6-10 steps",
        ]
    ),
    Day(
        id: "w01-wed", week: 1, phase: .base, dayOfWeek: .wed, category: .foundation,
        setup: .rft(rounds: 4), workoutLabel: "4 RFT",
        exercises: [
            ex("Sled Push", 50, .feet, modifier: "AHAP", note: "50ft / 12.5m"),
            ex("Run", 400, .meters),
            ex("Headcutters", 15, .reps, weight: HC24),
        ],
        notes: [
            "AHAP = As heavy as possible",
            "Option to modify Headcutters to Wall Balls or Goblet Squats as needed",
        ]
    ),
    Day(
        id: "w01-thu", week: 1, phase: .base, dayOfWeek: .thu, category: .power,
        setup: .rounds(rounds: 4), workoutLabel: "4x + 4x (two blocks)",
        exercises: [
            ex("Goblet Squat", 20, .reps),
            ex("DB Bench Press", 15, .reps),
            ex("Ring/TRX Rows", nil, .failure, note: "x Failure"),
            ex("Max Bike Sprint", 30, .seconds),
        ],
        notes: [
            "This is for quality, not for time",
            "Choose weights where the last 3 reps are very challenging",
        ]
    ),
    Day(
        id: "w01-fri", week: 1, phase: .base, dayOfWeek: .fri, category: .foundation,
        setup: .descendingRounds(rounds: 3, roundDetails: [
            "Round 1: 800m Run + 30 reps each movement",
            "Round 2: 400m Run + 20 reps each movement",
            "Round 3: 200m Run + 10 reps each movement",
        ]),
        workoutLabel: "For Time: 3 Rounds (descending)",
        exercises: [
            ex("Run", nil, nil, note: "800 / 400 / 200m per round", perRound: [800, 400, 200]),
            ex("Alt DB Snatch", nil, .reps, perRound: [30, 20, 10]),
            ex("Goblet Squat", nil, .reps, perRound: [30, 20, 10]),
            ex("Goblet Lunge", nil, .reps, perRound: [30, 20, 10]),
            ex("Sled Push", 50, .feet, note: "50ft / 12.5m after each round"),
        ],
        notes: ["Sled Push remains the same throughout"]
    ),
])
