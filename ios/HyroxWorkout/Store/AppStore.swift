import Foundation
import SwiftUI

// The app's single source of truth — the iOS analog of src/db.ts. All reads
// come from these in-memory arrays (persisted to LocalStore on every
// mutation); every mutation also enqueues a sync op pushed to Supabase when
// online. Offline-first: the app is fully usable at the gym; sync catches up.

/// One queued mutation to replay against the backend. Deletes supersede
/// upserts for the same row; upserts are pushed from current store state.
struct PendingOp: Codable, Hashable {
    enum Kind: String, Codable { case upsert, delete }
    enum Table: String, Codable { case logs, workouts, plans, types, profile }
    var kind: Kind
    var table: Table
    var id: String
}

@MainActor
final class AppStore: ObservableObject {
    @Published private(set) var logs: [WorkoutLog] = []
    @Published private(set) var workouts: [CustomWorkout] = []  // archived included
    @Published private(set) var plans: [UserPlan] = []          // archived included
    @Published private(set) var types: [WorkoutType] = []
    @Published private(set) var profile: UserProfile?
    @Published private(set) var syncing = false

    private let local: LocalStore
    private let logRepo: LogRepository
    private let workoutRepo: WorkoutRepository
    private let planRepo: PlanRepository
    private let typeRepo: TypeRepository
    private let profileRepo: ProfileRepository
    let auth: AuthService

    private var ops: [PendingOp] = []

    init(local: LocalStore = LocalStore(),
         logRepo: LogRepository = LogRepository(),
         workoutRepo: WorkoutRepository = WorkoutRepository(),
         planRepo: PlanRepository = PlanRepository(),
         typeRepo: TypeRepository = TypeRepository(),
         profileRepo: ProfileRepository = ProfileRepository(),
         auth: AuthService = AuthService()) {
        self.local = local
        self.logRepo = logRepo
        self.workoutRepo = workoutRepo
        self.planRepo = planRepo
        self.typeRepo = typeRepo
        self.profileRepo = profileRepo
        self.auth = auth
    }

    // MARK: - Lifecycle

    /// Load the on-device cache; call once at launch before showing UI.
    func loadFromDisk() async {
        logs = await local.load("logs.json", as: [WorkoutLog].self) ?? []
        workouts = await local.load("workouts.json", as: [CustomWorkout].self) ?? []
        plans = await local.load("plans.json", as: [UserPlan].self) ?? []
        types = await local.load("types.json", as: [WorkoutType].self) ?? []
        profile = await local.load("profile.json", as: UserProfile.self)
        ops = await local.load("ops.json", as: [PendingOp].self) ?? []
    }

    // MARK: - Queries (mirror db.ts)

    /// Newest first, like getAllLogs().
    var allLogs: [WorkoutLog] { logs.sorted { $0.createdAt > $1.createdAt } }

    func log(id: String) -> WorkoutLog? { logs.first { $0.id == id } }

    func logsForDate(_ date: String) -> [WorkoutLog] { logs.filter { $0.date == date } }

    func logsForDay(_ dayId: String) -> [WorkoutLog] {
        logs.filter { $0.dayId == dayId }.sorted { $0.createdAt > $1.createdAt }
    }

    func logsForPlan(_ planId: String) -> [WorkoutLog] { logs.filter { $0.planId == planId } }

    /// Non-archived, newest first, like getCustomWorkouts().
    var customWorkouts: [CustomWorkout] {
        workouts.filter { $0.archived != true }.sorted { $0.createdAt > $1.createdAt }
    }

    func workout(id: String) -> CustomWorkout? { workouts.first { $0.id == id } }

    /// Non-archived, newest first, like getPlans().
    var visiblePlans: [UserPlan] {
        plans.filter { $0.archived != true }.sorted { $0.createdAt > $1.createdAt }
    }

    var activePlans: [UserPlan] { plans.filter { $0.active && $0.archived != true } }

    func plan(id: String) -> UserPlan? { plans.first { $0.id == id } }

    /// Oldest first (defaults lead), like getWorkoutTypes().
    var sortedTypes: [WorkoutType] { types.sorted { $0.createdAt < $1.createdAt } }

    var typeResolver: LogTypeResolver { LogTypeResolver(types: types, workouts: workouts) }

    // MARK: - Mutations (each persists + queues a sync op)

    func saveLog(_ log: WorkoutLog) {
        upsert(log, into: \.logs)
        enqueue(.init(kind: .upsert, table: .logs, id: log.id))
        persistLogs()
    }

    func deleteLog(id: String) {
        logs.removeAll { $0.id == id }
        enqueue(.init(kind: .delete, table: .logs, id: id))
        persistLogs()
    }

    func saveWorkout(_ w: CustomWorkout) {
        upsert(w, into: \.workouts)
        enqueue(.init(kind: .upsert, table: .workouts, id: w.id))
        persistWorkouts()
    }

