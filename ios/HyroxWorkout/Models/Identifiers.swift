import Foundation

/// A fresh lowercase UUID string. Postgres `uuid` columns store the canonical
/// lowercase form, and the web app's `crypto.randomUUID()` is lowercase too — so
/// generating lowercase here keeps ids byte-identical across Swift, the DB, and
/// the web (otherwise Swift's uppercase `UUID().uuidString` fails to match a
/// value read back from a `uuid` column).
func newID() -> String { UUID().uuidString.lowercased() }
