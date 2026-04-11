# Test Data Specification (Backend + Mobile)

## Objectives
- Reproducible dataset for local and staging validation.
- Covers happy path and edge/failure paths without editing production data.
- Compatible with existing SQL-script workflow in `Database/` (no EF migrations).

## Data Governance
- Never use real customer PII.
- Use dedicated test emails under `@qa.vinhkhanh.local`.
- Keep all passwords deterministic for QA runbooks.
- Keep IDs stable when possible for automation assertions.

## Dataset A - Happy Path (Core Tour)

### A1. Users
| Role | Count | Example |
|---|---:|---|
| Admin | 1 | `admin.qa@qa.vinhkhanh.local` |
| Vendor | 2 | `vendor.a@qa.vinhkhanh.local`, `vendor.b@qa.vinhkhanh.local` |
| Customer | 3 | `customer.01@qa.vinhkhanh.local`, `customer.02@qa.vinhkhanh.local`, `customer.03@qa.vinhkhanh.local` |

- Suggested default password for QA: `Qa@12345678`
- One customer account reserved for auth-expiry testing.

### A2. Languages
- `vi` (id: 1) - fully populated
- `en` (id: 2) - fully populated
- `ja` (id: 3) - intentionally partial for fallback tests

### A3. POIs (12 active)
- Cluster 1 (short walk route, Vinh Khanh):
  - center: `lat=10.7538`, `lng=106.6932`
  - 8 POIs within 50-300m
- Cluster 2 (longer route):
  - center: `lat=10.7565`, `lng=106.6978`
  - 4 POIs within 80-500m

Per POI required fields:
- `isActive=true`
- varied `priority` (1..5)
- varied `geofenceRadius` (50, 80, 120, 200)
- category icon + category name
- at least one translation and optional second translation
- at least one audio track with one `isDefault=true`

### A4. Route points for emulator scripts
- `P1`: `106.6932 10.7538`
- `P2`: `106.6940 10.7544`
- `P3`: `106.6951 10.7554`
- `P4`: `106.6970 10.7561`

Use these points for deterministic geofence walk simulation.

## Dataset B - Edge and Negative

### B1. POI Variants
- 1 inactive POI near cluster 1
- 1 POI with missing audio
- 1 POI with missing `en` translation
- 1 POI with tiny radius (25m) to stress edge geofence behavior
- 1 POI with large radius (500m) for overlap priority tests

### B2. Auth/Token variants
- account with forced expired access token for refresh tests
- invalid refresh token fixture for rejection path
- reused refresh token fixture to confirm rotation protection

### B3. Validation payload fixtures
- invalid coordinates (`lat=200`, `lng=300`)
- oversized radius (`radiusMeters > 5000`)
- malformed JSON body for auth/profile update

## Dataset C - Offline and Sync

### C1. Offline package set
- `PKG-vi-v1` (complete) - all POIs/audio for `vi`
- `PKG-en-v1` (partial audio) - 1-2 audio files intentionally missing
- checksum values captured for each package build

### C2. Delta sync fixtures
- `delta-1`: one POI renamed + one POI deleted + one new POI inserted
- `delta-2`: translation update only
- `delta-3`: audio URL change only

### C3. Local cache verification markers
- POI names include deterministic suffixes for assertion:
  - `"[QA-A]"` for dataset A
  - `"[QA-B]"` for dataset B
  - `"[QA-C]"` for delta-added POIs

## Seed and Reset Strategy

### Source of truth
- SQL scripts under `Database/` remain baseline.
- Add QA seed script set under `Database/qa/`:
  - `qa_001_seed_users.sql`
  - `qa_002_seed_languages.sql`
  - `qa_003_seed_pois.sql`
  - `qa_004_seed_offline_metadata.sql`

### Reset pattern
- Option 1 (clean reset): drop and recreate DB using existing 001-009 + QA seeds.
- Option 2 (quick reset): truncate only QA-owned tables/rows by marker suffix/email domain.

### Idempotency rules
- Use `INSERT ... ON DUPLICATE KEY UPDATE` for QA seeds.
- Use deterministic external keys where feasible.
- Keep all QA data namespaced with prefix `QA_`.

## Evidence fields to capture during runs
- Test run ID (date + build SHA)
- Dataset version (`A/B/C` and seed script revision)
- Device/emulator model + Android version
- API base URL and app build variant
