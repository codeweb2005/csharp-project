using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace VinhKhanh.Infrastructure.Services;

/// <summary>
/// SignalR Hub for the Admin Live Tour Monitor.
///
/// Connection protocol:
///   - Admin clients connect and call JoinMonitorGroup() to subscribe to presence events.
///   - Tourist clients do NOT connect to this hub directly — they call the REST API
///     (POST /presence/update), and PresenceService broadcasts on their behalf.
///
/// Events pushed to admin group "Admins":
///   - TouristEnteredPOI  { eventType, sessionId, poiId, poiName, lat, lng, timestamp }
///   - TouristExitedPOI   { eventType, sessionId, poiId, timestamp }
///   - TouristLocationUpdate { sessionId, lat, lng, poiId, timestamp }
///   - PresenceSnapshot   { activeTourists, perPOI, positions, snapshotAt }
///
/// Scale-out note:
///   Without a Redis backplane, this hub only works correctly with a single server instance.
///   To scale horizontally, add:
///     builder.Services.AddSignalR().AddStackExchangeRedis("redis-connection-string");
/// </summary>
[Authorize(Roles = "Admin")]
public class TourMonitorHub : Hub
{
    /// <summary>
    /// Called by admin client on connection to subscribe to presence events.
    /// Admin client JS: await connection.invoke("JoinMonitorGroup");
    /// </summary>
    public async Task JoinMonitorGroup()
        => await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");

    /// <summary>
    /// Called by admin client to unsubscribe (e.g. when navigating away from monitor page).
    /// </summary>
    public async Task LeaveMonitorGroup()
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, "Admins");

    public override Task OnDisconnectedAsync(Exception? exception)
        => base.OnDisconnectedAsync(exception);
}
