# 📋 Task List — Phase 3 MVP Gap Completion
**Project:** Vinh Khanh Food Tour  
**Repo:** `c:\ptran_docs\dct123c6\Csharp\VinhKhanh\c-sharp-au`  
**Baseline:** Phase 1 ✅ hoàn chỉnh · Phase 2 PoC ✅ hoàn chỉnh (foreground only)  
**Mục tiêu:** Bổ sung các gap để đạt chuẩn MVP thực địa

> Legend: `[ ]` = chưa làm · `[/]` = đang làm · `[x]` = xong

---

## 🔴 CRITICAL — Blocking (Phải có trước khi test thực địa)

### T-01 · Background GPS — Android ForegroundService
> **Vấn đề:** `LocationService.cs` hiện dùng `GetLocationAsync` polling — GPS dừng khi màn hình tắt.  
> **Yêu cầu:** GPS tiếp tục tracking khi app ở background (màn hình khoá).

- [ ] **T-01.1** Tạo `Platforms/Android/GpsTrackerService.cs`  
  - Kế thừa `Android.App.Service`  
  - Khai báo là **Foreground Service** (với notification "Vinh Khanh đang theo dõi vị trí")  
  - Dùng `FusedLocationProviderClient` hoặc `Geolocation.StartListeningForegroundAsync()` (MAUI Essentials)  
  - Raise event sang `LocationService` qua `WeakReferenceMessenger` hoặc `EventBus`

- [ ] **T-01.2** Cập nhật `AndroidManifest.xml`  
  - Thêm permission: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` (Android 10+)  
  - Khai báo `<service>` element cho `GpsTrackerService`

- [ ] **T-01.3** Cập nhật `LocationService.cs`  
  - Thêm `#if ANDROID` block: khởi động `GpsTrackerService` thay vì polling loop  
  - `#if !ANDROID`: giữ polling loop hiện tại cho iOS/Windows fallback tạm thời

- [ ] **T-01.4** Cập nhật `MauiProgram.cs` (DI registration)  
  - Đăng ký `GpsTrackerService` cho Android target

---

### T-02 · Background GPS — iOS Background Mode
> **Vấn đề:** `Info.plist` chỉ có `NSLocationWhenInUseUsageDescription`, thiếu background location.

- [ ] **T-02.1** Cập nhật `Platforms/iOS/Info.plist`  
  - Thêm key: `NSLocationAlwaysAndWhenInUseUsageDescription` (mô tả rõ lý do cần Always)  
  - Thêm key: `NSLocationAlwaysUsageDescription`  
  - Thêm `UIBackgroundModes` → item `location`

- [ ] **T-02.2** Tạo `Platforms/iOS/IosCLLocationDelegate.cs`  
  - Implement `CLLocationManagerDelegate`  
  - Set `allowsBackgroundLocationUpdates = true`  
  - `pausesLocationUpdatesAutomatically = false`  
  - Forward location events sang `ILocationService.LocationUpdated`

- [ ] **T-02.3** Cập nhật `LocationService.cs`  
  - Thêm `#if IOS` block: sử dụng `IosCLLocationDelegate` thay cho polling  
  - Dùng `Geolocation.StartListeningForegroundAsync()` với `ListenRequest` accuracy

---

### T-03 · Upgrade Permission Request (LocationWhenInUse → LocationAlways)
> **Vấn đề:** `LocationService.StartTrackingAsync()` chỉ request `Permissions.LocationWhenInUse`.

- [ ] **T-03.1** Cập nhật `LocationService.StartTrackingAsync()`  
  - Request `Permissions.LocationAlways` trên Android 10+ và iOS  
  - Nếu bị từ chối: fallback về `LocationWhenInUse` + hiển thị toast giải thích  
  - Lưu permission level vào `Preferences` để biết chế độ đang dùng

- [ ] **T-03.2** Thêm `PermissionStatusPage` hoặc inline dialog  
  - Khi permission bị từ chối: hướng dẫn vào Settings > App > Location > "Always"  
  - Hiển thị trong `MainPage.OnAppearing()` nếu `IsTracking == false`

---

## 🟡 MEDIUM — Quan trọng cho UX thực địa

### T-04 · Geofence Cooldown per POI
> **Vấn đề:** Sau khi phát narration xong, nếu tourist đứng yên trong geofence → khi debounce reset, sẽ phát lại ngay.

