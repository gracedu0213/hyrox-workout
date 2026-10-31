import Foundation

// The curated 12-week plan (60 days), decoded from curated_plan.json — an
// artifact generated from the web's src/plan.ts, the single source of truth.
// After editing plan.ts, rerun `npm run export:plan` to refresh it.

let PLAN: Plan = {
    guard let url = Bundle.main.url(forResource: "curated_plan", withExtension: "json"),
          let data = try? Data(contentsOf: url)
    else {
        fatalError("curated_plan.json missing from bundle — run `npm run export:plan`")
    }
    do {
        return try JSONDecoder().decode(Plan.self, from: data)
    } catch {
        fatalError("curated_plan.json failed to decode: \(error)")
    }
}()
