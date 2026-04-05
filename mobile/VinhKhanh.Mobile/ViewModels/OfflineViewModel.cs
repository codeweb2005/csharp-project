using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Maui.Networking;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.ViewModels;

public partial class OfflineViewModel(ApiClient api, OfflinePackageSyncService sync) : ObservableObject
{
    public ObservableCollection<OfflinePackageCatalogItemDto> Packages { get; } = [];

    [ObservableProperty] private string _statusMessage   = string.Empty;
    [ObservableProperty] private string _installedInfo   = "No offline package installed.";
    [ObservableProperty] private bool   _isBusy;
    [ObservableProperty] private double _downloadProgress;
    [ObservableProperty] private string _lastSyncText    = "Last sync: never";

    /// <summary>T-15: Non-empty when a newer offline package is available on the server.</summary>
    [ObservableProperty] private string _updateBannerText = string.Empty;

    [RelayCommand]
    public async Task LoadAsync()
    {
        UpdateInstalledSummary();
        if (Connectivity.Current.NetworkAccess != NetworkAccess.Internet)
        {
            StatusMessage = "Connect to the internet to list or download packages.";
            return;
        }

        IsBusy = true;
        StatusMessage = string.Empty;
        try
        {
            var list = await api.GetOfflineCatalogAsync();
            Packages.Clear();
            foreach (var p in list.OrderBy(x => x.LanguageId))
                Packages.Add(p);
            StatusMessage = Packages.Count == 0
                ? "No packages available. An admin must create and build an offline package."
                : $"{Packages.Count} package(s) available.";

            // T-15: Check for update in the background (non-blocking)
            _ = Task.Run(async () =>
            {
                var info = await sync.CheckForUpdateAsync();
                await MainThread.InvokeOnMainThreadAsync(() =>
                {
                    UpdateBannerText = info is null
                        ? string.Empty
                        : $"⬆️ Update available: {info.PackageName} v{info.NewVersionLabel} ({info.SizeLabel})";
                });
            });
        }
        finally
        {
            IsBusy = false;
        }
    }

    private void UpdateInstalledSummary()
    {
        var id = sync.GetInstalledPackageId();
        var sum = sync.GetInstalledChecksum();
        InstalledInfo = id is null
            ? "No offline package installed."
            : $"Installed: package #{id}\nChecksum: {sum ?? "—"}";

        // T-09.3: Update last sync label
        var lastSync = sync.GetLastSyncTime();
        if (lastSync is null)
        {
            LastSyncText = "Last sync: never";
        }
        else
        {
            var ago = DateTime.UtcNow - lastSync.Value;
            LastSyncText = ago.TotalMinutes < 1   ? "Last sync: just now"
                         : ago.TotalHours   < 1   ? $"Last sync: {(int)ago.TotalMinutes}m ago"
                         : ago.TotalDays    < 1   ? $"Last sync: {(int)ago.TotalHours}h ago"
                         : $"Last sync: {lastSync.Value.ToLocalTime():dd/MM HH:mm}";
        }
    }

    [RelayCommand]
    public async Task DownloadAsync(OfflinePackageCatalogItemDto? item)
    {
        if (item is null || string.IsNullOrEmpty(item.Checksum))
        {
            StatusMessage = "Select a valid package.";
            return;
        }

        if (Connectivity.Current.NetworkAccess != NetworkAccess.Internet)
        {
            StatusMessage = "Internet required to download.";
            return;
        }

        IsBusy = true;
        DownloadProgress = 0;
        try
        {
            var prog = new Progress<double>(v => DownloadProgress = v);
            var (ok, err) = await sync.DownloadAndInstallAsync(item.Id, item.Checksum, item.LanguageId, prog);
            StatusMessage = ok ? $"Installed “{item.Name}”." : (err ?? "Install failed.");
            UpdateInstalledSummary();
        }
        finally
        {
            IsBusy = false;
            DownloadProgress = 0;
        }
    }

    [RelayCommand]
    public async Task SyncNowAsync()
    {
        if (Connectivity.Current.NetworkAccess != NetworkAccess.Internet)
        {
            StatusMessage = "Connect to the internet to sync.";
            return;
        }

        var installedId = sync.GetInstalledPackageId();
        var localSum = sync.GetInstalledChecksum();
        if (installedId is null)
        {
            StatusMessage = "Download a package first, then use Sync to update when online.";
            await LoadAsync();
            return;
        }

        IsBusy = true;
        DownloadProgress = 0;
        try
        {
            var list = await api.GetOfflineCatalogAsync();
            var remote = list.FirstOrDefault(p => p.Id == installedId.Value);
            if (remote is null || string.IsNullOrEmpty(remote.Checksum))
            {
                StatusMessage = "This package is no longer published on the server.";
                return;
            }

            if (string.Equals(remote.Checksum, localSum, StringComparison.OrdinalIgnoreCase))
            {
                StatusMessage = "Offline package is up to date with the server.";
                return;
            }

            var prog = new Progress<double>(v => DownloadProgress = v);
            var (ok, err) = await sync.DownloadAndInstallAsync(remote.Id, remote.Checksum, remote.LanguageId, prog);
            StatusMessage = ok ? "Offline package updated from server." : (err ?? "Update failed.");
            UpdateInstalledSummary();
        }
        finally
        {
            IsBusy = false;
            DownloadProgress = 0;
        }
    }

    [RelayCommand]
    public async Task RemoveAsync()
    {
        IsBusy = true;
        try
        {
            var (ok, err) = await sync.RemoveInstalledPackageAsync();
            StatusMessage = ok ? "Offline package removed." : (err ?? "Could not remove.");
            UpdateInstalledSummary();
        }
        finally
        {
            IsBusy = false;
        }
    }
}
