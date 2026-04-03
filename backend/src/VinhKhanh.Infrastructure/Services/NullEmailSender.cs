using VinhKhanh.Domain.Interfaces;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Default no-op email sender. Set <c>Email:Provider=ses</c> and configure SES to send password-reset mail.
/// </summary>
public sealed class NullEmailSender : IEmailSender
{
    public Task<bool> TrySendPasswordResetAsync(string toEmail, string resetLinkOrAbsoluteUrl, CancellationToken cancellationToken = default)
        => Task.FromResult(false);
}
