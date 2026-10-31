import SwiftUI

// In-app navigation — the SwiftUI twin of the web's 15 react-router routes.
// Each tab keeps its own NavigationStack; pushes go to the current tab.

enum Tab: String, CaseIterable {
    case train = "Train"
    case plan = "Plan"
    case progress = "Progress"
}

enum Route: Hashable {
    case program(planId: String)                                              // /plan/program/:planId
    case planBuilder(editPlanId: String?)                                     // /plan/new · /plan/:id/edit
    case day(dayId: String)                                                   // /plan/:dayId
    case logDay(dayId: String, logId: String?, date: String?, planId: String?)        // /plan/:dayId/log
    case logWorkout(workoutId: String, logId: String?, date: String?, planId: String?) // /workout/:id/log
    case customLog(logId: String?, date: String?, planId: String?)            // /custom/log
    case workoutDetail(workoutId: String, planId: String?, date: String?)     // /workout/:id
    case workoutBuilder(editWorkoutId: String?)                               // /workout/new · /workout/:id/edit
    case logDetail(logId: String, celebrate: Bool)                            // /log/:logId (+?celebrate=1)
}

@MainActor
final class Router: ObservableObject {
    @Published var tab: Tab = .train
    @Published var trainPath = NavigationPath()
    @Published var planPath = NavigationPath()
    @Published var progressPath = NavigationPath()

    func push(_ route: Route) {
        switch tab {
        case .train: trainPath.append(route)
        case .plan: planPath.append(route)
        case .progress: progressPath.append(route)
        }
    }

    func pop() {
        switch tab {
        case .train: if !trainPath.isEmpty { trainPath.removeLast() }
        case .plan: if !planPath.isEmpty { planPath.removeLast() }
        case .progress: if !progressPath.isEmpty { progressPath.removeLast() }
        }
    }

    /// Replace the top route (web `navigate(..., {replace:true})`).
    func replace(with route: Route) {
        pop()
        push(route)
    }

    /// Jump to a tab's root (web cross-tab navigations like Fab → /plan).
    func go(_ tab: Tab) {
        self.tab = tab
        switch tab {
        case .train: trainPath = NavigationPath()
        case .plan: planPath = NavigationPath()
        case .progress: progressPath = NavigationPath()
        }
    }
}

/// Maps a Route to its destination view.
struct RouteView: View {
    let route: Route

    var body: some View {
        switch route {
        case .program(let planId):
            ProgramPage(planId: planId)
        case .planBuilder(let editPlanId):
            PlanBuilderPage(editPlanId: editPlanId)
        case .day(let dayId):
            DayPage(dayId: dayId)
        case .logDay(let dayId, let logId, let date, let planId):
            LogEntryPage(target: .day(dayId), logId: logId, presetDate: date, presetPlanId: planId)
        case .logWorkout(let workoutId, let logId, let date, let planId):
            LogEntryPage(target: .workout(workoutId), logId: logId, presetDate: date, presetPlanId: planId)
        case .customLog(let logId, let date, let planId):
            CustomLogPage(logId: logId, presetDate: date, presetPlanId: planId)
        case .workoutDetail(let workoutId, let planId, let date):
            WorkoutDetailPage(workoutId: workoutId, presetPlanId: planId, presetDate: date)
        case .workoutBuilder(let editWorkoutId):
            WorkoutBuilderPage(editWorkoutId: editWorkoutId)
        case .logDetail(let logId, let celebrate):
            LogDetailPage(logId: logId, celebrate: celebrate)
        }
    }
}
