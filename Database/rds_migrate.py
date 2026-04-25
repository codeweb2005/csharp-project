"""
RDS Migration Runner (Python) — v2
Sử dụng: python Database\rds_migrate.py
"""
import pymysql
import os, sys

HOST     = "vinhkhanh.cxau0au24i3b.ap-southeast-1.rds.amazonaws.com"
PORT     = 3306
USER     = "admin"
PASSWORD = "admin123"
DB_NAME  = "VinhKhanhFoodTour"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR     = SCRIPT_DIR   # scripts are in same dir as this file

SQL_SCRIPTS = [
    "Dump20260416.sql",
    "005_tourist_sessions.sql",
    "006_active_presence.sql",
    "007_spatial_index.sql",
]

# Error codes that are safe to ignore (already exists, duplicate index, etc.)
IGNORE_CODES = {1050, 1060, 1061, 1062, 1091, 1054}

def connect(database=None):
    kw = dict(host=HOST, port=PORT, user=USER, password=PASSWORD,
              charset="utf8mb4", ssl={"ssl_ca": None}, connect_timeout=20,
              autocommit=True)
    if database:
        kw["database"] = database
    return pymysql.connect(**kw)

def c(code, text): return f"\033[{code}m{text}\033[0m"
ok   = lambda t: print(f"  {c('92','[OK]')}  {t}")
err  = lambda t: print(f"  {c('91','[ERR]')} {t}")
info = lambda t: print(f"  {c('96','[..]')}  {t}")
hdr  = lambda t: print(f"\n{c('94','─'*55)}\n  {t}\n{c('94','─'*55)}")

# ── 1. Test connection ────────────────────────────────────────────────────────
hdr("STEP 1 — Connect to RDS")
info(f"Connecting to {HOST}:{PORT} ...")
try:
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT VERSION(), NOW()")
        ver, now = cur.fetchone()
    ok(f"MySQL {ver}  |  Server time: {now}")
except Exception as e:
    err(f"Connection failed: {e}")
    sys.exit(1)

# ── 2. Create database ────────────────────────────────────────────────────────
hdr("STEP 2 — Ensure database exists")
info(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` ...")
try:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )
    ok(f"Database `{DB_NAME}` ready.")
except Exception as e:
    err(f"Failed: {e}")
    sys.exit(1)

# ── 3. Run SQL scripts ────────────────────────────────────────────────────────
hdr("STEP 3 — Run SQL migration scripts")

def split_sql(sql: str) -> list[str]:
    """
    Split a MySQL dump into individual statements.
    Handles:
    - Inline comments (--)
    - Conditional comments (/*!xxxxx ... */)
    - LOCK/UNLOCK TABLES
    - Multi-line INSERT
    """
    stmts = []
    current = []
    in_string = False
    string_char = None
    i = 0
    while i < len(sql):
        ch = sql[i]
        # Track string literals to avoid splitting inside them
        if in_string:
            if ch == '\\':
                current.append(ch)
                i += 1
                if i < len(sql):
                    current.append(sql[i])
                    i += 1
                continue
            if ch == string_char:
                in_string = False
            current.append(ch)
        elif ch in ("'", '"', '`'):
            in_string = True
            string_char = ch
            current.append(ch)
        elif ch == '-' and sql[i:i+2] == '--':
            # Skip line comment
            while i < len(sql) and sql[i] != '\n':
                i += 1
            continue
        elif ch == '/' and sql[i:i+2] == '/*':
            # Skip block comment
            end = sql.find('*/', i+2)
            if end == -1:
                break
            i = end + 2
            continue
        elif ch == ';':
            stmt = ''.join(current).strip()
            if stmt:
                stmts.append(stmt)
            current = []
        else:
            current.append(ch)
        i += 1
    # Catch any trailing statement without semicolon
    last = ''.join(current).strip()
    if last:
        stmts.append(last)
    return stmts

# Session-level workarounds needed for a fresh DB that RDS dumps use
SESSION_INIT = [
    "SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0",
    "SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO'",
    "SET NAMES utf8mb4",
]

with connect(database=DB_NAME) as conn:
    with conn.cursor() as cur:
        for init in SESSION_INIT:
            cur.execute(init)

    for script_name in SQL_SCRIPTS:
        path = os.path.join(DB_DIR, script_name)
        if not os.path.exists(path):
            info(f"Skipping {script_name} (not found)")
            continue

        info(f"Running {script_name} ...")
        with open(path, encoding="utf-8", errors="replace") as f:
            sql_text = f.read()

        statements = split_sql(sql_text)
        ok_n = warn_n = 0
        first_real_err = None

        with conn.cursor() as cur:
            for stmt in statements:
                upper = stmt.upper().lstrip()
                # Skip pure SET @... directives from dump header (already handled above)
                if upper.startswith("SET @@GLOBAL") or upper.startswith("SET @@SESSION.SQL_LOG_BIN"):
                    continue
                if len(stmt) < 4:
                    continue
                try:
                    cur.execute(stmt)
                    ok_n += 1
                except pymysql.err.OperationalError as ex:
                    if ex.args[0] in IGNORE_CODES:
                        warn_n += 1
                    else:
                        warn_n += 1
                        if first_real_err is None:
                            first_real_err = f"[{ex.args[0]}] {ex.args[1][:100]}"
                except pymysql.err.ProgrammingError as ex:
                    if ex.args[0] in IGNORE_CODES:
                        warn_n += 1
                    else:
                        warn_n += 1
                        if first_real_err is None:
                            first_real_err = f"[{ex.args[0]}] {ex.args[1][:100]}"
                except Exception as ex:
                    warn_n += 1
                    if first_real_err is None:
                        first_real_err = str(ex)[:100]

        if first_real_err:
            print(f"  {c('93','[WARN]')} {script_name}: {ok_n} OK, {warn_n} warnings"
                  f" (first: {first_real_err})")
        else:
            ok(f"{script_name}: {ok_n} statements executed, {warn_n} already-exist skipped")

    # Restore FK checks
    with conn.cursor() as cur:
        cur.execute("SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS")

# ── 4. Verify ─────────────────────────────────────────────────────────────────
hdr("STEP 4 — Verify schema")
with connect(database=DB_NAME) as conn, conn.cursor() as cur:
    cur.execute(
        f"SELECT TABLE_NAME FROM information_schema.TABLES "
        f"WHERE TABLE_SCHEMA = %s ORDER BY TABLE_NAME", (DB_NAME,)
    )
    tables = [row[0] for row in cur.fetchall()]

ok(f"{len(tables)} tables in `{DB_NAME}`:")
for t in tables:
    print(f"      • {t}")

print()
print(c("92", "✅ Migration complete — RDS is ready for the backend."))
print()
print(c("96", "  Backend connection string:"))
print(f"  Server={HOST};Port={PORT};Database={DB_NAME};Uid={USER};Pwd={PASSWORD};CharSet=utf8mb4;SslMode=Required;")
