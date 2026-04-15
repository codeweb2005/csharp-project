# AGENTS.md — Quy Tac Cho AI Agents

> File nay dinh nghia cac quy tac bat buoc khi AI agent lam viec tren codebase.
> Vi pham bat ky quy tac nao duoi day deu co the gay loi build, loi bao mat, hoac pha vo kien truc du an.

---

## 1. Tong Quan Du An

**Vinh Khanh Food Tour** — Platform audio tour cho tuyen pho am thuc Vinh Khanh (TP.HCM).

| Thanh phan | Cong nghe | Trang thai |
|---|---|---|
| Backend | ASP.NET Core 10, EF Core, MySQL 8 | Phase 1 hoan thanh |
| Admin Frontend | React 19, Vite 7, Ant Design 6.3 | Phase 1 hoan thanh |
| Vendor Frontend | React 19, Vite 7, Ant Design 6.3 | Phase 1 hoan thanh |
| Mobile | .NET MAUI | Phase 2 — chua bat dau |

**3 role:** Admin (quan tri), Vendor (chu quan), Customer (khach du lich).

---

## 2. Cau Truc Thu Muc

```
backend/src/
  VinhKhanh.API/              ← Presentation layer
    Controllers/Controllers.cs   ← TAT CA controllers trong 1 file
    Middleware/Middleware.cs      ← TAT CA middleware trong 1 file
    Program.cs                   ← DI, CORS, JWT, Swagger
  VinhKhanh.Application/      ← Use Cases layer
    Services/IServices.cs        ← TAT CA service interfaces trong 1 file
    DTOs/DTOs.cs                 ← TAT CA DTOs trong 1 file
    Validators/                  ← FluentValidation validators
  VinhKhanh.Domain/           ← Core layer (ZERO dependencies)
    Entities/Entities.cs         ← TAT CA entities trong 1 file
    Entities/BaseEntity.cs       ← Base class duy nhat duoc tach rieng
    Enums/Enums.cs               ← TAT CA enums trong 1 file
    Interfaces/Interfaces.cs     ← TAT CA domain interfaces trong 1 file
  VinhKhanh.Infrastructure/   ← External Concerns layer
    Data/AppDbContext.cs         ← EF Core DbContext
    Repositories/                ← Repository implementations
    Services/                    ← Moi service 1 file rieng (AuthService.cs, POIService.cs, ...)

admin-frontend/src/           ← Admin + Vendor shared panel (port 5173)
  api.js                        ← HTTP client tap trung, auto token refresh
  context/AuthContext.jsx       ← Auth state provider
  hooks/useCurrentUser.js       ← JWT decoder (role, vendorPOIIds)
  pages/                        ← Page components
  components/                   ← Reusable components

vendor-frontend/src/          ← Vendor-only panel (port 5174)

Database/                     ← SQL migration scripts (001_*.sql — 006_*.sql)
```

---

## 3. Quy Tac Clean Architecture — CRITICAL

### Huong dependency (BAT BUOC)

```
API → Application → Domain ← Infrastructure
```

- **Domain KHONG co bat ky NuGet package nao.** File `.csproj` chi chua `<TargetFramework>net10.0</TargetFramework>`. KHONG BAO GIO them `<PackageReference>` vao Domain.
- **Application** chi tham chieu **Domain**.
- **Infrastructure** tham chieu **Domain** va **Application**.
- **API** tham chieu **Application** va **Infrastructure** (de dang ky DI).

### Quy tac file tap trung (BAT BUOC)

Du an su dung pattern **1 file cho moi loai** de de nhin toan bo contract:

| Loai | File | Luu y |
|---|---|---|
| Controllers | `API/Controllers/Controllers.cs` | Them controller moi vao CUOI file, ngan cach bang `// ====` |
| Middleware | `API/Middleware/Middleware.cs` | Tuong tu controllers |
| Service interfaces | `Application/Services/IServices.cs` | Them interface moi vao cuoi file |
| DTOs | `Application/DTOs/DTOs.cs` | Them DTO moi vao cuoi file |
| Entities | `Domain/Entities/Entities.cs` | Them entity moi vao cuoi file |
| Enums | `Domain/Enums/Enums.cs` | Them enum moi vao cuoi file |
| Domain interfaces | `Domain/Interfaces/Interfaces.cs` | Them interface moi vao cuoi file |
| Service implementations | `Infrastructure/Services/{Name}Service.cs` | **MOI service 1 file rieng** |