    func deleteWorkout(id: String) {
        workouts.removeAll { $0.id == id }
        enqueue(.init(kind: .delete, table: .workouts, id: id))
        persistWorkouts()
    }

    func savePlan(_ p: UserPlan) {
        upsert(p, into: \.plans)
        enqueue(.init(kind: .upsert, table: .plans, id: p.id))
        persistPlans()
    }

    func archivePlan(id: String) {
        guard var p = plan(id: id) else { return }
        p.archived = true
        p.active = false
        savePlan(p)
    }

    func saveType(_ t: WorkoutType) {
        upsert(t, into: \.types)
        enqueue(.init(kind: .upsert, table: .types, id: t.id))
        Task { await local.save(types, to: "types.json") }
        scheduleSync()
    }

    func saveProfile(_ p: UserProfile) {
        profile = p
        enqueue(.init(kind: .upsert, table: .profile, id: "profile"))
        Task { await local.save(p, to: "profile.json") }
        scheduleSync()
    }

    private func upsert<T: Identifiable>(_ value: T, into keyPath: ReferenceWritableKeyPath<AppStore, [T]>) {
        var arr = self[keyPath: keyPath]
        if let i = arr.firstIndex(where: { $0.id == value.id }) {
            arr[i] = value
        } else {
            arr.append(value)
        }
        self[keyPath: keyPath] = arr
    }

    private func persistLogs() {
        Task { await local.save(logs, to: "logs.json") }
        scheduleSync()
    }

    private func persistWorkouts() {
        Task { await local.save(workouts, to: "workouts.json") }
        scheduleSync()
    }

    private func persistPlans() {
        Task { await local.save(plans, to: "plans.json") }
        scheduleSync()
    }

    // MARK: - Sync (push queued ops, then pull-replace; last write wins)

    private func enqueue(_ op: PendingOp) {
        // A newer op for the same row supersedes the queued one.
        ops.removeAll { $0.table == op.table && $0.id == op.id }
        ops.append(op)
        Task { await local.save(ops, to: "ops.json") }
    }

    private func scheduleSync() {
        Task { await syncNow() }
    }

    func syncNow() async {
        guard !syncing, let userID = auth.currentUserID else { return }
        syncing = true
        defer { syncing = false }

        // Push — replay queued mutations from current state.
        let batch = ops
        do {
            for op in batch {
                switch (op.table, op.kind) {
                case (.logs, .upsert):
                    if let l = log(id: op.id) { try await logRepo.save(l, userID: userID) }
                case (.logs, .delete):
                    try await logRepo.delete(id: op.id)
                case (.workouts, .upsert):
                    if let w = workout(id: op.id) { try await workoutRepo.save(w, userID: userID) }
                case (.workouts, .delete):
                    try await workoutRepo.delete(id: op.id)
                case (.plans, .upsert):
                    if let p = plan(id: op.id) { try await planRepo.save(p, userID: userID) }
                case (.types, .upsert):
                    if let t = types.first(where: { $0.id == op.id }) { try await typeRepo.save(t, userID: userID) }
                case (.profile, .upsert):
                    if let p = profile { try await profileRepo.save(p, userID: userID) }
                case (.plans, .delete), (.types, .delete), (.profile, .delete):
                    break // plans archive (upsert); types/profile have no delete
                }
            }
        } catch {
            // Offline or transient failure — keep ops queued for the next pass.
            return
        }
        ops.removeAll { batch.contains($0) }
        await local.save(ops, to: "ops.json")

        // Pull — server state (which just absorbed our push) replaces local.
        do {
            async let logsPull = logRepo.fetchAll()
            async let workoutsPull = workoutRepo.fetchAll()
            async let plansPull = planRepo.fetchAll()
            async let typesPull = typeRepo.fetchAll()
            let (logs, workouts, plans, types) = try await (logsPull, workoutsPull, plansPull, typesPull)
            self.logs = logs
            self.workouts = workouts
            self.plans = plans
            self.types = types
            if let remote = try await profileRepo.fetch(userID: userID) {
                profile = remote
            } else if let profile {
                try await profileRepo.save(profile, userID: userID)
            }
            await local.save(logs, to: "logs.json")
            await local.save(workouts, to: "workouts.json")
            await local.save(plans, to: "plans.json")
            await local.save(types, to: "types.json")
            if let profile { await local.save(profile, to: "profile.json") }
        } catch {
            // Pull failure leaves the local cache authoritative until next sync.
        }
    }

    /// Sign out: drop the local cache (it belongs to the signed-out account).
    func signOut() async {
        try? await auth.signOut()
        logs = []; workouts = []; plans = []; types = []; profile = nil; ops = []
        await local.wipe()
    }
}
