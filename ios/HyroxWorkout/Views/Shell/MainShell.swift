import SwiftUI

// The app frame: header (brand + avatar), one NavigationStack per tab, and
// the 3-item bottom nav — mirroring the web shell 1:1. System nav bars stay
// hidden; pages render web-style "← Back" links.

struct MainShell: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var router: Router
    @State private var showProfile = false

    private var needsProfile: Bool { store.profile == nil }

    var body: some View {
        VStack(spacing: 0) {
            HeaderBar { showProfile = true }

            ZStack {
                tabStack(.train, path: $router.trainPath) { HomePage() }
                    .opacity(router.tab == .train ? 1 : 0)
                tabStack(.plan, path: $router.planPath) { LibraryPage() }
                    .opacity(router.tab == .plan ? 1 : 0)
                tabStack(.progress, path: $router.progressPath) { ProgressPage() }
                    .opacity(router.tab == .progress ? 1 : 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            BottomNavBar(tab: $router.tab)
        }
        .background(HX.bg.ignoresSafeArea())
        .foregroundStyle(.white)
        .sheet(isPresented: $showProfile) {
            ProfileSheet(firstRun: false)
        }
        .sheet(isPresented: .constant(needsProfile)) {
            ProfileSheet(firstRun: true)
                .interactiveDismissDisabled()
        }
    }

    private func tabStack<Root: View>(_ tab: Tab, path: Binding<NavigationPath>,
                                      @ViewBuilder root: () -> Root) -> some View {
        NavigationStack(path: path) {
            root()
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(for: Route.self) { route in
                    RouteView(route: route)
                        .toolbar(.hidden, for: .navigationBar)
                        .background(HX.bg.ignoresSafeArea())
                }
                .background(HX.bg.ignoresSafeArea())
        }
    }
}

private struct HeaderBar: View {
    @EnvironmentObject private var store: AppStore
    let onProfile: () -> Void

    private var initial: String {
        store.profile?.firstName.first.map { String($0).uppercased() } ?? "?"
    }

    var body: some View {
        HStack {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("HYROX")
                    .font(.display(20))
                    .tracking(-0.5)
                Text("TRACKER")
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(2.5)
                    .foregroundStyle(HX.accent)
            }
            Spacer()
            Button(action: onProfile) {
                Text(initial)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(HX.accent)
                    .frame(width: 32, height: 32)
                    .background(HX.panel2)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(HX.line))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .bottom)
    }
}

private struct BottomNavBar: View {
    @Binding var tab: Tab

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Tab.allCases, id: \.self) { t in
                Button {
                    tab = t
                } label: {
                    Text(t.rawValue.uppercased())
                        .font(.system(size: 12, weight: .medium))
                        .tracking(1.5)
                        .foregroundStyle(tab == t ? HX.accent : HX.muted)
                        .frame(maxWidth: .infinity, minHeight: 56)
                }
                .buttonStyle(.plain)
            }
        }
        .background(HX.panel)
        .overlay(Rectangle().fill(HX.line).frame(height: 1), alignment: .top)
    }
}
