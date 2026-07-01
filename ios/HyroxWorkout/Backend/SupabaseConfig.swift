import Foundation
import Supabase

// Environment-aware Supabase client. DEBUG builds talk to the local stack
// (`supabase start`); release builds target the hosted project. Staging =
// "The Hyrox App"; production is provisioned at launch (see supabase/README.md).

enum AppEnvironment {
    case local, staging, production

    static let current: AppEnvironment = {
        #if DEBUG
        return .local
        #else
        return .staging   // flip to .production once that project exists
        #endif
    }()

    var apiURL: URL {
        switch self {
        case .local:      return URL(string: "http://127.0.0.1:54321")!
        case .staging:    return URL(string: "https://bhnkoxqhgfoeowwqryra.supabase.co")!
        case .production: return URL(string: "https://REPLACE-AT-LAUNCH.supabase.co")!
        }
    }

    /// Public client key — safe to embed. RLS is what protects data.
    var anonKey: String {
        switch self {
        case .local:
            return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
        case .staging:    return ""   // TODO: publishable/anon key from "The Hyrox App" settings
        case .production: return ""   // TODO: set at launch
        }
    }
}

enum Backend {
    static let client = SupabaseClient(
        supabaseURL: AppEnvironment.current.apiURL,
        supabaseKey: AppEnvironment.current.anonKey
    )
}