**KHONG TAO file rieng** cho tung controller, DTO, service interface, entity, hoac enum. Chi service implementation trong Infrastructure moi duoc tach file.

---

## 4. Quy Tac Dat Ten

### Backend (C#)

| Loai | Pattern | Vi du |
|---|---|---|
| Entity | PascalCase, so it | `POI`, `User`, `AudioNarration`, `POIMenuItem` |
| DTO Request | `Create{Entity}Request`, `Update{Entity}Request` | `CreatePOIRequest`, `UpdatePOIRequest` |
| DTO Response | `{Entity}Dto`, `{Entity}ListDto`, `{Entity}DetailDto` | `POIListDto`, `POIDetailDto` |
| Interface | `I{Name}Service`, `I{Name}Repository` | `IAuthService`, `IPOIRepository` |
| Service | `{Name}Service` | `AuthService`, `POIService` |
| Controller | `{Name}Controller` ke thua `BaseApiController` | `POIsController`, `AuthController` |
| Enum | PascalCase | `UserRole`, `TriggerType`, `MediaType` |
| Namespace | `VinhKhanh.{Layer}.{Folder}` | `VinhKhanh.Domain.Entities` |
| Error code | UPPER_SNAKE_CASE | `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_ERROR` |

### Frontend (React)

| Loai | Pattern | Vi du |
|---|---|---|
| Component | PascalCase folder + file | `MapPicker/MapPicker.jsx`, `AudioPreview/AudioPreview.jsx` |
| Page | `pages/{Feature}/{Feature}.jsx` | `pages/POI/POIList.jsx` |
| Hook | camelCase voi `use` prefix | `useCurrentUser.js`, `useAuth` |
| Context | `{Name}Context.jsx` | `AuthContext.jsx` |
| API module | Tap trung trong `api.js` | `pois.getAll()`, `auth.login()` |
| CSS | Vanilla CSS co-located voi component | `POIList.css` (KHONG Tailwind, KHONG CSS-in-JS) |

### API Routes

- Base: `/api/v1/[controller]` (lowercase)
- CRUD: `GET /pois`, `POST /pois`, `PUT /pois/{id}`, `DELETE /pois/{id}`
- Toggle: `PATCH /pois/{id}/toggle`
- Public: `GET /pois/{id}/public`, `GET /pois/nearby` (AllowAnonymous)

---

## 5. Quy Tac Bao Mat — CRITICAL

### Two-layer security model

1. **Frontend (UX only):** An/hien UI elements dua tren role. Co the bi bypass — KHONG BAO GIO tin tuong.
2. **Backend (authoritative):** JWT claims + service-level data scoping + ownership guards. Day la tang bao mat thuc su.

### JWT Claims

| Claim | Mo ta | Ai co |
|---|---|---|
| `sub` | User ID | Tat ca |
| `role` | `Admin` / `Vendor` / `Customer` | Tat ca |
| `vendorPoiId` | Single int — ID cua POI ma vendor nay quan ly | Chi Vendor |

### Quy tac bat buoc

- **KHONG** xoa hoac lam yeu `[Authorize]` attributes tren bat ky endpoint nao.
- **KHONG** doi `[Authorize(Roles = "Admin")]` thanh `[AllowAnonymous]` hoac `[Authorize]`.
- **KHONG** them `[AllowAnonymous]` vao cac endpoint quan tri (users, settings, offline packages).
- **KHONG** xoa `[AllowAnonymous]` khoi cac endpoint mobile (nearby, public detail, languages, audio stream).
- **Vendor write operations BAT BUOC** kiem tra ownership: `if (poi.VendorUserId != callerId) return FORBIDDEN`.
- **Vendor scoping:** Controller goi `GetVendorPOIIdsAsync()` lay fresh POI IDs tu DB, truyen vao service. Service filter `WHERE POIId IN (vendorPOIIds)`.
- **Password:** PBKDF2-SHA256, 100,000 iterations, 16-byte random salt (`PasswordHasher.cs`). KHONG BAO GIO luu plaintext, KHONG log password/token.
- **Refresh token:** SHA-256 hash trong DB, rotation moi lan dung, revoke khi phat hien reuse. KHONG thay doi flow nay.
- **JWT signing:** HMAC-SHA256, `ClockSkew = TimeSpan.Zero`. KHONG them clock skew tolerance.
- **KHONG BAO GIO** commit `appsettings.json`, `.env`, hoac bat ky file chua secrets.

