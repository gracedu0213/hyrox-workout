import Foundation
import SwiftData

// SwiftData model — local source of truth for user-entered logs.
// Will sync to Supabase later; for now lives locally on-device.

enum LogKind: String, Codable {
    case plan, custom, rest
}

enum FeltLike: String, Codable {
    case tough, ok, good
}

enum LogStatus: String, Codable {
    case planned, logged
}

@Model
final class WorkoutLog {
    @Attribute(.unique) var id: String
    var dayId: String?
    var customName: String?
    var kindRaw: String
    var date: String              // ISO yyyy-MM-dd
    var createdAt: Date

    var totalTimeSec: Int?
    var feltLikeRaw: String?
    var notes: String?
    var modifications: String?
    var statusRaw: String

    // Structured payloads stored as JSON blobs for now — typed accessors
    // can be added when we wire up specific entry UIs.
    var payloadData: Data?

    init(
        id: String = UUID().uuidString,
        dayId: String? = nil,
        customName: String? = nil,
        kind: LogKind = .plan,
        date: String,
        createdAt: Date = .now,
        totalTimeSec: Int? = nil,
        feltLike: FeltLike? = nil,
        notes: String? = nil,
        modifications: String? = nil,
        status: LogStatus = .planned,
        payloadData: Data? = nil
    ) {
        self.id = id
        self.dayId = dayId
        self.customName = customName
        self.kindRaw = kind.rawValue
        self.date = date
        self.createdAt = createdAt
        self.totalTimeSec = totalTimeSec
        self.feltLikeRaw = feltLike?.rawValue
        self.notes = notes
        self.modifications = modifications
        self.statusRaw = status.rawValue
        self.payloadData = payloadData
    }

    var kind: LogKind {
        get { LogKind(rawValue: kindRaw) ?? .plan }
        set { kindRaw = newValue.rawValue }
    }

    var feltLike: FeltLike? {
        get { feltLikeRaw.flatMap(FeltLike.init(rawValue:)) }
        set { feltLikeRaw = newValue?.rawValue }
    }

    var status: LogStatus {
        get { LogStatus(rawValue: statusRaw) ?? .planned }
        set { statusRaw = newValue.rawValue }
    }
}
