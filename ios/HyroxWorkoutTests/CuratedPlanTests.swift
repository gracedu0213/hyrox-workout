import XCTest
@testable import HyroxWorkout

// Proves the bundled curated_plan.json (generated from src/plan.ts by
// scripts/export-curated-plan.ts) decodes fully and round-trips — i.e. the
// Swift Codable types are byte-compatible with the web's plan schema.

final class CuratedPlanTests: XCTestCase {

    func testAllSixtyDaysDecode() {
        XCTAssertEqual(PLAN.days.count, 60)
        // 12 weeks × mon–fri, every id resolvable.
        for week in 1...12 {
            let days = PLAN.days.filter { $0.week == week }
            XCTAssertEqual(days.count, 5, "week \(week)")
            XCTAssertEqual(days.map(\.dayOfWeek), [.mon, .tue, .wed, .thu, .fri], "week \(week)")
        }
    }

    func testKnownDaysMatchSource() throws {
        let w01mon = try XCTUnwrap(PLAN.day(id: "w01-mon"))
        XCTAssertEqual(w01mon.setup, .rft(rounds: 4))
        XCTAssertEqual(w01mon.workoutLabel, "4 RFT")
        XCTAssertEqual(w01mon.category, .foundation)
        XCTAssertEqual(w01mon.exercises.count, 4)
        let kb = try XCTUnwrap(w01mon.exercises[1].weight)
        XCTAssertEqual(kb.kgM, 24)
        XCTAssertEqual(kb.count, 2)

        let w12tue = try XCTUnwrap(PLAN.day(id: "w12-tue"))
        XCTAssertEqual(w12tue.setup, .amrap(durationSec: 2400))
        let ladder = try XCTUnwrap(w12tue.exercises.first?.ladder)
        XCTAssertEqual(ladder.start, 10)
        XCTAssertEqual(ladder.step, 5)
        XCTAssertEqual(ladder.openEnded, true)
    }

    func testPlanRoundTripsThroughCodable() throws {
        let encoded = try JSONEncoder().encode(PLAN)
        let back = try JSONDecoder().decode(Plan.self, from: encoded)
        XCTAssertEqual(back.days, PLAN.days)
    }

    func testPhaseOfWeekMatchesWeb() {
        XCTAssertEqual(phaseOf(week: 4), .base)
        XCTAssertEqual(phaseOf(week: 5), .pace)
        XCTAssertEqual(phaseOf(week: 9), .accelerate)
        XCTAssertEqual(phaseOf(week: 11), .prime)
        XCTAssertEqual(phaseOf(week: 12), .race)
        // The bundled data agrees with the derivation.
        for d in PLAN.days { XCTAssertEqual(d.phase, phaseOf(week: d.week), d.id) }
    }
}

// Pins WorkoutSetup + WorkoutLog JSON to the exact web shapes.
final class LogCodableTests: XCTestCase {

    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(json.utf8))
    }

    func testWorkoutSetupDecodesWebShapes() throws {
        XCTAssertEqual(try decode(WorkoutSetup.self, #"{"type":"for_time"}"#), .forTime)
        XCTAssertEqual(try decode(WorkoutSetup.self, #"{"type":"rft","rounds":4}"#), .rft(rounds: 4))
        XCTAssertEqual(
            try decode(WorkoutSetup.self, #"{"type":"ladder","sequence":[5,10,15],"ascending":true,"openEnded":true}"#),
            .ladder(sequence: [5, 10, 15], ascending: true, openEnded: true))
        XCTAssertEqual(
            try decode(WorkoutSetup.self, #"{"type":"intervals","rounds":8,"restSec":120,"workDescription":"400m run"}"#),
            .intervals(rounds: 8, workSec: nil, restSec: 120, workDescription: "400m run"))
        XCTAssertEqual(
            try decode(WorkoutSetup.self, #"{"type":"multi_window_amrap","windows":[{"label":"0:00 - 12:00","durationSec":720}]}"#),
            .multiWindowAmrap(windows: [MultiWindow(label: "0:00 - 12:00", durationSec: 720, exerciseRefs: nil)]))
    }

    func testWorkoutSetupEncodesDiscriminator() throws {
        let data = try JSONEncoder().encode(WorkoutSetup.rft(rounds: 3))
        let obj = try JSONSerialization.jsonObject(with: data) as! NSDictionary
        XCTAssertEqual(obj, ["type": "rft", "rounds": 3])
    }

    func testWorkoutLogDecodesWebShape() throws {
        let json = #"""
        {
          "id": "abc", "kind": "custom", "customName": "Engine",
          "workoutId": "w1", "planId": "p1", "typeId": "t1", "intensity": "hard",
          "date": "2026-07-02", "createdAt": 1780000000000,
          "totalTimeSec": 1122,
          "roundSplits": [{"roundIndex": 0, "splitSec": 300}],
          "amrap": {"fullRounds": 5, "partialReps": 12},
          "intervals": {"splits": [{"roundIndex": 0, "valueSec": 90, "reps": 10}]},
          "exercises": [{"exerciseName": "Row", "weightUsed": "24kg x 2"}],
          "feltLike": "good", "notes": "solid", "status": "logged",
          "workoutSnapshot": {
            "name": "Engine", "setup": {"type": "amrap", "durationSec": 720},
            "exercises": [{"name": "Row", "qty": 500, "unit": "meters"}],
            "blocks": [{"repeat": 1, "rows": [{"name": "Row", "qty": 500, "unit": "meters"}]}],
            "notes": []
          }
        }
        """#
        let log = try decode(WorkoutLog.self, json)
        XCTAssertEqual(log.kind, .custom)
        XCTAssertEqual(log.totalTimeSec, 1122)
        XCTAssertEqual(log.amrap?.fullRounds, 5)
        XCTAssertEqual(log.workoutSnapshot?.setup, .amrap(durationSec: 720))
        XCTAssertEqual(log.feltLike, .good)
        XCTAssertEqual(log.status, .logged)

        // Round-trip preserves everything.
        let back = try JSONDecoder().decode(WorkoutLog.self, from: JSONEncoder().encode(log))
        XCTAssertEqual(back, log)
    }
}
