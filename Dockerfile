# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source

# Restore only the solution/project files first for better layer caching
COPY backend/VinhKhanhFoodTour.slnx ./backend/
COPY backend/src/VinhKhanh.API/VinhKhanh.API.csproj           ./backend/src/VinhKhanh.API/
COPY backend/src/VinhKhanh.Application/VinhKhanh.Application.csproj   ./backend/src/VinhKhanh.Application/
COPY backend/src/VinhKhanh.Domain/VinhKhanh.Domain.csproj         ./backend/src/VinhKhanh.Domain/
COPY backend/src/VinhKhanh.Infrastructure/VinhKhanh.Infrastructure.csproj ./backend/src/VinhKhanh.Infrastructure/

# Restore NuGet packages
RUN dotnet restore backend/VinhKhanhFoodTour.slnx

# Copy the rest of the source code
COPY backend/src ./backend/src

# Publish in Release mode → /app/publish
RUN dotnet publish backend/src/VinhKhanh.API/VinhKhanh.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 appgroup && \
    adduser  --system --uid 1001 --gid 1001 --no-create-home appuser

# Copy published output from build stage
COPY --from=build /app/publish .

# Health-check: hit the Swagger JSON endpoint (available in both dev and prod)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8080/swagger/v1/swagger.json || exit 1

# Configuration via environment variables (injected by ECS task definition)
# Sensitive values are read from AWS Secrets Manager at startup via aspnetcore config
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 8080

USER appuser

ENTRYPOINT ["dotnet", "VinhKhanh.API.dll"]
