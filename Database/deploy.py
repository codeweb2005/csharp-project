"""
deploy.py — Vinh Khanh Food Tour: Full Test Deploy Script
=========================================================
Runs on the dev machine (Windows). Does:
  1. Wait until RDS port 3306 is reachable
  2. Run all SQL migrations (Dump + 005/006/007)
  3. Build & run the .NET backend (dotnet run)
  4. npm install + npm run dev for admin-frontend
  5. Smoke-test: GET /api/v1/languages

Usage:
  python deploy.py

Requirements: pymysql (already installed), Python 3.x
"""

import sys
import os
import socket
import subprocess
import time
import urllib.request
import json
import threading

# ─── Config ──────────────────────────────────────────────────────────────────
RDS_HOST = "vinhkhanh.cxau0au24i3b.ap-southeast-1.rds.amazonaws.com"
RDS_PORT = 3306
RDS_USER = "admin"
RDS_PASS = "admin123"
DB_NAME  = "VinhKhanhFoodTour"

DOTNET  = r"C:\app\dotnet\dotnet.exe"
NODE    = "node"
NPM     = "npm"

REPO_ROOT     = os.path.dirname(os.path.abspath(__file__))
# deploy.py is in Database/ — go up one level
REPO_ROOT     = os.path.dirname(REPO_ROOT)
BACKEND_API   = os.path.join(REPO_ROOT, "backend", "src", "VinhKhanh.API")
ADMIN_FE      = os.path.join(REPO_ROOT, "admin-frontend")
DB_DIR        = os.path.join(REPO_ROOT, "Database")

API_PORT      = 5015
SMOKE_URL     = f"http://localhost:{API_PORT}/api/v1/languages"

# SQL scripts to apply in order (only those that exist)
SQL_SCRIPTS = [
    os.path.join(DB_DIR, "Dump20260416.sql"),
    os.path.join(DB_DIR, "005_tourist_sessions.sql"),
    os.path.join(DB_DIR, "006_active_presence.sql"),
    os.path.join(DB_DIR, "007_spatial_index.sql"),
]

# ─── Helpers ─────────────────────────────────────────────────────────────────
def ok(msg):   print(f"  \033[92m[OK]\033[0m  {msg}")
def err(msg):  print(f"  \033[91m[ERR]\033[0m {msg}")
def info(msg): print(f"  \033[96m[..]\033[0m  {msg}")
def hdr(msg):  print(f"\n\033[1m\033[94m{'─'*55}\n  {msg}\n{'─'*55}\033[0m")

# ─── Step 1: Check RDS network reachability ───────────────────────────────────
hdr("STEP 1 — Check RDS network connectivity")
info(f"Trying {RDS_HOST}:{RDS_PORT} ...")

reachable = False
for attempt in range(1, 4):
    try:
        s = socket.create_connection((RDS_HOST, RDS_PORT), timeout=10)
        s.close()
        reachable = True
        break
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        info(f"Attempt {attempt}/3 failed: {e}")
        if attempt < 3:
            time.sleep(3)

if not reachable:
    err("Cannot reach RDS on port 3306.")
    print()
    print("  Action required:")
    print("  1. AWS Console → RDS → database-1 → Security group")
    print("  2. Edit Inbound rules → Add rule:")
    print("     Type: MySQL/Aurora | Port: 3306 | Source: 125.235.173.22/32")
    print("  3. Also check: RDS instance must be 'Publicly accessible: Yes'")
    print()
    print("  After fixing the Security Group, run: python Database\\deploy.py")
    sys.exit(1)

ok(f"Port 3306 is reachable!")

# ─── Step 2: Database migrations ─────────────────────────────────────────────
hdr("STEP 2 — Database migrations")
try:
    import pymysql
    import pymysql.cursors
except ImportError:
    err("pymysql not installed. Run: pip install pymysql")
    sys.exit(1)

def connect(database=None):
    kw = dict(host=RDS_HOST, port=RDS_PORT, user=RDS_USER, password=RDS_PASS,
              charset="utf8mb4", ssl={"ssl_ca": None}, connect_timeout=15,
              autocommit=True, cursorclass=pymysql.cursors.DictCursor)
    if database:
        kw["database"] = database
    return pymysql.connect(**kw)

# Create DB
info(f"Creating database `{DB_NAME}` if not exists ...")
try:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
                        f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    ok(f"Database ready.")
except Exception as e:
    err(f"Cannot create database: {e}")
    sys.exit(1)

# Run scripts
IGNORE_CODES = {1050, 1061, 1062, 1091, 1060, 1054}  # already exists / duplicate key etc.

def run_script(path: str, conn) -> tuple[int, int]:
    """Execute a .sql file. Returns (ok_count, warn_count)."""
    with open(path, encoding="utf-8", errors="replace") as f:
        sql = f.read()

    # Split on ';' — handles multi-statement dumps
    stmts = [s.strip() for s in sql.split(";") if len(s.strip()) > 5]
    ok_n, warn_n = 0, 0
    with conn.cursor() as cur:
        for stmt in stmts:
            if stmt.startswith("--") or stmt.upper().startswith("/*!"):
                # Skip pure comment/directive lines
                pass
            try:
                cur.execute(stmt)
                ok_n += 1
            except pymysql.err.OperationalError as ex:
                if ex.args[0] in IGNORE_CODES:
                    warn_n += 1
                else:
                    warn_n += 1
                    # Show first real error for debugging
                    if warn_n == 1:
                        info(f"    (first warning: [{ex.args[0]}] {str(ex.args[1])[:80]})")
            except Exception:
                warn_n += 1
    return ok_n, warn_n

