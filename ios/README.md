# HyroxWorkout — iOS

Native iOS app, Swift + SwiftUI, iOS 17+.

## Generate Xcode project

The `.xcodeproj` is generated from `project.yml` (not committed). After cloning:

```bash
cd ios
xcodegen generate
open HyroxWorkout.xcodeproj
```

## Build from command line

```bash
cd ios
xcodebuild -project HyroxWorkout.xcodeproj -scheme HyroxWorkout \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```