---

## 6. Quy Tac Database

- **KHONG su dung EF Core Migrations.** KHONG chay `dotnet ef migrations add`. KHONG tao thu muc `Migrations/`.
- Schema changes = raw SQL scripts trong `Database/`, danh so tang dan: `007_MoTa.sql`, `008_MoTa.sql`, ...
- Scripts nen idempotent khi co the (`IF NOT EXISTS`, `IF NOT EXISTS` cho columns).
- MySQL 8 syntax. Engine: `InnoDB`. Collation: `utf8mb4_unicode_ci`.
- Spatial queries: `ST_Distance_Sphere(POINT(lng, lat), POINT(poi.Longitude, poi.Latitude))` — **POINT nhan (longitude, latitude)**, KHONG phai (lat, lng).
- `TotalVisits` tren POI la denormalized. Cap nhat khi them visit, KHONG thay the bang `COUNT(*)`.
- Highlights trong `POITranslations` la JSON string — serialize voi `System.Text.Json.JsonSerializer`.

---

## 7. Quy Tac API

- **Tat ca response** phai wrap trong `ApiResponse<T>`: `{ success, data, error }`.
- Su dung `ApiResult()` helper tu `BaseApiController` de map error code → HTTP status.
- Error codes: `NOT_FOUND` → 404, `FORBIDDEN` → 403, `UNAUTHORIZED` → 401, `VALIDATION_ERROR` → 400.
- Pagination: `PagedResult<T>` voi query params `page` + `size`.
- JSON: `camelCase` property naming, `JsonIgnoreCondition.WhenWritingNull`.
- File uploads: `multipart/form-data`. KHONG set `Content-Type: application/json` cho FormData.
- Them controller moi: them vao `Controllers.cs` voi comment separator `// ================================`.

---

## 8. Quy Tac Frontend

### Chung

- **HAI frontend rieng biet:** `admin-frontend/` (port 5173) va `vendor-frontend/` (port 5174). Chung co cau truc tuong tu nhung la 2 codebase doc lap.
- **TAT CA API calls** di qua `api.js` function `request()`. KHONG BAO GIO dung `fetch()` truc tiep trong components.
- `request()` tu dong refresh token khi gap 401. KHONG them logic refresh token rieng.
- Token storage: `localStorage` voi keys `accessToken`, `refreshToken`, `user`.
- **Ngon ngu chu thich:** TAT CA comments, labels, placeholders, tooltips, va UI text trong code frontend PHAI dung **tieng Anh**. KHONG dung tieng Viet trong code comments hoac hardcoded UI strings.

### Thu vien UI (BAT BUOC tuan thu)

| Muc dich | Thu vien | KHONG dung |
|---|---|---|
| UI Components | **Ant Design 6.3** | Material UI, Chakra UI, Headless UI |
| Icons | **Lucide React** | Font Awesome, Heroicons, React Icons |
| Charts | **Recharts** | Chart.js, D3, Nivo |
| Maps | **Leaflet** | Google Maps JS API |
| CSS | **Vanilla CSS** (co-located) | Tailwind, styled-components, CSS-in-JS |
| Routing | **React Router v7** | Next.js, TanStack Router |

### Role gating trong UI

- Dung `isVendor` / `isAdmin` tu `useCurrentUser()` de show/hide elements.
- Sidebar: items co `adminOnly: true` bi an voi Vendor.
- DashboardRoute: render `VendorDashboard` (neu isVendor) hoac `Dashboard` (neu Admin).
- Day la UX only — backend la tang bao mat thuc su.

