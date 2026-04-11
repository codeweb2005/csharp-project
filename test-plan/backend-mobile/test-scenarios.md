# Backend + Mobile Test Scenarios

## Priority Scale
- `P0`: Release blocker, must pass before deploy
- `P1`: Critical business flow, must pass in regression
- `P2`: Important quality flow, can be deferred with risk sign-off

## Suite 1 - API Contract and Security

| ID | Priority | Area | Preconditions | Steps | Expected |
|---|---|---|---|---|---|
| API-SEC-001 | P0 | Auth login | User account exists | Call `POST /auth/login` with valid credentials | `200`, `success=true`, access+refresh returned |
| API-SEC-002 | P0 | Auth login | User exists | Call `POST /auth/login` with wrong password | `401/400` per implementation, `success=false`, error code/message present |
| API-SEC-003 | P0 | Refresh token rotation | Valid refresh token from login | Call `POST /auth/refresh` twice with token chaining | First refresh succeeds and returns new pair; second refresh with old token is rejected |
| API-SEC-004 | P0 | Auth boundary | No JWT | Call protected endpoint `GET /auth/me` | `401` + `UNAUTHORIZED` envelope |
| API-SEC-005 | P1 | Profile update | Logged in customer | Call `PUT /auth/profile` with valid payload | `200`, profile fields updated |
| API-SEC-006 | P1 | Change password | Logged in user | Call `POST /auth/change-password` wrong current pwd then correct current pwd | Wrong current rejected; correct current accepted |
| API-SEC-007 | P1 | Register flow | New email | Call `POST /auth/register` | `200`, immediate token issuance, role customer |
| API-SEC-008 | P1 | Envelope consistency | Any endpoint set | Run sample calls to `languages`, `pois/nearby`, `auth/me` | All responses follow `{ success, data, error }` |

## Suite 2 - Location, Nearby and Geofence

| ID | Priority | Area | Preconditions | Steps | Expected |
|---|---|---|---|---|---|
| LOC-GEO-001 | P0 | Nearby API | Seeded POIs near Vinh Khanh | `GET /pois/nearby` with valid `lat,lng,radiusMeters` | Sorted by distance ascending, only POIs in radius |
| LOC-GEO-002 | P0 | Nearby validation | None | Send invalid latitude/longitude values | `400`, `VALIDATION_ERROR`, no server crash |
| LOC-GEO-003 | P0 | Emulator GPS update | App open on main/map view | `adb emu geo fix` move >50m | Status text updates, nearby list/map refreshes with new coordinates |
| LOC-GEO-004 | P1 | Debounce behavior | Geofence radius configured | Simulate jitter around edge of radius | No false rapid enter/exit events before debounce threshold |
| LOC-GEO-005 | P1 | Cooldown behavior | Auto-play enabled | Enter same POI twice within cooldown | Second trigger blocked until cooldown expires |
| LOC-GEO-006 | P1 | Priority resolution | 2+ POIs overlap | Move into overlapping geofence area | Only winning POI by priority is auto-triggered |
| LOC-GEO-007 | P2 | GPS disabled | Device/emulator location off | Open app then enable GPS | App shows warning then recovers when GPS re-enabled |

## Suite 3 - Narration and Visit Tracking

| ID | Priority | Area | Preconditions | Steps | Expected |
|---|---|---|---|---|---|
| NAR-VIS-001 | P0 | Geofence visit enqueue | Logged-in user, geofence trigger | Trigger geofence enter | Queue increments, event has triggerType=`geofence` and coordinates |
| NAR-VIS-002 | P0 | Manual visit enqueue | Open POI detail | Tap Play narration | Queue increments, triggerType=`manual` |
| NAR-VIS-003 | P1 | Listen duration | Narration starts | Let playback complete | Latest visit listenDuration updated > 0 |
| NAR-VIS-004 | P0 | Visit sync upload | Pending queue + internet | Trigger sync/flush path | `POST /sync/visits` success, queue cleared |
| NAR-VIS-005 | P1 | Upload failure recovery | Force API failure | Attempt upload | Queue restored, no visit loss |
| NAR-VIS-006 | P1 | Auto-play toggle | Auto-play off | Enter geofence | Notification only, no auto playback |
| NAR-VIS-007 | P2 | Audio stream fallback | POI without audio URL | Play narration | TTS fallback path works |

## Suite 4 - Offline Package and Delta Sync

| ID | Priority | Area | Preconditions | Steps | Expected |
|---|---|---|---|---|---|
| OFF-SYNC-001 | P0 | Catalog load | Internet on | Open Offline tab / call catalog | Published packages listed correctly |
| OFF-SYNC-002 | P0 | Package download+install | Valid package checksum | Download package in app | Install success, installed summary updates |
| OFF-SYNC-003 | P1 | Offline nearby read | Package installed, internet off | Query nearby from app | Nearby data available from local store |
| OFF-SYNC-004 | P1 | Sync now no package | No package installed | Tap Sync now | User-friendly guard message shown |
| OFF-SYNC-005 | P1 | Delta sync success | Existing local data, internet on | Call delta sync endpoint and apply | Updated/deleted/new POI state correct locally |
| OFF-SYNC-006 | P2 | Corrupt package | Tampered package/checksum mismatch | Install package | Install fails safely, prior dataset remains intact |

## Suite 5 - Reliability and Edge Cases

| ID | Priority | Area | Preconditions | Steps | Expected |
|---|---|---|---|---|---|
| REL-001 | P0 | Network flapping | Pending queue exists | Alternate offline/online rapidly | No crash, eventual upload success |
| REL-002 | P0 | Access token expiry | Expired access + valid refresh | Execute authenticated call path | Session recovers via refresh flow |
| REL-003 | P1 | Refresh invalid | Invalid refresh token only | Trigger auth-required call | User forced to re-login, clear error shown |
| REL-004 | P1 | Backend 5xx | Simulate 5xx from key endpoints | Trigger nearby/detail/sync | App degrades gracefully, no data corruption |
| REL-005 | P2 | App restart with pending queue | Pending visits in preferences | Force-stop and reopen app | Pending queue restored from local backup |

## Regression Pack for Every Build
- P0 tests: all
- P1 smoke subset:
  - API-SEC-005, API-SEC-006
  - LOC-GEO-004, LOC-GEO-005
  - NAR-VIS-003, NAR-VIS-006
  - OFF-SYNC-003, OFF-SYNC-005
  - REL-003, REL-004