- [ ] **T-04.1** Cập nhật `GeofenceEngine.cs`  
  - Thêm `Dictionary<int, DateTime> _cooldownUntil` (POI ID → cooldown expiry time)  
  - Thêm property `public TimeSpan CooldownDuration { get; set; } = TimeSpan.FromMinutes(5)`  
  - Trong `OnLocationUpdated`: chỉ fire `GeofenceEntered` nếu `DateTime.UtcNow > _cooldownUntil[poiId]`  
  - Expose `public void ResetCooldown(int poiId)` — dùng khi user bấm Play Again thủ công

- [ ] **T-04.2** Cập nhật `MainViewModel.cs`  
  - Sau khi `PlaybackCompleted` event fire: gọi `_geofence.SetCooldown(poi.Id)`  
  - Khi user bấm Stop thủ công: **không** reset cooldown (họ tự dừng)

- [ ] **T-04.3** Cập nhật `MobileAppSettings.cs`  
  - Thêm property `GeofenceCooldownMinutes` (default: 5)  
  - Đọc từ embedded `appsettings.json`

---

### T-05 · Visit Tracking — Mobile → Server
> **Vấn đề:** Backend có `POST /api/v1/sync/visits` + `SyncService.UploadVisitsAsync()` đầy đủ, nhưng mobile **chưa gọi** endpoint này.

- [ ] **T-05.1** Tạo `Services/VisitQueueStore.cs`  
  - Queue local (in-memory + Preferences fallback) lưu `VisitEntry` pending upload  
  - `VisitEntry`: PoiId, LangId, TriggerType (Geofence/Manual), NarrationPlayed, ListenDuration, VisitedAt, Lat, Lng

- [ ] **T-05.2** Cập nhật `ApiClient.cs`  
  - Thêm method `UploadVisitsAsync(List<VisitEntry> visits)` — POST `/api/v1/sync/visits`  
  - Chỉ gọi khi `Connectivity.Current.NetworkAccess == Internet`

- [ ] **T-05.3** Cập nhật `MainViewModel.cs`  
  - Khi `GeofenceEntered` → enqueue visit với `TriggerType = "geofence"`, `NarrationPlayed = true`  
  - Khi `PlaybackCompleted` → cập nhật `ListenDuration` của visit entry đó  
  - On app resume/online: flush queue lên server

- [ ] **T-05.4** Cập nhật `PoiDetailViewModel.cs`  
  - Khi user bấm Play Narration thủ công → enqueue visit với `TriggerType = "manual"`

---

### T-06 · Settings UI — GPS & Geofence Configuration
> **Vấn đề:** `DefaultRadiusMeters`, `DebounceReadings`, `LocationPollIntervalSeconds` chỉ có trong `appsettings.json` (hardcode), user không thể tự điều chỉnh.

- [ ] **T-06.1** Tạo `Views/SettingsPage.xaml` + `Views/SettingsPage.xaml.cs`  
  - Slider: **Geofence radius** (50m – 500m, step 10m)  
  - Slider: **GPS poll interval** (3s – 15s)  
  - Slider: **Debounce readings** (1 – 5)  
  - Slider: **Cooldown per POI** (1 – 15 phút)  
  - Toggle: **Auto-play narration** (bật/tắt auto-play khi vào geofence)  
  - Button: **Reset to defaults**

- [ ] **T-06.2** Tạo `ViewModels/SettingsViewModel.cs`  
  - Load từ `Preferences` (user overrides) hoặc `MobileAppSettings` (defaults)  
  - Save về `Preferences` khi thay đổi  
  - Publish `WeakReferenceMessenger` message để `MainViewModel` + `GeofenceEngine` cập nhật live

- [ ] **T-06.3** Cập nhật `AppShell.xaml`  
  - Thêm tab "Settings" (icon ⚙️) hoặc thêm vào Profile tab dưới dạng section

- [ ] **T-06.4** Cập nhật `MauiProgram.cs`  
  - Đăng ký `SettingsPage` + `SettingsViewModel` vào DI

---

### T-07 · TTS Voice Picker — Mobile
> **Vấn đề:** Backend hỗ trợ nhiều Azure voice (vi-VN-HoaiMyNeural, vi-VN-NamMinhNeural...), nhưng mobile chỉ dùng system TTS mặc định.

- [ ] **T-07.1** Cập nhật `ApiClient.cs`  
  - Thêm `GetAvailableVoicesAsync(int langId)` — GET `/api/v1/audio/poi/{poiId}/...` hoặc backend endpoint mới

- [ ] **T-07.2** Thêm backend endpoint (nếu chưa có)  
  - `GET /api/v1/languages/{langId}/voices` → trả danh sách Azure voice names cho ngôn ngữ đó  
  - Có thể lấy từ `Language.TtsCode` + hardcoded voice list per locale ban đầu