---

## 9. Quy Tac Dependency Injection

- Tat ca service registrations trong `Program.cs`.
- Mac dinh: `AddScoped<IService, Service>()`.
- Ngoai le: `JwtService` dang ky `Singleton`.
- Repositories: `IRepository<T>` (generic) + `IPOIRepository` (specialized).
- File storage: DI co dieu kien dua tren `FileStorage:Provider` config (`local` vs `s3`).
- **Khi them service moi:**
  1. Them interface vao `Application/Services/IServices.cs`
  2. Tao implementation trong `Infrastructure/Services/{Name}Service.cs`
  3. Dang ky trong `Program.cs` section "Application Services"

---

## 10. KHONG DUOC LAM (DO NOT)

1. **KHONG** tao file rieng cho tung controller, DTO, service interface, entity, hoac enum.
2. **KHONG** them NuGet packages vao `VinhKhanh.Domain`.
3. **KHONG** su dung `dotnet ef migrations`. Viet raw SQL scripts.
4. **KHONG** bypass `ApiResponse<T>` envelope. Moi API response phai duoc wrap.
5. **KHONG** dung `fetch()` truc tiep trong React components. Dung `api.js`.
6. **KHONG** them Tailwind, CSS-in-JS, styled-components, hoac CSS framework khac.
7. **KHONG** them Material UI, Chakra, hoac UI library khac ngoai Ant Design.
8. **KHONG** them Chart.js, D3, hoac charting library khac ngoai Recharts.
9. **KHONG** them icon library khac ngoai Lucide React.
10. **KHONG** bo qua vendor ownership check trong write operations.
11. **KHONG** xoa `[AllowAnonymous]` khoi mobile-facing endpoints.
12. **KHONG** them `[AllowAnonymous]` vao admin/vendor management endpoints.
13. **KHONG** commit `.env`, `appsettings.json`, hoac file chua secrets.
14. **KHONG** thay doi thu tu middleware pipeline trong `Program.cs`.
15. **KHONG** them MediatR, CQRS, hoac pattern phuc tap khong can thiet. Du an dung direct service calls.
16. **KHONG** them AutoMapper profiles. Du an dung manual mapping (`new Dto { ... }`) trong services.
17. **KHONG** tao thu muc `Migrations/` trong bat ky project nao.
18. **KHONG** su dung `Console.WriteLine` cho logging. Dung `ILogger<T>`.

---

## 11. Checklist Truoc Khi Commit

- [ ] `dotnet build` thanh cong, khong loi
- [ ] Domain `.csproj` van khong co `<PackageReference>`
- [ ] Dependency direction dung (khong co tham chieu nguoc)
- [ ] Code moi dat dung file tap trung (Controllers.cs, DTOs.cs, IServices.cs, Entities.cs, Enums.cs, Interfaces.cs)
- [ ] Service implementation moi co file rieng trong `Infrastructure/Services/`
- [ ] `ApiResponse<T>` envelope cho tat ca endpoint moi
- [ ] `[Authorize]` attributes dung role
- [ ] Vendor ownership guard cho write operations
- [ ] Khong co secrets trong committed files
- [ ] Frontend API calls dung `api.js`, khong `fetch()` truc tiep
- [ ] SQL changes la file `Database/00N_*.sql`, khong EF migrations
- [ ] DI registration trong `Program.cs`

---

## 12. Tham Chieu Tai Lieu

| File | Noi dung |
|---|---|
| [README.md](README.md) | Tong quan, quickstart, cau truc repo |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kien truc Clean Architecture, layer map, design decisions |
| [API_REFERENCE.md](API_REFERENCE.md) | Tat ca REST endpoints, request/response, auth requirements |
| [VENDOR_PORTAL.md](VENDOR_PORTAL.md) | Vendor role, JWT scoping, two-layer security, capabilities matrix |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Server deployment, Docker, Nginx, systemd |
| [task_list.md](task_list.md) | Roadmap chi tiet (4 phases), trang thai tung task |
