# FITback for Garmin

A Connect IQ watch app that shows today's classes and the lesson plan for each one.
The iPhone app pushes the data over Bluetooth, so the watch never talks to a server.

- App id `7b4c9e2a3f514d689c072e5a8f1b6d34` — the same UUID the iPhone side uses in
  `ios/App/App/GarminBridge/GarminBridge.swift`, without the dashes. If you change one,
  change both or the phone and the watch stop finding each other.
- Targets: vivoactive 3 through 6.

## Building

```bash
npm run watch:build        # build a .prg for the first installed vivoactive
npm run watch:sim          # build and launch it in the Connect IQ simulator
node scripts/watch-build.mjs --device=vivoactive4
node scripts/watch-build.mjs --release   # signed build for the real watch
```

The build script finds the JDK, the SDK and the device files itself and tells you what's
missing instead of failing with a stack trace. A `developer_key` is generated on first run
and is git-ignored — keep it, it's what signs every build of this app.

## One-time setup

Already done on this Mac:

- Java 17 in `~/.jdks` (the Connect IQ compiler is a Java tool).
- Connect IQ SDK in `~/Library/Application Support/Garmin/ConnectIQ/Sdks`.
- The SDK Manager in `/Applications/SdkManager.app`.

Still needs you, because Garmin only serves the device library to a signed-in account:

1. Open `/Applications/SdkManager.app` and sign in with your Garmin account.
2. Devices tab, download your vivoactive model.
3. Run `npm run watch:build`.

## Installing on the watch

1. `node scripts/watch-build.mjs --release`
2. Connect the watch over USB. On Apple Silicon macOS won't mount it as a disk, so use
   [OpenMTP](https://openmtp.ganeshrvel.com) to browse it.
3. Copy `watch-garmin/bin/fitback.prg` into `GARMIN/APPS/` on the watch.
4. Eject and the app appears in the watch's app list.

## How the phone and the watch talk

- The iPhone sends one message per sync: `{ d: "<day label>", c: [ ...classes ] }`, where each
  class carries its time, title and the plan's sections and exercises. `buildWatchPayload` in
  `src/utils/liveClasses.ts` trims plans until the payload fits in the Connect IQ size limit.
- The watch caches the last payload in `Application.Storage`, so opening it out of range still
  shows the last known day.
- On launch the watch asks the phone for a fresh copy; `GarminSync` on the phone answers that,
  and also pushes automatically when the app opens, when the schedule changes, or when the app
  comes back to the foreground.
