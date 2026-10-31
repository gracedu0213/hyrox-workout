import SwiftUI

// Sign-in gate: passwordless email (6-digit code). Sign in with Apple joins
// at P6 — the entitlement needs the Apple Developer account.

struct AuthScreen: View {
    @EnvironmentObject private var store: AppStore
    @State private var email = ""
    @State private var code = ""
    @State private var codeSent = false
    @State private var busy = false
    @State private var error: String?
    @FocusState private var focus: Field?

    private enum Field { case email, code }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()

            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("HYROX")
                        .font(.display(40))
                        .tracking(-1)
                    Text("TRACKER")
                        .font(.system(size: 13, weight: .semibold))
                        .tracking(3)
                        .foregroundStyle(HX.accent)
                }
                Text("Train hard. Log everything.")
                    .font(.display(34))
                    .tracking(-0.8)
                    .gradientText()
            }

            VStack(alignment: .leading, spacing: 12) {
                if !codeSent {
                    SectionLabel(text: "Email")
                    TextField("you@example.com", text: $email)
                        .textFieldStyle(HXFieldStyle())
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focus, equals: .email)
                    Button(busy ? "Sending…" : "Send code") { sendCode() }
                        .buttonStyle(AccentButtonStyle())
                        .disabled(busy || !email.contains("@"))
                } else {
                    SectionLabel(text: "Enter the 6-digit code sent to \(email)")
                    TextField("123456", text: $code)
                        .textFieldStyle(HXFieldStyle())
                        .keyboardType(.numberPad)
                        .focused($focus, equals: .code)
                    Button(busy ? "Verifying…" : "Verify") { verify() }
                        .buttonStyle(AccentButtonStyle())
                        .disabled(busy || code.count < 6)
                    Button("Use a different email") {
                        codeSent = false
                        code = ""
                    }
                    .font(.system(size: 13))
                    .foregroundStyle(HX.muted)
                }
                if let error {
                    Text(error)
                        .font(.system(size: 13))
                        .foregroundStyle(HX.engine)
                }
            }

            Spacer()
            Spacer()
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(HX.bg)
        .foregroundStyle(.white)
        .onAppear { focus = .email }
    }

    private func sendCode() {
        busy = true
        error = nil
        Task {
            defer { busy = false }
            do {
                try await store.auth.sendEmailCode(to: email)
                codeSent = true
                focus = .code
            } catch {
                self.error = "Couldn't send the code. Check the address and try again."
            }
        }
    }

    private func verify() {
        busy = true
        error = nil
        Task {
            defer { busy = false }
            do {
                try await store.auth.verifyEmailCode(email: email, code: code)
                // RootView's auth stream flips the gate.
            } catch {
                self.error = "That code didn't work — double-check it or resend."
            }
        }
    }
}
