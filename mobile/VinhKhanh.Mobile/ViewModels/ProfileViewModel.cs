using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using CommunityToolkit.Mvvm.Messaging.Messages;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.ViewModels;

public partial class ProfileViewModel : ObservableObject
{
    private readonly ApiClient _api;

    [ObservableProperty] private string _userSummary = "Not signed in";
    [ObservableProperty] private string _selectedLanguageLabel = string.Empty;
    [ObservableProperty] private bool _isBusy;
    [ObservableProperty] private bool _isSignedIn;
    [ObservableProperty] private string _fullNameEdit = string.Empty;
    [ObservableProperty] private string _phoneEdit = string.Empty;
    [ObservableProperty] private string _profileMessage = string.Empty;
    [ObservableProperty] private string _profileError = string.Empty;
    [ObservableProperty] private LanguageResponse? _selectedLanguage;

    public ObservableCollection<LanguageResponse> Languages { get; } = [];

    public ProfileViewModel(ApiClient api) => _api = api;

    [RelayCommand]
    public async Task LoadAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        ProfileMessage = ProfileError = string.Empty;
        try
        {
            await _api.RestoreSessionAsync();

            Languages.Clear();
            foreach (var l in await _api.GetLanguagesAsync())
                Languages.Add(l);

            var langId = Preferences.Default.Get("preferred_language_id", 1);
            SelectedLanguage = Languages.FirstOrDefault(x => x.Id == langId) ?? Languages.FirstOrDefault();
            UpdateLanguageLabel();

            if (await _api.HasStoredSessionAsync())
            {
                var me = await _api.GetMeAsync();
                if (me is not null)
                {
                    IsSignedIn = true;
                    FullNameEdit = me.FullName ?? string.Empty;
                    PhoneEdit = me.Phone ?? string.Empty;
                    UserSummary = $"{me.FullName}\n{me.Email}\n{me.Role}";
                }
                else
                {
                    IsSignedIn = false;
                    FullNameEdit = PhoneEdit = string.Empty;
                    UserSummary = "Session expired. Sign in again.";
                }
            }
            else
            {
                IsSignedIn = false;
                FullNameEdit = PhoneEdit = string.Empty;
                UserSummary = "Not signed in";
            }
        }
        finally
        {
            IsBusy = false;
        }
    }

    partial void OnSelectedLanguageChanged(LanguageResponse? value)
    {
        if (value is null) return;
        Preferences.Default.Set("preferred_language_id", value.Id);
        UpdateLanguageLabel();
        WeakReferenceMessenger.Default.Send(new ValueChangedMessage<int>(value.Id));
    }

    private void UpdateLanguageLabel()
    {
        SelectedLanguageLabel = SelectedLanguage?.DisplayLabel ?? string.Empty;
    }

    [RelayCommand]
    private static async Task OpenLoginAsync()
        => await Shell.Current.GoToAsync("login");

    [RelayCommand]
    private async Task SaveProfileAsync()
    {
        if (!IsSignedIn || IsBusy) return;
        IsBusy = true;
        ProfileMessage = ProfileError = string.Empty;
        try
        {
            var name = string.IsNullOrWhiteSpace(FullNameEdit) ? null : FullNameEdit.Trim();
            var phone = string.IsNullOrWhiteSpace(PhoneEdit) ? null : PhoneEdit.Trim();
            var (ok, err) = await _api.UpdateProfileAsync(name, phone, SelectedLanguage?.Id);
            if (!ok)
            {
                ProfileError = err ?? "Could not save profile.";
                return;
            }

            ProfileMessage = "Profile saved.";
            var me = await _api.GetMeAsync();
            if (me is not null)
                UserSummary = $"{me.FullName}\n{me.Email}\n{me.Role}";
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    private async Task LogoutAsync()
    {
        await _api.LogoutAsync();
        IsSignedIn = false;
        FullNameEdit = PhoneEdit = string.Empty;
        UserSummary = "Not signed in";
    }
}