- [ ] **T-07.3** Cập nhật `SettingsPage.xaml` (T-06)  
  - Thêm Picker: **TTS Voice** (danh sách voices theo ngôn ngữ đang chọn)  
  - Lưu `preferred_tts_voice` vào `Preferences`

- [ ] **T-07.4** Cập nhật `NarrationPlayer.PlayTtsAsync()`  
  - Đọc `preferred_tts_voice` từ `Preferences`  
  - Map sang `SpeechOptions.Locale` tương ứng

---

## 🟠 LOW-MEDIUM — Cải thiện chất lượng

### T-08 · Offline Map Tiles
> **Vấn đề:** `MapPage` dùng Leaflet/OpenStreetMap qua WebView — cần mạng để load map tiles.

- [ ] **T-08.1** **Đánh giá** Mapbox SDK vs. Maptiler offline vs. pre-bundled tile approach  
  - Option A: `Mapbox SDK for .NET MAUI` (có offline region download)  
  - Option B: Download `.mbtiles` file (giới hạn khu vực Vinh Khanh Q4 HCM)  
  - Option C: Giữ WebView + thêm service worker cache (giới hạn)  
  → **Khuyến nghị:** Option B với file `.mbtiles` nhỏ (~30MB cho 1 quận)

- [ ] **T-08.2** Nếu chọn MBTiles approach:  
  - Thêm `MBTilesSharp` NuGet hoặc custom tile server nhúng trong app  
  - Bundle `.mbtiles` file vào `MauiAsset`  
  - Cập nhật `leaflet_tour_map.html` để dùng local tile URL thay CDN

- [ ] **T-08.3** Fallback logic  
  - Nếu có mạng → dùng OSM CDN (hiện tại)  
  - Nếu offline → chuyển sang local tiles

---

### T-09 · Delta Sync — Mobile → Backend
> **Vấn đề:** Backend có `GET /api/v1/sync/delta` (SyncService đầy đủ), nhưng mobile **chưa dùng** endpoint này để cập nhật POI data sau khi app đã cài.

- [ ] **T-09.1** Cập nhật `OfflinePackageSyncService.cs`  
  - Thêm `SyncDeltaAsync(DateTime lastSync)` → gọi `GET /api/v1/sync/delta`  
  - Upsert POI changes vào `OfflineCacheStore`  
  - Lưu `last_sync_time` vào `Preferences`

- [ ] **T-09.2** Cập nhật `MainViewModel.RefreshPoisAsync()`  
  - Sau khi fetch online POIs: gọi delta sync để keep local cache fresh  
  - Chạy delta sync ở background (không block UI)

- [ ] **T-09.3** Cập nhật `OfflinePage.xaml` / `OfflineViewModel.cs`  
  - Thêm label "Last synced: {time}" để user biết dữ liệu có cũ không

---

### T-10 · Narration Error Handling & Retry
> **Vấn đề:** Nếu audio stream URL không khả dụng, `NarrationPlayer` hiện chỉ log warning và không fallback hoàn toàn.

- [ ] **T-10.1** Cập nhật `NarrationPlayer.PlayAudioAsync()`  
  - Đăng ký `MediaElement.MediaFailed` event  
  - Khi stream fail: tự động fallback sang `PlayTtsAsync()` với `NarrationText`  
  - Thông báo user bằng toast "Audio không khả dụng, đang dùng TTS"

- [ ] **T-10.2** Cập nhật `NarrationPlayer.PlayTtsAsync()`  
  - Nếu TTS cũng fail (không có locale phù hợp): dùng system default locale  
  - Log warning khi fallback xảy ra

---

### T-11 · Notification khi Geofence Trigger (Background)
> **Vấn đề:** Khi app ở background và GPS trigger geofence, user cần được thông báo.

- [ ] **T-11.1** Thêm `LocalNotificationService.cs`  
  - Dùng `Plugin.LocalNotification` NuGet hoặc platform native  
  - Android: `NotificationManager.notify()` với sound + vibrate  
  - iOS: `UNUserNotificationCenter` request

- [ ] **T-11.2** Cập nhật `MainViewModel.OnGeofenceEntered()`  
  - Nếu app ở background: gửi notification "🍜 {POI Name} — Nhấn để nghe thuyết minh"  
  - Nếu app ở foreground: auto-play như hiện tại (không gửi notification)

