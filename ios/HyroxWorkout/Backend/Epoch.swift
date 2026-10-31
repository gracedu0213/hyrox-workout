import Foundation

// The domain keeps `createdAt` as epoch milliseconds (matching the web's
// `number`); Postgres keeps `created_at timestamptz`. These map between them —
// supabase-swift's coders handle the ISO string ↔ Date leg.

extension Date {
    var epochMillis: Double { timeIntervalSince1970 * 1000 }

    init(epochMillis: Double) {
        self.init(timeIntervalSince1970: epochMillis / 1000)
    }
}
