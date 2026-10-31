import Foundation

// File-backed persistence — the iOS analog of the web's IndexedDB. Each table
// is one JSON file of domain objects (Codable byte-parity with Supabase
// `data`), written atomically on every mutation. The data set is tiny (a year
// of training is a few hundred rows), so whole-table writes are simpler and
// safer than a database dependency.

actor LocalStore {
    private let dir: URL

    init(directory: URL? = nil) {
        if let directory {
            dir = directory
        } else {
            let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            dir = base.appendingPathComponent("HyroxStore", isDirectory: true)
        }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }

    func load<T: Decodable>(_ file: String, as type: T.Type) -> T? {
        let url = dir.appendingPathComponent(file)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    func save<T: Encodable>(_ value: T, to file: String) {
        let url = dir.appendingPathComponent(file)
        guard let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: url, options: .atomic)
    }

    func wipe() {
        try? FileManager.default.removeItem(at: dir)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
}
