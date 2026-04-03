using System.Net;
using Amazon;
using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VinhKhanh.Domain.Interfaces;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// Sends transactional email via Amazon SES (<c>SendEmail</c> API).
/// Enable with <c>Email:Provider=ses</c> in configuration.
///
/// Required: <c>Email:SesFromAddress</c> — verified identity in SES (sandbox: also verify recipient or exit sandbox).
/// Region: <c>Email:SesRegion</c> or fallback <c>FileStorage:S3Region</c>.
/// Credentials: <c>Email:AwsAccessKey</c> / <c>Email:AwsSecretKey</c>, or <c>FileStorage:Aws*</c>, or env / IAM role.
/// </summary>
public sealed class SesEmailSender : IEmailSender
{
    private readonly IAmazonSimpleEmailService _ses;
    private readonly string _fromAddress;
    private readonly ILogger<SesEmailSender> _logger;

    public SesEmailSender(IConfiguration config, ILogger<SesEmailSender> logger)
    {
        _logger = logger;

        _fromAddress = config["Email:SesFromAddress"]?.Trim()
            ?? throw new InvalidOperationException("Email:SesFromAddress is required when Email:Provider is ses.");

        var regionName = config["Email:SesRegion"]?.Trim()
            ?? config["FileStorage:S3Region"]?.Trim()
            ?? "ap-southeast-1";
        var endpoint = RegionEndpoint.GetBySystemName(regionName);

        var accessKey = config["Email:AwsAccessKey"]
            ?? config["FileStorage:AwsAccessKey"]
            ?? Environment.GetEnvironmentVariable("AWS_ACCESS_KEY_ID");
        var secretKey = config["Email:AwsSecretKey"]
            ?? config["FileStorage:AwsSecretKey"]
            ?? Environment.GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY");

        _ses = (!string.IsNullOrWhiteSpace(accessKey) && !string.IsNullOrWhiteSpace(secretKey))
            ? new AmazonSimpleEmailServiceClient(accessKey, secretKey, endpoint)
            : new AmazonSimpleEmailServiceClient(endpoint);

        _logger.LogInformation("SesEmailSender initialized: region={Region}", regionName);
    }

    public async Task<bool> TrySendPasswordResetAsync(
        string toEmail,
        string resetLinkOrAbsoluteUrl,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
            return false;

        var safeHref = WebUtility.HtmlEncode(resetLinkOrAbsoluteUrl);
        var subject = "Reset your Vinh Khanh Food Tour password";
        var textBody =
            "Use this link to reset your password (valid for a limited time):\n\n" +
            resetLinkOrAbsoluteUrl +
            "\n\nIf you did not request this, you can ignore this email.";

        var htmlBody =
            "<p>Use the link below to reset your password:</p>" +
            $"<p><a href=\"{safeHref}\">Reset password</a></p>" +
            "<p>If you did not request this, you can ignore this email.</p>";

        try
        {
            var request = new SendEmailRequest
            {
                Source = _fromAddress,
                Destination = new Destination(new List<string> { toEmail.Trim() }),
                Message = new Message(
                    new Content(subject),
                    new Body
                    {
                        Text = new Content(textBody),
                        Html = new Content(htmlBody)
                    })
            };

            await _ses.SendEmailAsync(request, cancellationToken).ConfigureAwait(false);
            _logger.LogInformation("SES password reset email sent (to={Recipient})", MaskEmail(toEmail));
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SES password reset send failed (to={Recipient})", MaskEmail(toEmail));
            return false;
        }
    }

    private static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 0) return "***";
        return email[0] + "***" + email[at..];
    }
}
