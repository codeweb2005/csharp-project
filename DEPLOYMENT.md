# Vinh Khanh Food Tour — Deployment Guide

> **Stack:** ASP.NET Core 10 · React 19 / Vite · .NET MAUI · MySQL 8  
> **Last updated:** 2026-04-05

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Structure](#2-repository-structure)
3. [Environment Configuration](#3-environment-configuration)
   - 3.1 [Backend — appsettings](#31-backend--appsettings)
   - 3.2 [Frontend — .env files](#32-frontend--env-files)
   - 3.3 [Mobile — appsettings.json](#33-mobile--appsettingsjson)
4. [Database Setup](#4-database-setup)
   - 4.1 [Local MySQL](#41-local-mysql)
   - 4.2 [Amazon RDS (PowerShell)](#42-amazon-rds-powershell)
5. [Backend Deployment](#5-backend-deployment)
   - 5.1 [Run locally (dev)](#51-run-locally-dev)
   - 5.2 [Docker (staging / prod)](#52-docker-staging--prod)
6. [Frontend Deployment](#6-frontend-deployment)
   - 6.1 [Admin Panel](#61-admin-panel-port-5173)
   - 6.2 [Vendor Panel](#62-vendor-panel-port-5174)
7. [Mobile App Deployment](#7-mobile-app-deployment)
   - 7.1 [Android debug APK (staging)](#71-android-debug-apk-staging)
   - 7.2 [Android release AAB (production)](#72-android-release-aab-production)
8. [Full Stack Smoke Tests](#8-full-stack-smoke-tests)
9. [Nginx (Self-hosted)](#9-nginx-self-hosted)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### Dev Machine (Windows + PowerShell)

| Tool | Version | Notes |
|---|---|---|
| .NET SDK | 10.0 | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| Docker Desktop | latest | Required for Docker deployment |
| MySQL CLI | 8.0+ | For running SQL scripts against RDS |
| Android SDK | API 26+ | Required for MAUI Android builds |

Verify tools are available:

```powershell
dotnet --version       # 10.0.x
node --version         # v20.x
docker --version
mysql --version        # add to PATH if missing — see Section 4.2
```

### Server / Cloud

| Component | Staging | Production |
|---|---|---|
| API host | Docker on any host | AWS ECS Fargate |
| Database | Amazon RDS MySQL 8.0 | Amazon RDS MySQL 8.0, Multi-AZ |
| File storage | Amazon S3 | Amazon S3 |
| Frontend | `vite preview` / S3 static | AWS S3 + CloudFront |
| TTS | Azure Cognitive Services | Azure Cognitive Services |

---

## 2. Repository Structure

```
/
├── Dockerfile                        ← Backend image (built from repo root)
├── backend/
│   ├── VinhKhanhFoodTour.slnx
│   └── src/
│       ├── VinhKhanh.API/
│       │   ├── appsettings.json      ← Non-secret defaults only
│       │   └── appsettings.example.json ← Full template (no real values)
│       ├── VinhKhanh.Application/
│       ├── VinhKhanh.Domain/
│       └── VinhKhanh.Infrastructure/
├── admin-frontend/
│   ├── .env.example                  ← Copy to .env or .env.production
│   └── src/
├── vendor-frontend/
│   ├── .env.example                  ← Copy to .env or .env.production
│   └── src/
├── mobile/
│   └── VinhKhanh.Mobile/
│       └── appsettings.json          ← API base URL for mobile app
├── Database/
│   ├── 001_CreateDatabase.sql
│   ├── 002_CreateTables.sql
│   ├── 003_CreateIndexes.sql
│   ├── 004_CreateStoredProcedures.sql
│   ├── 005_SeedData.sql
│   ├── 006_AddPhase1Columns.sql
│   ├── 007_ResetData.sql
│   ├── 008_MockData.sql
│   └── 009_PasswordResetColumns.sql  ← Latest migration
└── DEPLOYMENT.md                     ← This file
```

---

## 3. Environment Configuration

### ⚠️ Golden Rule — Never commit secrets

The following files **must never be committed** to Git:
- `backend/src/VinhKhanh.API/appsettings.json` (if it contains real values)
- `admin-frontend/.env` / `.env.production`
- `vendor-frontend/.env` / `.env.production`

Use the `.example` files as templates. All secrets are injected via environment variables at runtime.

---

### 3.1 Backend — appsettings

The API reads config in this priority order (highest wins):
1. **Environment variables** (Docker / ECS)
2. `appsettings.Production.json` (server file, not committed)
3. `appsettings.json` (committed — non-secret defaults only)

**Template — create `appsettings.Production.json` on the server or inject as env vars:**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=<RDS_ENDPOINT>;Port=3306;Database=VinhKhanhFoodTour;Uid=<DB_USER>;Pwd=<DB_PASSWORD>;CharSet=utf8mb4;SslMode=Required;"
  },
  "Jwt": {
    "Key": "<MIN_32_CHAR_RANDOM_SECRET>",
    "Issuer": "VinhKhanhFoodTour",
    "Audience": "VinhKhanhFoodTourAdmin",
    "ExpiryMinutes": 60,
    "RefreshExpiryDays": 7
  },
  "FileStorage": {
    "Provider": "s3",
    "S3BucketName": "<S3_BUCKET_NAME>",
    "S3Region": "<AWS_REGION>",
    "AwsAccessKey": "<AWS_ACCESS_KEY_ID>",
    "AwsSecretKey": "<AWS_SECRET_ACCESS_KEY>"
  },
  "AzureTTS": {
    "SubscriptionKey": "<AZURE_TTS_KEY>",
    "Region": "southeastasia",
    "DefaultVoiceVi": "vi-VN-HoaiMyNeural",
    "DefaultVoiceEn": "en-US-JennyNeural"
  },
  "Email": {
    "Provider": "ses"
  },
  "CORS_ALLOWED_ORIGINS": "<FRONTEND_URL_1>,<FRONTEND_URL_2>"
}
```

**Environment variable equivalents** (used in Docker / ECS — double underscore = nesting):

| JSON path | Environment variable |
|---|---|
| `ConnectionStrings:DefaultConnection` | `ConnectionStrings__DefaultConnection` |
| `Jwt:Key` | `Jwt__Key` |
| `FileStorage:Provider` | `FileStorage__Provider` |
| `FileStorage:S3BucketName` | `FileStorage__S3BucketName` |
| `FileStorage:S3Region` | `FileStorage__S3Region` |
| `FileStorage:AwsAccessKey` | `FileStorage__AwsAccessKey` |
| `FileStorage:AwsSecretKey` | `FileStorage__AwsSecretKey` |
| `AzureTTS:SubscriptionKey` | `AzureTTS__SubscriptionKey` |
| `AzureTTS:Region` | `AzureTTS__Region` |
| `CORS_ALLOWED_ORIGINS` | `CORS_ALLOWED_ORIGINS` |

---

### 3.2 Frontend — .env files

Both frontends use the same two variables. Create the appropriate file per environment.

**For local development** — copy `.env.example` to `.env`:

```powershell
Copy-Item admin-frontend/.env.example  admin-frontend/.env
Copy-Item vendor-frontend/.env.example vendor-frontend/.env
```

**For staging** — create `.env.staging` (used with `vite build --mode staging`):

```env
VITE_API_BASE_URL=http://<STAGING_API_HOST>:8080/api/v1
VITE_GOOGLE_MAPS_API_KEY=<YOUR_GOOGLE_MAPS_KEY>
```

**For production** — create `.env.production` (used with `vite build`):

```env
VITE_API_BASE_URL=https://api.vinhkhanh.com/api/v1
VITE_GOOGLE_MAPS_API_KEY=<YOUR_GOOGLE_MAPS_KEY>
```

> `VITE_GOOGLE_MAPS_API_KEY` is optional. If empty, the POI map picker falls back to manual lat/lng inputs.

---

### 3.3 Mobile — appsettings.json

The mobile app reads `mobile/VinhKhanh.Mobile/appsettings.json` as an embedded resource at build time. Update this file before building to target the correct API:

**Staging:**
```json
{
  "ApiBaseUrl": "http://<STAGING_API_HOST>:8080/api/v1",
  "DefaultLanguageId": 1
}
```

**Production:**
```json
{
  "ApiBaseUrl": "https://api.vinhkhanh.com/api/v1",
  "DefaultLanguageId": 1
}
```

> This file does not contain secrets — only the API URL. It is safe to commit with placeholder values.

---

## 4. Database Setup

### 4.1 Local MySQL

```powershell
# Start MySQL and create a dedicated app user (never use root)
mysql -u root -p
```

```sql
CREATE DATABASE VinhKhanhFoodTour CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vkapp'@'localhost' IDENTIFIED BY '<STRONG_PASSWORD>';
GRANT ALL PRIVILEGES ON VinhKhanhFoodTour.* TO 'vkapp'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Run all migration scripts in order:

```powershell
$MYSQL  = "mysql"           # or full path: "C:/app/mysql-9.6.0-winx64/bin/mysql.exe"
$HOST   = "localhost"
$PORT   = "3306"
$USER   = "vkapp"
$PASS   = "<STRONG_PASSWORD>"
$DB     = "VinhKhanhFoodTour"

$scripts = @(
    "Database/001_CreateDatabase.sql",
    "Database/002_CreateTables.sql",
    "Database/003_CreateIndexes.sql",
    "Database/004_CreateStoredProcedures.sql",
    "Database/005_SeedData.sql",
    "Database/006_AddPhase1Columns.sql",
    "Database/007_ResetData.sql",
    "Database/008_MockData.sql",
    "Database/009_PasswordResetColumns.sql"
)

foreach ($script in $scripts) {
    Write-Host "Running $script ..." -ForegroundColor Cyan
    & $MYSQL -h $HOST -P $PORT -u $USER -p$PASS $DB -e "source $script"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED at $script — stopping." -ForegroundColor Red
        break
    }
    Write-Host "OK" -ForegroundColor Green
}
```

---

### 4.2 Amazon RDS (PowerShell)

#### Prerequisites

Verify `mysql` CLI is on your PATH:

```powershell
Get-Command mysql
```

If not found:

```powershell
# Add MySQL bin directory to PATH for this session
$env:PATH += ";C:\Program Files\MySQL\MySQL Server 8.0\bin"
# or: $env:PATH += ";C:\app\mysql-9.6.0-winx64\bin"
```

Alternatively, download MySQL Shell (lightweight, no server install): https://dev.mysql.com/downloads/shell

#### RDS Instance Configuration

| Setting | Staging | Production |
|---|---|---|
| Engine | MySQL 8.0 | MySQL 8.0 |
| Instance class | `db.t3.micro` | `db.t3.medium` |
| Multi-AZ | No | Yes |
| Storage | 20 GB GP3 | 20 GB GP3, auto-scale → 100 GB |
| Parameter group | `character_set_server=utf8mb4` | same |
| Security group | Port 3306, your IP only | Port 3306, ECS security group only |

#### Run Migration Scripts

```powershell
$MYSQL   = "mysql"    # or full path to mysql.exe
$HOST    = "<YOUR_RDS_ENDPOINT>.rds.amazonaws.com"
$PORT    = "3306"
$USER    = "<DB_USER>"
$PASS    = "<DB_PASSWORD>"
$SSL     = "--ssl-mode=REQUIRED"   # mandatory for RDS

$scripts = @(
    "Database/001_CreateDatabase.sql",
    "Database/002_CreateTables.sql",
    "Database/003_CreateIndexes.sql",
    "Database/004_CreateStoredProcedures.sql",
    "Database/005_SeedData.sql",
    "Database/006_AddPhase1Columns.sql",
    "Database/007_ResetData.sql",
    "Database/008_MockData.sql",
    "Database/009_PasswordResetColumns.sql"
)

foreach ($script in $scripts) {
    Write-Host "Running $script ..." -ForegroundColor Cyan
    & $MYSQL -h $HOST -P $PORT -u $USER -p$PASS $SSL -e "source $script"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED at $script — stopping." -ForegroundColor Red
        break
    }
    Write-Host "OK" -ForegroundColor Green
}
```

#### Verify Schema

```powershell
& $MYSQL -h $HOST -P $PORT -u $USER -p$PASS $SSL `
  -e "USE VinhKhanhFoodTour; SHOW TABLES;"
```

Expected tables:

```
AudioNarrations     Categories          CategoryTranslations
Languages           MenuItemTranslations OfflinePackages
POIMedia            POIMenuItems        POIs
POITranslations     RefreshTokens       SyncLogs
SystemSettings      UserSettings        Users
VisitHistory
```

> **Re-running scripts:** Scripts 001–009 are not fully idempotent.
> If you need to reset: `DROP DATABASE VinhKhanhFoodTour;` then re-run from 001.

---

## 5. Backend Deployment

### 5.1 Run Locally (dev)

```powershell
cd backend/src/VinhKhanh.API
dotnet run
# API available at: http://localhost:5015
# Swagger UI:       http://localhost:5015/swagger
```

Ensure `appsettings.json` points to your local or RDS database before running.

---

### 5.2 Docker (staging / prod)

The `Dockerfile` is at the **repo root** and must be built from there.

#### Build the image

```powershell
docker build -t vinhkhanh-api:staging .
```

#### Run with environment variables (no secrets in image)

Create a `.env.docker` file (do not commit this file):

```env
ConnectionStrings__DefaultConnection=Server=<RDS_ENDPOINT>;Port=3306;Database=VinhKhanhFoodTour;Uid=<DB_USER>;Pwd=<DB_PASSWORD>;CharSet=utf8mb4;SslMode=Required;
Jwt__Key=<MIN_32_CHAR_RANDOM_SECRET>
Jwt__Issuer=VinhKhanhFoodTour
Jwt__Audience=VinhKhanhFoodTourAdmin
FileStorage__Provider=s3
FileStorage__S3BucketName=<S3_BUCKET_NAME>
FileStorage__S3Region=<AWS_REGION>
FileStorage__AwsAccessKey=<AWS_ACCESS_KEY_ID>
FileStorage__AwsSecretKey=<AWS_SECRET_ACCESS_KEY>
AzureTTS__SubscriptionKey=<AZURE_TTS_KEY>
AzureTTS__Region=southeastasia
CORS_ALLOWED_ORIGINS=http://<FRONTEND_HOST>:5173,http://<FRONTEND_HOST>:5174
ASPNETCORE_ENVIRONMENT=Production
```

Then run:

```powershell
docker run -d `
  --name vinhkhanh-api `
  -p 8080:8080 `
  --env-file .env.docker `
  vinhkhanh-api:staging
```

#### Verify the container is healthy

```powershell
docker ps                              # STATUS should show (healthy) after ~30s
curl http://localhost:8080/swagger     # Swagger UI should load
```

#### View logs

```powershell
docker logs vinhkhanh-api -f
```

#### Stop / remove

```powershell
docker stop vinhkhanh-api
docker rm vinhkhanh-api
```

---

## 6. Frontend Deployment

### 6.1 Admin Panel (port 5173)

```powershell
cd admin-frontend

# Install dependencies
npm install

# --- Option A: Local dev server ---
npm run dev
# → http://localhost:5173

# --- Option B: Staging build + preview ---
# Create .env.staging with VITE_API_BASE_URL pointing to staging API
npm run build -- --mode staging
npx vite preview --port 5173
# → http://localhost:5173

# --- Option C: Production build ---
# Ensure .env.production exists with production API URL
npm run build
# Output: admin-frontend/dist/
# Deploy dist/ to S3 static hosting or Nginx
```

---

### 6.2 Vendor Panel (port 5174)

```powershell
cd vendor-frontend

npm install

# --- Option A: Local dev server ---
npm run dev
# → http://localhost:5174 (port set in package.json)

# --- Option B: Staging build + preview ---
npm run build -- --mode staging
npx vite preview --port 5174

# --- Option C: Production build ---
npm run build
# Output: vendor-frontend/dist/
```

---

## 7. Mobile App Deployment

### 7.1 Android Debug APK (staging)

> Update `mobile/VinhKhanh.Mobile/appsettings.json` with the staging API URL **before** building.

```powershell
cd mobile/VinhKhanh.Mobile

dotnet build -f net10.0-android -c Debug

# APK output path:
# bin/Debug/net10.0-android/com.vinhkhanh.foodtour-Signed.apk
```

Install on a connected device or emulator:

```powershell
adb install bin/Debug/net10.0-android/com.vinhkhanh.foodtour-Signed.apk
```

Or run directly on an attached device:

```powershell
dotnet run -f net10.0-android -c Debug
```

---

### 7.2 Android Release AAB (production)

> Update `mobile/VinhKhanh.Mobile/appsettings.json` with the production API URL before building.

Generate a keystore (one-time setup):

```powershell
keytool -genkey -v `
  -keystore vinhkhanh.keystore `
  -alias vinhkhanh `
  -keyalg RSA -keysize 2048 `
  -validity 10000
```

Build signed release bundle:

```powershell
dotnet publish -f net10.0-android -c Release `
  /p:AndroidKeyStore=True `
  /p:AndroidSigningKeyStore=vinhkhanh.keystore `
  /p:AndroidSigningKeyAlias=vinhkhanh `
  /p:AndroidSigningKeyPass=<KEYSTORE_PASSWORD> `
  /p:AndroidSigningStorePass=<KEYSTORE_PASSWORD>

# Output: bin/Release/net10.0-android/publish/com.vinhkhanh.foodtour.aab
# Upload .aab to Google Play Console
```

---

## 8. Full Stack Smoke Tests

Run these after each deployment to confirm all layers are working end-to-end.

### Backend

```powershell
$BASE = "http://localhost:8080/api/v1"   # adjust port for your environment

# 1. Public endpoint — no auth required
Invoke-RestMethod "$BASE/languages"
# Expected: success=true, data=[5 languages]

# 2. Auth — login as admin
$login = Invoke-RestMethod -Method POST "$BASE/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"admin@vinhkhanh.app","password":"<ADMIN_PASSWORD>"}'
$token = $login.data.accessToken
# Expected: success=true, role=Admin

# 3. POI list — EF Core + pagination
Invoke-RestMethod "$BASE/pois?page=1&size=5" `
  -Headers @{ Authorization = "Bearer $token" }
# Expected: success=true, data.pagination.totalItems >= 1

# 4. Nearby POIs — ST_Distance_Sphere spatial query
Invoke-RestMethod "$BASE/pois/nearby?lat=10.7538&lng=106.6932&radiusMeters=500"
# Expected: success=true, data=[array of nearby POIs]

# 5. Dashboard stats — vendor-scoped JOIN query
Invoke-RestMethod "$BASE/dashboard/stats" `
  -Headers @{ Authorization = "Bearer $token" }
# Expected: success=true, data.activePOIs > 0
```

### Admin Frontend (port 5173)

```
[ ] Login with admin@vinhkhanh.app → full sidebar visible (Users, Settings, etc.)
[ ] POI list loads with data and pagination
[ ] Create POI → map picker opens, form submits successfully
[ ] Upload audio file → streams or redirects to S3 correctly
[ ] Dashboard charts render with visit data
```

### Vendor Frontend (port 5174)

```
[ ] Login with a Vendor account → scoped sidebar (no Users, Settings, Offline Packages)
[ ] POI list shows only this vendor's POI
[ ] Analytics scoped to own shop data only
[ ] Cannot delete or feature POIs (buttons hidden)
```

### Mobile App

```
[ ] App launches → GPS permission prompt appears
[ ] Language picker screen loads (calls GET /languages)
[ ] Nearby POIs appear on the map
[ ] Tap a POI → detail screen opens with name, description
[ ] Press Play → narration audio plays
[ ] Walk into geofence radius → audio auto-plays (GeofenceEntered event)
```

---

## 9. Nginx (Self-hosted)

Use this when hosting the frontends and API on a Linux server instead of AWS.

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/vinhkhanh
```

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name vinhkhanh.com www.vinhkhanh.com api.vinhkhanh.com;
    return 301 https://$host$request_uri;
}

# Admin Frontend — React SPA
server {
    listen 443 ssl http2;
    server_name vinhkhanh.com www.vinhkhanh.com;

    ssl_certificate     /etc/letsencrypt/live/vinhkhanh.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vinhkhanh.com/privkey.pem;

    root /var/www/vinhkhanh/admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # required for React Router
    }

    location ~* \.(js|css|png|jpg|webp|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
}

# Vendor Frontend
server {
    listen 443 ssl http2;
    server_name vendor.vinhkhanh.com;

    ssl_certificate     /etc/letsencrypt/live/vendor.vinhkhanh.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vendor.vinhkhanh.com/privkey.pem;

    root /var/www/vinhkhanh/vendor;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|webp|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API
server {
    listen 443 ssl http2;
    server_name api.vinhkhanh.com;

    ssl_certificate     /etc/letsencrypt/live/api.vinhkhanh.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.vinhkhanh.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection keep-alive;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 15M;   # must be >= FileStorage:MaxFileSizeMB
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vinhkhanh /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL via Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vinhkhanh.com -d www.vinhkhanh.com \
             -d vendor.vinhkhanh.com -d api.vinhkhanh.com
```

---

## 10. Troubleshooting

### ❌ RDS connection timeout

The RDS Security Group is not allowing your IP on port 3306.

```
AWS Console → RDS → your instance → Security → Security Groups
→ Edit inbound rules → Add: MySQL/Aurora, port 3306, Source: My IP
```

### ❌ `SslMode` error connecting to RDS

Ensure the connection string includes `SslMode=Required` and the MySQL CLI uses `--ssl-mode=REQUIRED`. RDS enforces SSL by default.

### ❌ `mysql` is not recognized in PowerShell

```powershell
$env:PATH += ";C:\Program Files\MySQL\MySQL Server 8.0\bin"
# or the path where your mysql.exe is installed
```

### ❌ API returns INTERNAL_ERROR on POI endpoints

Check the API logs for `Unknown column` errors. This means the DB schema does not match the entity model. Confirm all 9 migration scripts ran successfully and in order.

```powershell
docker logs vinhkhanh-api 2>&1 | Select-String "Unknown column"
```

### ❌ Frontend shows blank page after build

React Router requires a catch-all fallback. With Nginx: confirm `try_files $uri $uri/ /index.html` is present. With `vite preview`: it handles this automatically.

### ❌ CORS error in browser

The frontend's origin is not in the allowed list. Set `CORS_ALLOWED_ORIGINS` to include the frontend URL when starting the API:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

For Docker:

```powershell
docker run ... -e CORS_ALLOWED_ORIGINS="http://<HOST>:5173,http://<HOST>:5174" ...
```

### ❌ 413 Request Entity Too Large

Increase `client_max_body_size` in Nginx to match or exceed `FileStorage:MaxFileSizeMB` in `appsettings.json` (default: 10 MB → use `client_max_body_size 15M`).

### ❌ JWT invalid / 401 on all requests

- Confirm `Jwt__Key` env var is set and matches across all instances.
- `ClockSkew` is set to `TimeSpan.Zero` in `Program.cs` — server and client clocks must be in sync.
- Tokens expire after 60 minutes by default. The frontend auto-refreshes on 401.

### ❌ Audio/image upload succeeds but file is not accessible

Confirm `FileStorage__Provider=s3` is set. With the local provider, files go to `wwwroot/uploads/` inside the container and are lost when the container restarts. Use S3 for any persistent environment.

### ❌ Mobile app cannot reach the API

1. Confirm `mobile/VinhKhanh.Mobile/appsettings.json` has the correct `ApiBaseUrl`.
2. The API must be accessible from the device network — `localhost` will not work on a physical device.
3. If testing on the same machine, use the host IP (`ipconfig` → IPv4 address).

---

## Reference

| Resource | URL |
|---|---|
| Swagger UI (local dev) | `http://localhost:5015/swagger` |
| Swagger UI (Docker) | `http://localhost:8080/swagger` |
| .NET deployment docs | https://learn.microsoft.com/aspnet/core/host-and-deploy |
| MySQL 8.0 docs | https://dev.mysql.com/doc/refman/8.0/en/ |
| Vite env variables | https://vitejs.dev/guide/env-and-mode |
| MAUI Android deployment | https://learn.microsoft.com/dotnet/maui/android/deployment |
| AWS RDS MySQL | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html |