with connect(database=DB_NAME) as conn:
    for path in SQL_SCRIPTS:
        name = os.path.basename(path)
        if not os.path.exists(path):
            info(f"Skipping {name} (not found)")
            continue
        info(f"Running {name} ...")
        ok_n, warn_n = run_script(path, conn)
        ok(f"{name}: {ok_n} statements OK, {warn_n} warnings (duplicates/already-exists ignored)")

# Verify
with connect(database=DB_NAME) as conn:
    with conn.cursor() as cur:
        cur.execute(f"SELECT TABLE_NAME FROM information_schema.TABLES "
                    f"WHERE TABLE_SCHEMA='{DB_NAME}' ORDER BY TABLE_NAME")
        tables = [r["TABLE_NAME"] for r in cur.fetchall()]
ok(f"Schema verified: {len(tables)} tables → {', '.join(tables)}")

# ─── Step 3: Build & run backend ─────────────────────────────────────────────
hdr("STEP 3 — Build & start backend (dotnet run)")
info(f"Working dir: {BACKEND_API}")
info(f"Will listen on http://localhost:{API_PORT}")

backend_env = os.environ.copy()
backend_env["ASPNETCORE_ENVIRONMENT"] = "Development"      # enables Swagger
backend_env["ASPNETCORE_URLS"]        = f"http://+:{API_PORT}"

backend_proc = subprocess.Popen(
    [DOTNET, "run", "--no-launch-profile"],
    cwd=BACKEND_API,
    env=backend_env,
    creationflags=subprocess.CREATE_NEW_CONSOLE,   # opens in a new console window
)
info(f"Backend PID: {backend_proc.pid} (running in separate window)")

# ─── Step 4: npm install + npm run dev (admin frontend) ──────────────────────
hdr("STEP 4 — Admin frontend (npm install + npm run dev)")
info(f"Working dir: {ADMIN_FE}")

# Write .env if not exists
env_path = os.path.join(ADMIN_FE, ".env")
if not os.path.exists(env_path):
    with open(env_path, "w") as f:
        f.write(f"VITE_API_BASE_URL=http://localhost:{API_PORT}/api/v1\n")
    info(f"Created .env: VITE_API_BASE_URL=http://localhost:{API_PORT}/api/v1")

frontend_proc = subprocess.Popen(
    f"npm install && npm run dev",
    cwd=ADMIN_FE,
    shell=True,
    creationflags=subprocess.CREATE_NEW_CONSOLE,
)
info(f"Frontend PID: {frontend_proc.pid} (running in separate window)")

# ─── Step 5: Smoke test ───────────────────────────────────────────────────────
hdr("STEP 5 — Smoke test: wait for API to be ready")
info(f"Waiting for {SMOKE_URL} (up to 60s) ...")

api_ready = False
for i in range(20):
    time.sleep(3)
    try:
        with urllib.request.urlopen(SMOKE_URL, timeout=5) as resp:
            body = json.loads(resp.read())
            if body.get("success"):
                api_ready = True
                langs = body.get("data", [])
                ok(f"API is UP! Languages endpoint returned {len(langs)} language(s).")
                for L in langs:
                    print(f"      • [{L.get('code')}] {L.get('name')}")
                break
    except Exception as e:
        info(f"  [{i+1}/20] Not ready yet: {str(e)[:60]}")

if not api_ready:
    err("API did not respond within 60s. Check the backend console for errors.")
    print("  Common fixes:")
    print("  - Check backend console for build/runtime errors")
    print("  - Ensure port 5015 is not used by another process")
    print("  - Verify RDS connection string in appsettings.json")

# ─── Summary ──────────────────────────────────────────────────────────────────
hdr("DEPLOY SUMMARY")
print("  Component        URL")
print("  ─────────────────────────────────────────────")
print(f"  Backend API      http://localhost:{API_PORT}")
print(f"  Swagger UI       http://localhost:{API_PORT}/swagger")
print(f"  Admin Frontend   http://localhost:5173")
print(f"  RDS Database     {RDS_HOST}/{DB_NAME}")
print()
print("  Login: admin@vinhkhanh.app / admin@123")
print()
print("  Press Ctrl+C here to stop. Backend & frontend run in their own windows.")
print()

# Keep script alive so user knows everything is running
try:
    while True:
        time.sleep(30)
        # Check processes are still alive
        if backend_proc.poll() is not None:
            err("Backend process exited! Check the backend window for errors.")
        if frontend_proc.poll() is not None:
            err("Frontend process exited! Check the frontend window for errors.")
except KeyboardInterrupt:
    print("\n  Shutting down...")
    backend_proc.terminate()
    frontend_proc.terminate()
    print("  Done.")
