import SwiftUI
import Supabase

// App entry: local cache loads first (offline-first), then the auth gate.
// Signed out → AuthScreen. Signed in → MainShell (+ mandatory first-run
// profile sheet). Auth state and foregrounding both trigger a sync.

struct RootView: View {
    @StateObject private var store = AppStore()
    @StateObject private var router = Router()
    @State private var loaded = false
    @State private var signedIn = false
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            HX.bg.ignoresSafeArea()
            if !loaded {
                ProgressView().tint(HX.accent)
            } else if !signedIn {
                AuthScreen()
            } else {
                MainShell()
            }
        }
        .environmentObject(store)
        .environmentObject(router)
        .preferredColorScheme(.dark)
        .tint(HX.accent)
        .task {
            await store.loadFromDisk()
            #if DEBUG
            await DemoSeed.run(store: store)
            if let tab = DemoSeed.startTab { router.tab = tab }
            #endif
            signedIn = store.auth.isSignedIn
            loaded = true
            for await (_, session) in Backend.client.auth.authStateChanges {
                let now = session != nil
                if now != signedIn { signedIn = now }
                if now { await store.syncNow() }
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await store.syncNow() } }
        }
    }
}

#Preview {
    RootView()
}
