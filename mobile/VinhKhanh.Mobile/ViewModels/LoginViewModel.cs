using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.ViewModels;

public partial class LoginViewModel : ObservableObject
{
    private readonly ApiClient _api;

    [ObservableProperty] private string _email = string.Empty;
    [ObservableProperty] private string _password = string.Empty;
    [ObservableProperty] private string _errorMessage = string.Empty;
    [ObservableProperty] private string _infoMessage = string.Empty;
    [ObservableProperty] private bool _isBusy;

    public LoginViewModel(ApiClient api) => _api = api;

    [RelayCommand]
    private async Task LoginAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        ErrorMessage = InfoMessage = string.Empty;
        try
        {
            var (ok, err) = await _api.LoginAsync(Email.Trim(), Password);
            if (ok)
                await Shell.Current.GoToAsync("..");
            else
                ErrorMessage = err ?? "Login failed.";
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    private static async Task GoRegisterAsync()
        => await Shell.Current.GoToAsync("register");

    [RelayCommand]
    private static async Task GoResetPasswordAsync()
        => await Shell.Current.GoToAsync("resetPassword");

    [RelayCommand]
    private async Task ForgotPasswordAsync()
    {
        if (string.IsNullOrWhiteSpace(Email))
        {
            InfoMessage = "Enter your email above first.";
            return;
        }

        IsBusy = true;
        ErrorMessage = string.Empty;
        try
        {
            var (ok, err, devToken) = await _api.ForgotPasswordAsync(Email.Trim());
            if (!ok)
                ErrorMessage = err ?? "Request failed.";
            else
            {
                InfoMessage = "If an account exists for this email, reset instructions have been sent.";
                if (!string.IsNullOrEmpty(devToken))
                {
                    InfoMessage += " Opening reset screen with your dev code.";
                    var qEmail = Uri.EscapeDataString(Email.Trim());
                    var qTok = Uri.EscapeDataString(devToken);
                    await Shell.Current.GoToAsync($"resetPassword?email={qEmail}&token={qTok}");
                }
            }
        }
        finally
        {
            IsBusy = false;
        }
    }
}
