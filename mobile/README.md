# LaundryKing Scanner (Chainway C72)

Native Android app for the **Chainway C72** UHF RFID handheld. It reads linen tags and
uploads scan events to the LinenFlow backend `POST /v1/sync/batch` — the same contract the
web Check-in/Dispatch pages use. See the full contract in
[`../docs/device/chainway-c72-integration.md`](../docs/device/chainway-c72-integration.md).

**Status: v0.1.0 — first buildable APK.** Built and packaged (native SDK + classes verified),
but **not yet tested on real C72 hardware** — the RFID read path can only be exercised on the device.

## What it does
- **Login** (`/v1/auth/login`) → stores JWT (+ refresh, silent retry on 401). Configurable base
  URL / branch / device id.
- **Mode-first scan**: Register / Pickup (→Washing) / Dispatch (→On-Rent) / Return (→In Stock) /
  Stock check → each scanned EPC becomes the matching `/sync/batch` event.
- **UHF reading** via `com.rscja.deviceapi.RFIDWithUHFUART` (hardware trigger key or on-screen
  Start/Stop). Manual tag entry also works (and USB keyboard-wedge readers type into the field).
- **Offline-first**: events are written to a local file queue (`ScanQueue`) first, then uploaded;
  idempotent via a per-scan `clientUuid`, so retries are safe. `Sync reference` caches the branch's
  customers + open job orders.

## Build
Prereqs: JDK 17 + Android SDK (platform 34, build-tools 34). Then:
```bash
cd mobile
echo "sdk.dir=/path/to/Android/Sdk" > local.properties   # or set ANDROID_HOME
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```
Install on the C72: `adb install -r app/build/outputs/apk/debug/app-debug.apk`
(or copy the APK over and tap it, allowing "install from unknown sources").

## RFID SDK
`app/libs/DeviceAPI.aar` is Chainway's `com.rscja.deviceapi` (UART UHF + native `.so` for
arm64-v8a / armeabi-v7a / armeabi). This is the community-mirrored `DeviceAPI_ver20220518`.
**Recommended:** replace it with the official latest for the C72 (chainway.net → Support → C72,
`API_Ver20251103`) matched to the device firmware; the wrapper in `rfid/UhfReader.kt` uses only the
stable core API (`getInstance`/`init`/`startInventoryTag`/`stopInventory`/`setInventoryCallback`).

## Known limitations / next steps
- Not hardware-tested — verify trigger keycode, read power, and `getEPC()` output on the C72.
- Register mode sends a free-text `type`; wire an Article picker (from cached reference) for real SKUs.
- Dispatch job-order id is a text field; turn it into a picker from the cached open job orders.
- Offline queue is a JSON file (fine for the single-scanner MVP); move to Room if volume grows.
- Debug build is debug-signed. Produce a signed release (`assembleRelease` + a keystore) for rollout.
