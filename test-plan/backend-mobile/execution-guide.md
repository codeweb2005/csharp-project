# Execution Guide (Backend + Mobile)

## 1) Environment Preparation

### Backend
1. Start API:
   - `cd backend/src/VinhKhanh.API`
   - `dotnet run`
2. Verify health:
   - Open `http://localhost:5015/swagger`
3. Ensure DB scripts and QA seed are applied.

### Mobile
1. Set `mobile/VinhKhanh.Mobile/appsettings.json`:
   - Emulator: `http://10.0.2.2:5015/api/v1`
   - Physical device: `http://<host-ip>:5015/api/v1`
2. Build/install:
   - `cd mobile/VinhKhanh.Mobile`
   - `dotnet build -f net10.0-android -c Debug`
   - `adb install -r bin/Debug/net10.0-android/com.vinhkhanh.foodtour-Signed.apk`

## 2) Deterministic GPS Mocking

### Emulator commands
- Point A: `adb emu geo fix 106.6932 10.7538`
- Point B: `adb emu geo fix 106.6940 10.7544`
- Point C: `adb emu geo fix 106.6951 10.7554`
- Point D: `adb emu geo fix 106.6970 10.7561`

Recommended run sequence:
1. Launch app, wait for initial nearby load.
2. Move A -> B (short step) and observe status/location refresh.
3. Move B -> C and validate geofence behavior.
4. Move C -> D and validate route transition.

### Physical device
- Use a trusted mock-location app in developer mode.
- Keep one test run with real GPS for parity.

## 3) Test Execution Order
1. Run `test-scenarios.md` P0 cases first.
2. If all P0 pass, run mandatory P1 regression subset.
3. Run UAT phase checklist in order:
   - UAT-1 -> UAT-2 -> UAT-3 -> UAT-4.

## 4) Evidence Collection

For each test case:
- Test ID
- Build SHA/version
- Dataset version (A/B/C)
- Device/emulator details
- Request/response capture (for API tests)
- Screenshot/screen recording for mobile behavior
- Pass/Fail + defect ticket link

Suggested evidence folder:
- `test-plan/backend-mobile/evidence/<run-id>/`

## 5) Defect Logging Template

- `Title`: `[Suite][Severity] Short description`
- `Environment`: local/staging + build
- `Preconditions`
- `Steps to reproduce`
- `Expected`
- `Actual`
- `Attachments`: logs/screenshots/video
- `Impact`: auth / geofence / narration / sync / offline

## 6) Reset and Rerun Strategy

### Quick rerun
- Clear app data on emulator/device.
- Reinstall APK.
- Reseed QA dataset quick script.

### Clean rerun
- Recreate DB from baseline scripts + QA seed scripts.
- Rebuild backend and mobile.
- Repeat same GPS route points for reproducibility.

## 7) Minimum Release Sign-off Package
- Completed `uat-checklists.md`
- Summary sheet: pass rate by suite
- Open defects grouped by severity
- Risk acceptance note for deferred P1/P2 issues
- Go/No-Go recommendation from QA lead