- [ ] **T-11.3** Cập nhật permissions  
  - Android: thêm `POST_NOTIFICATIONS` (Android 13+)  
  - iOS: request `UNAuthorizationOptions.Alert | Sound`

---

## 🔵 POLISH — Hoàn thiện trải nghiệm

### T-12 · NowPlayingBar — Hiển thị Progress
- [ ] Thêm `ProgressBar` tiến trình audio vào `NowPlayingBar` trong `MainPage.xaml`  
- [ ] Bind vào `MediaElement.Position` / `MediaElement.Duration`  
- [ ] Hiện thị thời gian còn lại `MM:SS` remaining

### T-13 · PoiDetailPage — Hiển thị đầy đủ nội dung
- [ ] Gọi `GET /api/v1/pois/{id}/public?langId=...` để lấy full detail (hiện tại chỉ dùng data từ nearby list)  
- [ ] Hiển thị: hình ảnh (POIMedia), highlights, mô tả đầy đủ, menu items  
- [ ] Add `CollectionView` cho menu items với Price + Signature badge

### T-14 · Splash Screen & Onboarding
- [ ] Thay SVG splash screen mặc định bằng brand logo Vinh Khanh  
- [ ] Tạo `OnboardingPage.xaml`: 3 slide giới thiệu tính năng (GPS, Audio, Offline)  
- [ ] Chỉ hiện lần đầu khởi động (`Preferences.Get("onboarding_done")`

### T-15 · Testing
- [ ] Viết unit test cho `GeofenceEngine.HaversineMeters()` với các test case đã biết  
- [ ] Viết unit test cho `GeofenceEngine.OnLocationUpdated()` với mock `ILocationService`  
- [ ] Viết unit test cooldown logic (T-04)  
- [ ] Test integration: Backend `/api/v1/pois/nearby` với MySQL ST_Distance_Sphere

---

## 📅 Thứ Tự Ưu Tiên Triển Khai

```
Sprint 1 (Blocking — test thực địa):
  T-01 Background GPS Android
  T-02 Background GPS iOS
  T-03 Permission upgrade
  T-04 Geofence Cooldown

Sprint 2 (Core UX):
  T-05 Visit Tracking
  T-06 Settings UI
  T-11 Background Notification

Sprint 3 (Feature Complete):
  T-07 TTS Voice Picker
  T-09 Delta Sync
  T-10 Narration Error Handling

Sprint 4 (Polish):
  T-08 Offline Map
  T-12 NowPlayingBar Progress
  T-13 PoiDetailPage Full Content
  T-14 Onboarding
  T-15 Testing
```

---

## 📁 Files Sẽ Thay Đổi / Thêm Mới

| Task | File | Action |
|---|---|---|
| T-01 | `Platforms/Android/GpsTrackerService.cs` | **NEW** |
| T-01 | `Platforms/Android/AndroidManifest.xml` | MODIFY |
| T-01, T-03 | `Services/LocationService.cs` | MODIFY |
| T-02 | `Platforms/iOS/IosCLLocationDelegate.cs` | **NEW** |
| T-02 | `Platforms/iOS/Info.plist` | MODIFY |
| T-04 | `Services/GeofenceEngine.cs` | MODIFY |
| T-04 | `Services/MobileAppSettings.cs` | MODIFY |
| T-05 | `Services/VisitQueueStore.cs` | **NEW** |
| T-05 | `Services/ApiClient.cs` | MODIFY |
| T-05 | `ViewModels/MainViewModel.cs` | MODIFY |
| T-05 | `ViewModels/PoiDetailViewModel.cs` | MODIFY |
| T-06 | `Views/SettingsPage.xaml` | **NEW** |
| T-06 | `Views/SettingsPage.xaml.cs` | **NEW** |
| T-06 | `ViewModels/SettingsViewModel.cs` | **NEW** |
| T-06 | `AppShell.xaml` | MODIFY |
| T-06 | `MauiProgram.cs` | MODIFY |
| T-07 | `Views/SettingsPage.xaml` | MODIFY |
| T-07 | `Services/NarrationPlayer.cs` | MODIFY |
| T-09 | `Services/OfflinePackageSyncService.cs` | MODIFY |
| T-10 | `Services/NarrationPlayer.cs` | MODIFY |
| T-11 | `Services/LocalNotificationService.cs` | **NEW** |
| T-11 | `ViewModels/MainViewModel.cs` | MODIFY |
| T-12 | `Views/MainPage.xaml` | MODIFY |
| T-13 | `ViewModels/PoiDetailViewModel.cs` | MODIFY |
| T-13 | `Views/PoiDetailPage.xaml` | MODIFY |
