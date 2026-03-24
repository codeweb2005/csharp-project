using System.Diagnostics;
using System.Net;
using System.Text.Json;
using VinhKhanh.Application.DTOs;

namespace VinhKhanh.API.Middleware;

/// <summary>Shared JSON options for middleware responses (camelCase, matches API controllers).</summary>
internal static class ApiResponseJsonSerializerOptions
{
    public static readonly JsonSerializerOptions CamelCase = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}

/// <summary>Global exception handler — catches all unhandled exceptions</summary>
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            var response = new ApiResponse<object>
            {
                Success = false,
                Error = new ErrorInfo
                {
                    Code = "INTERNAL_ERROR",
                    Message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
                },
                TraceId = Activity.Current?.Id ?? context.TraceIdentifier
            };

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(response, ApiResponseJsonSerializerOptions.CamelCase));
        }
    }
}

/// <summary>Logs request method, path, status code, and duration</summary>
public class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        await next(context);
        sw.Stop();

        logger.LogInformation(
            "{Method} {Path} → {StatusCode} ({Duration}ms)",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            sw.ElapsedMilliseconds);
    }
}

/// <summary>Returns 503 when maintenance mode is enabled</summary>
public class MaintenanceMiddleware(RequestDelegate next)
{
    private static bool _maintenanceMode;

    public static void SetMaintenance(bool enabled) => _maintenanceMode = enabled;
    public static bool IsEnabled => _maintenanceMode;

    public async Task InvokeAsync(HttpContext context)
    {
        // Allow admin endpoints + auth even during maintenance
        var path = context.Request.Path.Value?.ToLower() ?? "";
        if (_maintenanceMode
            && !path.Contains("/auth/")
            && !path.Contains("/settings")
            && !path.Contains("/swagger"))
        {
            context.Response.StatusCode = 503;
            context.Response.ContentType = "application/json";
            var response = new ApiResponse<object>
            {
                Success = false,
                Error = new ErrorInfo
                {
                    Code = "MAINTENANCE_MODE",
                    Message = "Hệ thống đang bảo trì. Vui lòng quay lại sau."
                }
            };
            await context.Response.WriteAsync(
                JsonSerializer.Serialize(response, ApiResponseJsonSerializerOptions.CamelCase));
            return;
        }

        await next(context);
    }
}
