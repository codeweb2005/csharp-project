# 🍜 Hướng dẫn Triển khai — Vinh Khanh Food Tour

> **Stack:** ASP.NET Core 10 (Clean Architecture) + React 19 / Vite + MySQL  
> **Tác giả:** VinhKhanh Dev Team  
> **Cập nhật lần cuối:** 2026-03-20

---

## 📋 Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cấu trúc dự án](#2-cấu-trúc-dự-án)
3. [Cấu hình môi trường](#3-cấu-hình-môi-trường)
4. [Triển khai Backend (ASP.NET Core)](#4-triển-khai-backend-aspnet-core)
5. [Triển khai Frontend (React/Vite)](#5-triển-khai-frontend-reactvite)
6. [Cài đặt MySQL](#6-cài-đặt-mysql)
7. [Cấu hình Nginx (Reverse Proxy)](#7-cấu-hình-nginx-reverse-proxy)
8. [Chạy với Docker](#8-chạy-với-docker)
9. [Kiểm tra sau triển khai](#9-kiểm-tra-sau-triển-khai)
10. [Xử lý sự cố thường gặp](#10-xử-lý-sự-cố-thường-gặp)

---

## 1. Yêu cầu hệ thống

### Máy chủ (Server)

| Thành phần | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| OS | Ubuntu 22.04 LTS | Khuyến nghị |
| .NET Runtime | 10.0 | Chỉ runtime, không cần SDK |
| Node.js | 20 LTS | Để build frontend |
| MySQL | 8.0+ | |
| Nginx | 1.24+ | Reverse proxy |
| RAM | 2 GB | Tối thiểu |
| Disk | 20 GB | Tối thiểu |

### Máy phát triển (Dev Machine — Windows)

- .NET SDK 10.0
- Node.js 20 LTS + npm
- MySQL 8.0
- Visual Studio 2022 / VS Code

---

## 2. Cấu trúc dự án

```
csharp/
├── backend/
│   ├── VinhKhanhFoodTour.slnx
│   └── src/
│       ├── VinhKhanh.API/           ← Entry point, Controllers, Middleware
│       ├── VinhKhanh.Application/   ← Use cases, Services, DTOs
│       ├── VinhKhanh.Domain/        ← Entities, Interfaces
│       └── VinhKhanh.Infrastructure/← EF Core, Repositories, External services
├── admin-frontend/                  ← React 19 + Vite admin panel
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── Database/                        ← SQL scripts
│   ├── 001_CreateDatabase.sql
│   ├── 002_CreateTables.sql
│   ├── 003_CreateIndexes.sql
│   ├── 004_CreateStoredProcedures.sql
│   └── 005_SeedData.sql
└── DEPLOYMENT.md                    ← File này
```

---

## 3. Cấu hình môi trường

### ⚠️ QUAN TRỌNG — Secrets không được commit lên Git

Tạo file `appsettings.Production.json` **trên máy chủ** (không commit):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=vinhkhanh_foodtour;Uid=vkapp;Pwd=<MẬT_KHẨU_MẠNH>;CharSet=utf8mb4;"
  },
  "Jwt": {
    "Key": "<CHUỖI_BÍ_MẬT_ÍT_NHẤT_32_KÝ_TỰ>",
    "Issuer": "VinhKhanhFoodTour",
    "Audience": "VinhKhanhFoodTourAdmin",
    "ExpiryMinutes": 60,
    "RefreshExpiryDays": 7
  },
  "FileStorage": {
    "BasePath": "/var/www/vinhkhanh/uploads",
    "MaxFileSizeMB": 10,
    "AllowedImageExtensions": [".jpg", ".jpeg", ".png", ".webp"],
    "AllowedAudioExtensions": [".mp3", ".wav", ".ogg"]
  },
  "AzureTTS": {
    "SubscriptionKey": "<AZURE_TTS_KEY>",
    "Region": "southeastasia",
    "DefaultVoiceVi": "vi-VN-HoaiMyNeural",
    "DefaultVoiceEn": "en-US-JennyNeural"
  },
  "GoogleMaps": {
    "ApiKey": "<GOOGLE_MAPS_API_KEY>"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### Biến môi trường Frontend

Tạo file `admin-frontend/.env.production`:

```env
VITE_API_BASE_URL=https://api.vinhkhanh.com/api
VITE_APP_TITLE=Vinh Khanh Food Tour Admin
```

---

## 4. Triển khai Backend (ASP.NET Core)

### 4.1. Build trên máy Dev (Windows)

```powershell
cd backend

# Restore packages
dotnet restore

# Build Release
dotnet publish src/VinhKhanh.API/VinhKhanh.API.csproj `
  -c Release `
  -r linux-x64 `
  --self-contained false `
  -o ./publish
```

> **Tip:** Thêm `-r linux-x64 --self-contained true` nếu máy chủ chưa cài .NET Runtime.

### 4.2. Upload lên server

```powershell
# Dùng SCP (Git Bash / WSL) hoặc FileZilla
scp -r ./publish/* user@<SERVER_IP>:/var/www/vinhkhanh/api/
scp backend/src/VinhKhanh.API/appsettings.Production.json `
    user@<SERVER_IP>:/var/www/vinhkhanh/api/
```

### 4.3. Cấu hình trên Server (Linux)

```bash
# Tạo thư mục
sudo mkdir -p /var/www/vinhkhanh/api
sudo mkdir -p /var/www/vinhkhanh/uploads

# Cấp quyền
sudo chown -R www-data:www-data /var/www/vinhkhanh

# Test chạy thủ công
cd /var/www/vinhkhanh/api
ASPNETCORE_ENVIRONMENT=Production dotnet VinhKhanh.API.dll
```

### 4.4. Tạo systemd service (tự khởi động)

```bash
sudo nano /etc/systemd/system/vinhkhanh-api.service
```

```ini
[Unit]
Description=Vinh Khanh Food Tour API
After=network.target mysql.service

[Service]
Type=notify
WorkingDirectory=/var/www/vinhkhanh/api
ExecStart=/usr/bin/dotnet /var/www/vinhkhanh/api/VinhKhanh.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=vinhkhanh-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
Environment=ASPNETCORE_URLS=http://localhost:5000

[Install]
WantedBy=multi-user.target
```

```bash
# Kích hoạt service
sudo systemctl daemon-reload
sudo systemctl enable vinhkhanh-api
sudo systemctl start vinhkhanh-api

# Kiểm tra trạng thái
sudo systemctl status vinhkhanh-api

# Xem logs
sudo journalctl -u vinhkhanh-api -f
```

---

## 5. Triển khai Frontend (React/Vite)

### 5.1. Build trên máy Dev

```powershell
cd admin-frontend

# Cài dependencies
npm install

# Build production
npm run build
# Output: admin-frontend/dist/
```

### 5.2. Upload lên server

```powershell
scp -r ./dist/* user@<SERVER_IP>:/var/www/vinhkhanh/frontend/
```

### 5.3. Cấu hình Nginx để serve static files

Xem phần **Cấu hình Nginx** bên dưới.

---

## 6. Cài đặt MySQL

### 6.1. Cài MySQL trên Ubuntu

```bash
sudo apt update
sudo apt install -y mysql-server

# Bảo mật cài đặt
sudo mysql_secure_installation
```

### 6.2. Tạo database và user

```sql
-- Đăng nhập với root
sudo mysql -u root -p

-- Tạo database
CREATE DATABASE vinhkhanh_foodtour CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo user riêng (KHÔNG dùng root cho app)
CREATE USER 'vkapp'@'localhost' IDENTIFIED BY '<MẬT_KHẨU_MẠNH>';
GRANT ALL PRIVILEGES ON vinhkhanh_foodtour.* TO 'vkapp'@'localhost';
FLUSH PRIVILEGES;
```

### 6.3. Chạy scripts khởi tạo

```bash
cd /path/to/Database/

mysql -u vkapp -p vinhkhanh_foodtour < 001_CreateDatabase.sql
mysql -u vkapp -p vinhkhanh_foodtour < 002_CreateTables.sql
mysql -u vkapp -p vinhkhanh_foodtour < 003_CreateIndexes.sql
mysql -u vkapp -p vinhkhanh_foodtour < 004_CreateStoredProcedures.sql
mysql -u vkapp -p vinhkhanh_foodtour < 005_SeedData.sql
```

---

## 7. Cấu hình Nginx (Reverse Proxy)

### 7.1. Cài Nginx

```bash
sudo apt install -y nginx
```

### 7.2. Tạo config site

```bash
sudo nano /etc/nginx/sites-available/vinhkhanh
```

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name vinhkhanh.com www.vinhkhanh.com api.vinhkhanh.com;
    return 301 https://$host$request_uri;
}

# Admin Frontend (React SPA)
server {
    listen 443 ssl http2;
    server_name vinhkhanh.com www.vinhkhanh.com;

    ssl_certificate     /etc/letsencrypt/live/vinhkhanh.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vinhkhanh.com/privkey.pem;

    root /var/www/vinhkhanh/frontend;
    index index.html;

    # SPA routing — trả về index.html cho mọi route
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
}

# Backend API
server {
    listen 443 ssl http2;
    server_name api.vinhkhanh.com;

    ssl_certificate     /etc/letsencrypt/live/api.vinhkhanh.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.vinhkhanh.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection keep-alive;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads (static files từ wwwroot)
    location /uploads/ {
        alias /var/www/vinhkhanh/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    client_max_body_size 15M;  # Phải >= MaxFileSizeMB trong appsettings
}
```

```bash
# Kích hoạt site
sudo ln -s /etc/nginx/sites-available/vinhkhanh /etc/nginx/sites-enabled/

# Kiểm tra cú pháp
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### 7.3. Cài SSL với Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vinhkhanh.com -d www.vinhkhanh.com -d api.vinhkhanh.com
```

---

## 8. Chạy với Docker (Tuỳ chọn)

### 8.1. Dockerfile — Backend

Tạo file `backend/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/VinhKhanh.API/VinhKhanh.API.csproj", "VinhKhanh.API/"]
COPY ["src/VinhKhanh.Application/VinhKhanh.Application.csproj", "VinhKhanh.Application/"]
COPY ["src/VinhKhanh.Domain/VinhKhanh.Domain.csproj", "VinhKhanh.Domain/"]
COPY ["src/VinhKhanh.Infrastructure/VinhKhanh.Infrastructure.csproj", "VinhKhanh.Infrastructure/"]
RUN dotnet restore "VinhKhanh.API/VinhKhanh.API.csproj"
COPY src/ .
RUN dotnet publish "VinhKhanh.API/VinhKhanh.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "VinhKhanh.API.dll"]
```

### 8.2. Dockerfile — Frontend

Tạo file `admin-frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 8.3. docker-compose.yml

```yaml
version: '3.9'

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: vinhkhanh_foodtour
      MYSQL_USER: vkapp
      MYSQL_PASSWORD: vkpass
    volumes:
      - mysql_data:/var/lib/mysql
      - ./Database:/docker-entrypoint-initdb.d
    ports:
      - "3306:3306"

  api:
    build: ./backend
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: "Server=db;Port=3306;Database=vinhkhanh_foodtour;Uid=vkapp;Pwd=vkpass;CharSet=utf8mb4;"
      Jwt__Key: "<JWT_SECRET>"
    ports:
      - "5000:80"
    depends_on:
      - db
    volumes:
      - uploads:/app/wwwroot/uploads

  frontend:
    build: ./admin-frontend
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  mysql_data:
  uploads:
```

```bash
# Chạy toàn bộ stack
docker compose up -d

# Xem logs
docker compose logs -f api
```

---

## 9. Kiểm tra sau triển khai

### Checklist ✅

```bash
# 1. API health check
curl https://api.vinhkhanh.com/swagger

# 2. Đăng nhập admin
curl -X POST https://api.vinhkhanh.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<password>"}'

# 3. Kiểm tra upload files
curl -F "file=@test.jpg" https://api.vinhkhanh.com/api/media/upload \
  -H "Authorization: Bearer <TOKEN>"

# 4. Backend service đang chạy
sudo systemctl is-active vinhkhanh-api

# 5. MySQL đang chạy
sudo systemctl is-active mysql

# 6. Nginx đang chạy
sudo systemctl is-active nginx
```

### CORS — Cập nhật production origins

Sau khi có domain thật, cập nhật `Program.cs`:

```csharp
.WithOrigins(
    "https://vinhkhanh.com",
    "https://www.vinhkhanh.com"
)
```

---

## 10. Xử lý sự cố thường gặp

### ❌ API không kết nối được MySQL

```bash
# Kiểm tra MySQL đang chạy
sudo systemctl status mysql

# Test kết nối
mysql -u vkapp -p -h localhost vinhkhanh_foodtour

# Xem logs API
sudo journalctl -u vinhkhanh-api --since "10 min ago"
```

### ❌ Frontend hiển thị trang trắng (SPA routing)

Kiểm tra Nginx có `try_files $uri $uri/ /index.html` chưa — đây là bắt buộc với React Router.

### ❌ Upload file lỗi 413 Request Entity Too Large

Tăng `client_max_body_size` trong Nginx config lên lớn hơn `MaxFileSizeMB` trong `appsettings.json`.

### ❌ JWT Invalid Token

- Kiểm tra `Jwt:Key` trong `appsettings.Production.json` có khớp giữa môi trường dev và prod không.
- Đảm bảo `ClockSkew = TimeSpan.Zero` — server và client phải cùng múi giờ.

### ❌ CORS error trên browser

Thêm domain production vào `WithOrigins(...)` trong `Program.cs` và redeploy.

---

## 📞 Liên hệ & Tài liệu thêm

- **Swagger UI** (dev): `http://localhost:5000/swagger`
- **MySQL docs**: <https://dev.mysql.com/doc/>
- **.NET deployment**: <https://learn.microsoft.com/aspnet/core/host-and-deploy/linux-nginx>
- **Certbot SSL**: <https://certbot.eff.org/instructions>
