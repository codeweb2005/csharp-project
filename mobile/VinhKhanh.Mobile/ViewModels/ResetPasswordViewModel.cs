using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VinhKhanh.Mobile.Services;

namespace VinhKhanh.Mobile.ViewModels;

[QueryProperty(nameof(Email), "email")]
[QueryProperty(nameof(Token), "token")]
public partial class ResetPasswordViewModel : ObservableObject
{
    private readonly ApiClient _api;

    [ObservableProperty] private string _email = string.Empty;
    [ObservableProperty] private string _token = string.Empty;
    [ObservableProperty] private string _newPassword = string.Empty;
    [ObservableProperty] private string _confirmPassword = string.Empty;
    [ObservableProperty] private string _errorMessage = string.Empty;
    [ObservableProperty] private string _infoMessage = string.Empty;
    [ObservableProperty] private bool _isBusy;

    public ResetPasswordViewModel(ApiClient api) => _api = api;

    [RelayCommand]
    private async Task SubmitAsync()
    {
        if (IsBusy) return;
        ErrorMessage = InfoMessage = string.Empty;

        if (string.IsNullOrWhiteSpace(Email))
        {
            ErrorMessage = "Email is required.";
            return;
        }

        if (string.IsNullOrWhiteSpace(Token))
        {
            ErrorMessage = "Reset code is required.";
            return;
        }

        if (string.IsNullOrWhiteSpace(NewPassword) || NewPassword.Length < 8)
        {
            ErrorMessage = "Password must be at least 8 characters.";
            return;
        }

        if (NewPassword != ConfirmPassword)
        {
            ErrorMessage = "Passwords do not match.";
            return;
        }

        IsBusy = true;
        try
        {
            var (ok, err) = await _api.ResetPasswordAsync(
                Email.Trim(), Token.Trim(), NewPassword);
            if (!ok)
            {
                ErrorMessage = err ?? "Reset failed.";
                return;
            }

            InfoMessage = "Password updated. You can sign in.";
            await Task.Delay(600);
            await Shell.Current.GoToAsync("..");
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
