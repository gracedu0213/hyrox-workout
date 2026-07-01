import XCTest
@testable import HyroxWorkout

// These tests pin the JSON shape of the discriminated unions (WorkoutFormat,
// PlanContent, BlockRow, PlanSlot) to exactly what the web app writes and what
// Supabase `data` stores — so web + iOS round-trip the same bytes. If someone
// adds a variant and the shape drifts, these fail.

final class DomainCodableTests: XCTestCase {

    // MARK: helpers

    private func jsonObject<T: Encodable>(_ value: T) throws -> NSDictionary {
        let data = try JSONEncoder().encode(value)
        return try JSONSerialization.jsonObject(with: data) as! NSDictionary
    }

    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(json.utf8))
    }

    /// Encode → decode must reproduce the original value.
    private func roundTrips<T: Codable & Equatable>(_ value: T, file: StaticString = #filePath, line: UInt = #line) throws {
        let data = try JSONEncoder().encode(value)
        let back = try JSONDecoder().decode(T.self, from: data)
        XCTAssertEqual(value, back, file: file, line: line)
    }

    // MARK: WorkoutFormat — the "workout type" union

    func testWorkoutFormatEncodesTypeKeyedJSON() throws {
        XCTAssertEqual(try jsonObject(WorkoutFormat.rounds), ["type": "rounds"])
        XCTAssertEqual(try jsonObject(WorkoutFormat.forTime), ["type": "for_time"])
        XCTAssertEqual(try jsonObject(WorkoutFormat.amrap(durationSec: 600)),
                       ["type": "amrap", "durationSec": 600])
        XCTAssertEqual(try jsonObject(WorkoutFormat.emom(everySec: 90, totalRounds: 8)),
                       ["type": "emom", "everySec": 90, "totalRounds": 8])
        XCTAssertEqual(try jsonObject(WorkoutFormat.intervals(rounds: 5, workSec: nil, restSec: 120)),
                       ["type": "intervals", "rounds": 5, "restSec": 120]) // nil workSec omitted
    }

    func testWorkoutFormatDecodesWebShape() throws {
        XCTAssertEqual(try decode(WorkoutFormat.self, #"{"type":"amrap","durationSec":720}"#),
                       .amrap(durationSec: 720))
        XCTAssertEqual(try decode(WorkoutFormat.self, #"{"type":"for_time"}"#), .forTime)
        XCTAssertEqual(try decode(WorkoutFormat.self, #"{"type":"intervals","rounds":8,"workSec":60,"restSec":30}"#),
                       .intervals(rounds: 8, workSec: 60, restSec: 30))
    }

    func testWorkoutFormatRoundTrips() throws {
        try roundTrips(WorkoutFormat.rounds)
        try roundTrips(WorkoutFormat.amrap(durationSec: 1200))
        try roundTrips(WorkoutFormat.emom(everySec: 60, totalRounds: 10))
        try roundTrips(WorkoutFormat.intervals(rounds: 6, workSec: nil, restSec: nil))
    }

    // MARK: BlockRow — flat exercise vs. kind:"rest"

    func testBlockRowExerciseIsFlatAndRestIsTagged() throws {
        let ex = BlockRow.exercise(ExSpec(name: "Row", qty: 500, unit: .meters, weight: nil, note: nil))
        XCTAssertEqual(try jsonObject(ex), ["name": "Row", "qty": 500, "unit": "meters"])

        let rest = BlockRow.rest(restSec: 90)
        XCTAssertEqual(try jsonObject(rest), ["kind": "rest", "restSec": 90])

        // Web omits `kind` on exercise rows; decoding must treat that as exercise.
        XCTAssertEqual(try decode(BlockRow.self, #"{"name":"Burpees","qty":15,"unit":"reps"}"#),
                       .exercise(ExSpec(name: "Burpees", qty: 15, unit: .reps, weight: nil, note: nil)))
    }

    // MARK: PlanContent — the "plan type" union

    func testPlanContentEncodesTypeKeyedJSON() throws {
        XCTAssertEqual(try jsonObject(PlanContent.curated), ["type": "curated"])
    }

    func testPlanContentSequencedRoundTripsWithFullWeek() throws {
        // Includes a Saturday slot — proves DayOfWeek covers all 7 days.
        let content = PlanContent.sequenced(weeks: [
            PlanWeek(slots: [
                .workout(workoutId: "w1", dayOfWeek: .sat),
                .rest(dayOfWeek: nil),
            ])
        ])
        try roundTrips(content)
        XCTAssertEqual(try decode(PlanContent.self,
            #"{"type":"sequenced","weeks":[{"slots":[{"kind":"workout","workoutId":"w1","dayOfWeek":"sat"},{"kind":"rest"}]}]}"#),
            content)
    }

    func testPlanSlotEncoding() throws {
        XCTAssertEqual(try jsonObject(PlanSlot.workout(workoutId: "abc", dayOfWeek: .mon)),
                       ["kind": "workout", "workoutId": "abc", "dayOfWeek": "mon"])
        XCTAssertEqual(try jsonObject(PlanSlot.rest(dayOfWeek: nil)), ["kind": "rest"])
    }

    // MARK: A full custom workout, as the backend would return it

    func testCustomWorkoutDecodesFromBackendShape() throws {
        let json = #"""
        {
          "id": "w1", "name": "Chipper",
          "format": {"type":"amrap","durationSec":720},
          "blocks": [
            {"repeat": 3, "rows": [
              {"name":"Row","qty":500,"unit":"meters"},
              {"name":"Wall Balls","qty":20,"unit":"reps","weight":{"value":9,"unit":"kg"}},
              {"kind":"rest","restSec":60}
            ]}
          ],
          "typeId": "type-functional", "intensity": "hard",
          "notes": ["Unbroken wall balls"], "createdAt": 1730000000000, "archived": false
        }
        """#
        let w = try decode(CustomWorkout.self, json)
        XCTAssertEqual(w.name, "Chipper")
        XCTAssertEqual(w.format, .amrap(durationSec: 720))
        XCTAssertEqual(w.intensity, .hard)
        XCTAssertEqual(w.blocks.count, 1)
        XCTAssertEqual(w.blocks[0].repeatCount, 3)
        XCTAssertEqual(w.blocks[0].rows.count, 3)
        XCTAssertEqual(w.blocks[0].rows[2], .rest(restSec: 60))
        try roundTrips(w)
    }

    // MARK: summary — proves the exhaustive-switch behavior is wired

    func testWorkoutFormatSummaries() {
        XCTAssertEqual(WorkoutFormat.amrap(durationSec: 600).summary, "10 min AMRAP")
        XCTAssertEqual(WorkoutFormat.forTime.summary, "For time")
        XCTAssertEqual(WorkoutFormat.emom(everySec: 90, totalRounds: 8).summary, "EMOM 90s × 8")
    }
}
