# UAT Checklists (Backend + Mobile)

## UAT-1 Core API Readiness

### Entry criteria
- Environment deployed and reachable.
- Dataset A seeded.
- Swagger and DB connectivity validated.

### Checklist
- [ ] `POST /auth/login` valid credentials succeeds.
- [ ] `POST /auth/login` invalid password rejected with envelope.
- [ ] `POST /auth/refresh` rotates refresh token correctly.
- [ ] `GET /auth/me` without JWT returns unauthorized.
- [ ] `GET /pois/nearby` returns sorted nearby data with valid params.
- [ ] `GET /pois/nearby` invalid coordinates rejected.
- [ ] `GET /pois/{id}/public` returns only active POI content.
- [ ] `GET /languages` returns expected active languages.
- [ ] All sampled responses follow `ApiResponse<T>` structure.

### Exit criteria
- No open P0/P1 defects in auth, nearby, public detail, envelope consistency.

## UAT-2 Mobile Location and Narration

### Entry criteria
- UAT-1 passed.
- Android build installed on emulator and one physical device.

### Checklist
- [ ] App requests location permissions correctly on first launch.
- [ ] GPS change via `adb emu geo fix` updates in-app location status.
- [ ] Nearby list/map refresh after moving more than threshold distance.
- [ ] Geofence enter triggers expected POI based on priority.
- [ ] Debounce prevents rapid false trigger at geofence edge.
- [ ] Cooldown blocks repeated auto-play in cooldown window.
- [ ] Auto-play OFF sends notification/no auto narration.
- [ ] Manual play from POI detail works and updates local visit queue.
- [ ] Listen duration is recorded when playback completes.

### Exit criteria
- No open P0 defects in location update, geofence trigger, narration play path.

## UAT-3 Offline Resilience

### Entry criteria
- UAT-2 passed.
- Dataset C package metadata available.

### Checklist
- [ ] Offline package catalog loads when online.
- [ ] Package download/install succeeds and checksum validated.
- [ ] Nearby POIs still available with internet off.
- [ ] Sync now warns correctly when no package installed.
- [ ] Delta sync updates local data correctly (`new/update/delete`).
- [ ] Queue is preserved when visit upload fails.
- [ ] Queue flushes successfully after reconnect.
- [ ] Corrupt package install fails safely (no local data corruption).

### Exit criteria
- No open P0/P1 defects in package lifecycle, queue safety, sync correctness.

## UAT-4 Release Gate

### Entry criteria
- UAT-1/2/3 passed.
- Candidate release tag frozen.

### Checklist
- [ ] Full P0 regression suite passed.
- [ ] Mandatory P1 regression subset passed.
- [ ] No critical crash in 30-minute exploratory run (emulator + real device).
- [ ] Monitoring/logging can identify auth, sync, and geofence failures.
- [ ] Known issues list documented and approved by PM/Tech lead.
- [ ] QA report includes evidence: request/response logs, screenshots, run metadata.

### Exit criteria
- Release approved only when:
  - zero open P0
  - accepted P1 risk list signed by stakeholders
  - rollback plan verified

## Defect Severity and Decision Rules
- `Blocker` (P0): stop release immediately.
- `Critical` (P1): release only with explicit business sign-off and mitigation plan.
- `Major/Minor` (P2+): can be deferred to next sprint with ticket linkage.
