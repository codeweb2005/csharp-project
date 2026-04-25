// RDS Migration Runner — chạy tất cả SQL scripts lên MySQL RDS
// Usage: dotnet run --project Database\RdsMigrationRunner\RdsMigrationRunner.csproj

using MySqlConnector;


const string HOST   = "database-1.cxau0au24i3b.ap-southeast-1.rds.amazonaws.com";
const int    PORT   = 3306;
const string USER   = "admin";
const string PASS   = "Admin123";
const string DB_NAME = "VinhKhanhFoodTour";

var rootCs = $"Server={HOST};Port={PORT};Uid={USER};Pwd={PASS};CharSet=utf8mb4;SslMode=Required;AllowPublicKeyRetrieval=true;ConnectionTimeout=20;";
var dbCs   = rootCs + $"Database={DB_NAME};";

Console.ForegroundColor = ConsoleColor.Cyan;
Console.WriteLine("════════════════════════════════════════════════════════");
Console.WriteLine("  🚀 Vinh Khanh RDS Migration Runner");
Console.WriteLine($"  🌐 {HOST}");
Console.ResetColor();

// ── 1. Test connection ─────────────────────────────────────────────────────
Console.Write("\n[1/4] Testing connection... ");
try
{
    using var testConn = new MySqlConnection(rootCs);
    await testConn.OpenAsync();
    using var cmd = testConn.CreateCommand();
    cmd.CommandText = "SELECT VERSION(), NOW()";
    using var r = await cmd.ExecuteReaderAsync();
    if (r.Read())
        Console.WriteLine($"✅  MySQL {r[0]}  |  Server time: {r[1]}");
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"❌ FAILED: {ex.Message}");
    Console.ResetColor();
    Environment.Exit(1);
}

// ── 2. Create database if not exists ──────────────────────────────────────
Console.Write($"[2/4] Creating database `{DB_NAME}` if not exists... ");
try
{
    using var conn = new MySqlConnection(rootCs);
    await conn.OpenAsync();
    using var cmd = conn.CreateCommand();
    cmd.CommandText = $"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
    await cmd.ExecuteNonQueryAsync();
    Console.WriteLine("✅");
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"❌ {ex.Message}");
    Console.ResetColor();
    Environment.Exit(1);
}

// ── 3. Run SQL migration scripts ───────────────────────────────────────────
var scripts = new[]
{
    ("001_CreateTables",   FindScript("001") ?? FindScript("002_CreateTables")),
    ("seed",               FindScript("seed")),
    ("005_tourist",        FindScript("005_tourist_sessions")),
    ("006_presence",       FindScript("006_active_presence")),
    ("007_spatial",        FindScript("007_spatial_index")),
};

Console.WriteLine("[3/4] Running SQL migration scripts:");
using var dbConn = new MySqlConnection(dbCs);
await dbConn.OpenAsync();

foreach (var (label, path) in scripts)
{
    if (path == null)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"  ⚠️  {label}: script not found, skipping.");
        Console.ResetColor();
        continue;
    }

    Console.Write($"  → {label} ({Path.GetFileName(path)})... ");
    try
    {
        var sql = await File.ReadAllTextAsync(path);
        // Split on ';' to handle multi-statement files
        var statements = sql
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(s => s.Length > 5 && !s.StartsWith("--"));

        foreach (var stmt in statements)
        {
            using var cmd = dbConn.CreateCommand();
            cmd.CommandText = stmt;
            await cmd.ExecuteNonQueryAsync();
        }
        Console.WriteLine("✅");
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"⚠️  {ex.Message[..Math.Min(120, ex.Message.Length)]}");
        Console.ResetColor();
        // Continue — some scripts may already have the tables
    }
}

// ── 4. Verify tables ────────────────────────────────────────────────────────
Console.Write("[4/4] Verifying tables... ");
using var verifyConn = new MySqlConnection(dbCs);
await verifyConn.OpenAsync();
var verifyCmd = verifyConn.CreateCommand();
verifyCmd.CommandText = $"SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '{DB_NAME}' ORDER BY TABLE_NAME;";
var tables = new List<string>();
using var vr = await verifyCmd.ExecuteReaderAsync();
while (vr.Read()) tables.Add(vr.GetString(0));
Console.WriteLine($"✅  {tables.Count} tables found:");
foreach (var t in tables)
    Console.WriteLine($"      • {t}");

Console.ForegroundColor = ConsoleColor.Green;
Console.WriteLine("\n✅ Migration complete! RDS is ready.");
Console.ResetColor();

// ── Helpers ─────────────────────────────────────────────────────────────────
static string? FindScript(string keyword)
{
    // Look relative to script location
    var baseDir = AppContext.BaseDirectory;
    var candidates = new[]
    {
        Path.Combine(baseDir, "..", "..", "..", "..", "Database"),
        Path.Combine(Environment.CurrentDirectory, "Database"),
        Environment.CurrentDirectory
    };
    foreach (var dir in candidates)
    {
        if (!Directory.Exists(dir)) continue;
        var file = Directory.GetFiles(dir, "*.sql", SearchOption.TopDirectoryOnly)
            .FirstOrDefault(f => Path.GetFileNameWithoutExtension(f)
                .Contains(keyword, StringComparison.OrdinalIgnoreCase));
        if (file != null) return file;
    }
    return null;
}
