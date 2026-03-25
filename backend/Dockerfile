# ============================================================
# VinhKhanh.API — Multi-stage Docker build
# Base: .NET 10 (ASP.NET Core)
# ============================================================

# ---- Stage 1: Build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

# Copy csproj files first for layer caching
COPY src/VinhKhanh.API/VinhKhanh.API.csproj             VinhKhanh.API/
COPY src/VinhKhanh.Application/VinhKhanh.Application.csproj VinhKhanh.Application/
COPY src/VinhKhanh.Domain/VinhKhanh.Domain.csproj           VinhKhanh.Domain/
COPY src/VinhKhanh.Infrastructure/VinhKhanh.Infrastructure.csproj VinhKhanh.Infrastructure/

# Restore dependencies (cached if csproj unchanged)
RUN dotnet restore VinhKhanh.API/VinhKhanh.API.csproj

# Copy all source code
COPY src/ .

# Publish Release build
RUN dotnet publish VinhKhanh.API/VinhKhanh.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ---- Stage 2: Runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS runtime
WORKDIR /app

# Create uploads directory
RUN mkdir -p /app/wwwroot/uploads

# Copy published output
COPY --from=build /app/publish .

# Expose port 8080 (default Kestrel port in .NET 8+)
EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "VinhKhanh.API.dll"]
