using System.Text;
using System.Threading.Channels;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VinhKhanh.API.Middleware;
using VinhKhanh.Application.DTOs;
using VinhKhanh.Application.Services;
using VinhKhanh.Domain.Interfaces;
using VinhKhanh.Infrastructure.Data;
using VinhKhanh.Infrastructure.Repositories;
using VinhKhanh.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// ============ Services ============

// Database — pool size 128 for high-concurrency tourist sessions
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string not found.");
builder.Services.AddDbContextPool<AppDbContext>(
    options => options.UseMySQL(connectionString),
    poolSize: 128);


// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT key not found.");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };
    // SignalR: read JWT from query string (WebSocket can't send Authorization header)
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            var path  = ctx.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(token) && path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// CORS — reads allowed origins from environment variable for production CloudFront support.
// Local dev:   http://localhost:5173, http://localhost:3000
// Production:  set CORS_ALLOWED_ORIGINS=https://d1xxxxx.cloudfront.net in ECS task definition
var corsOrigins = new List<string> { "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000" };
var envOrigins = builder.Configuration["CORS_ALLOWED_ORIGINS"];
if (!string.IsNullOrWhiteSpace(envOrigins))
    corsOrigins.AddRange(envOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins([.. corsOrigins])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IPOIRepository, POIRepository>();

// Application Services
builder.Services.AddSingleton<JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
var emailProvider = builder.Configuration["Email:Provider"];
if (emailProvider?.Equals("ses", StringComparison.OrdinalIgnoreCase) == true)
    builder.Services.AddScoped<IEmailSender, SesEmailSender>();
else
    builder.Services.AddScoped<IEmailSender, NullEmailSender>();
builder.Services.AddScoped<IPOIService, POIService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IAudioService, AudioService>();
builder.Services.AddScoped<IAudioQrService, AudioQrService>();
builder.Services.AddScoped<IMediaService, MediaService>();
builder.Services.AddScoped<IMenuService, MenuService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IOfflinePackageService, OfflinePackageService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<ISyncService, SyncService>();
// Language service — anonymous endpoint for mobile app language picker
builder.Services.AddScoped<ILanguageService, LanguageService>();

// ── Tourist QR Session + Realtime Presence ──────────────────────────────────
builder.Services.AddScoped<ITouristSessionService, TouristSessionService>();
builder.Services.AddScoped<IPresenceService, PresenceService>();

// ── Visit Ingestion Queue (Channel<T> + BackgroundService) ──────────────────
// Bounded capacity of 10,000 — back-pressures callers when queue is full.
builder.Services.AddSingleton(
    Channel.CreateBounded<VisitBatchMessage>(
        new BoundedChannelOptions(10_000)
        {
            FullMode = BoundedChannelFullMode.Wait,  // back-pressure
            SingleWriter = false,
            SingleReader = true
        }));
builder.Services.AddHostedService<VisitIngestionService>();
builder.Services.AddHostedService<PresenceCleanupService>();


// TTS service — Azure Cognitive Services Speech SDK
builder.Services.AddSingleton<ITTSService, AzureTTSService>();

// ── SignalR (admin live monitor) ────────────────────────────────────────────
// To scale horizontally across multiple ECS tasks, add Redis backplane:
//   builder.Services.AddSignalR().AddStackExchangeRedis("redis-connection-string");
builder.Services.AddSignalR(opts =>
{
    opts.EnableDetailedErrors = builder.Environment.IsDevelopment();
    opts.MaximumReceiveMessageSize = 32 * 1024; // 32 KB
});

// ── Output Cache (GET /pois/nearby — hot path, 10s TTL) ────────────────────
builder.Services.AddOutputCache(opts =>
{
    opts.AddPolicy("poi-nearby", b =>
        b.Expire(TimeSpan.FromSeconds(10)).SetVaryByQuery("lat", "lng", "radius", "langId"));
});

// ── Rate Limiting (POST /sync/visits) ──────────────────────────────────────
builder.Services.AddRateLimiter(opts =>
{
    opts.AddFixedWindowLimiter("visits-upload", o =>
    {
        o.PermitLimit             = 30;
        o.Window                  = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder    = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
        o.QueueLimit              = 5;
    });
    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});


// File storage: switch between local (dev) and S3 (prod) via config.
// Set FileStorage:Provider=s3 in production ECS environment variables.
var storageProvider = builder.Configuration["FileStorage:Provider"];
if (storageProvider?.Equals("s3", StringComparison.OrdinalIgnoreCase) == true)
    builder.Services.AddScoped<IFileStorageService, S3FileStorageService>();
else
    builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Health checks (Docker / load balancer probe) ────────────────────────────
builder.Services.AddHealthChecks();

// ============ App Pipeline ============
var app = builder.Build();

// Middleware pipeline
app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "VK Food Tour API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseOutputCache();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<MaintenanceMiddleware>();

// Static files for uploads
app.UseStaticFiles();

app.MapControllers();

// Health-check endpoint — used by Docker HEALTHCHECK and AWS ALB target groups
app.MapHealthChecks("/health");

// SignalR hub — admin live tour monitor
app.MapHub<TourMonitorHub>("/hubs/monitor");


// Seed database in development
if (app.Environment.IsDevelopment())
{
    await DataSeeder.SeedAsync(app.Services);
}

app.Run();
