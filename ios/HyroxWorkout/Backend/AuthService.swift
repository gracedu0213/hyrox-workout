import Foundation
import Supabase

// Thin wrapper over Supabase Auth. The app offers passwordless email (a 6-digit
// code / magic link) and native Sign in with Apple — the "Both" choice.

struct AuthService {
    let client: SupabaseClient

    init(client: SupabaseClient = Backend.client) { self.client = client }

    /// Email a one-time code / magic link. Creates the user if new.
    func sendEmailCode(to email: String) async throws {
        try await client.auth.signInWithOTP(email: email)
    }

    /// Verify the emailed 6-digit code, establishing a session.
    func verifyEmailCode(email: String, code: String) async throws {
        try await client.auth.verifyOTP(email: email, token: code, type: .email)
    }

    /// Native Sign in with Apple — pass the identity token + nonce obtained from
    /// AuthenticationServices (ASAuthorizationAppleIDProvider).
    func signInWithApple(idToken: String, nonce: String) async throws {
        try await client.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(provider: .apple, idToken: idToken, nonce: nonce)
        )
    }

    func signOut() async throws { try await client.auth.signOut() }

    /// Lowercased to match Postgres' canonical uuid form (and the web).
    var currentUserID: String? { client.auth.currentUser?.id.uuidString.lowercased() }

    var isSignedIn: Bool { client.auth.currentSession != nil }
}
