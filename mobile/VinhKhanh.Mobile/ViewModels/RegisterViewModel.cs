using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.ViewModels;

public partial class RegisterViewModel : ObservableObject
{
    private readonly ApiClient _api;

    [ObservableProperty] private string _username = string.Empty;
    [ObservableProperty] private string _email = string.Empty;
    [ObservableProperty] private string _password = string.Empty;
    [ObservableProperty] private string _fullName = string.Empty;
    [ObservableProperty] private string _errorMessage = string.Empty;
    [ObservableProperty] private bool _isBusy;

    public RegisterViewModel(ApiClient api) => _api = api;

    [RelayCommand]
    private async Task RegisterAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        ErrorMessage = string.Empty;
        try
        {
            var langId = Preferences.Default.Get("preferred_language_id", 1);
            var (ok, err) = await _api.RegisterAsync(
                Username.Trim(),
                Email.Trim(),
                Password,
                string.IsNullOrWhiteSpace(FullName) ? null : FullName.Trim(),
                langId);

            if (ok)
                await Shell.Current.GoToAsync("../..");
            else
                ErrorMessage = err ?? "Registration failed.";
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    private static async Task GoBackAsync()
        => await Shell.Current.GoToAsync("..");
}
