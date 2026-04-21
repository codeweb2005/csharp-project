import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = `${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? ''}/hubs/monitor`;

/**
 * Connects to the TourMonitorHub SignalR hub and returns event handlers.
 *
 * @param {object} handlers
 * @param {function} handlers.onEnter   - Called when a tourist enters a POI
 * @param {function} handlers.onExit    - Called when a tourist exits a POI
 * @param {function} handlers.onMove    - Called on GPS location update
 * @param {object}   options
 * @param {boolean}  options.enabled    - Whether to establish the connection (default true)
 */
export function useMonitorHub({ onEnter, onExit, onMove } = {}, { enabled = true } = {}) {
  const connRef = useRef(null);

  const connect = useCallback(async () => {
    if (connRef.current) return;

    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token ?? '',
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.ServerSentEvents |
                   signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('TouristEnteredPOI',     msg => onEnter?.(msg));
    connection.on('TouristExitedPOI',      msg => onExit?.(msg));
    connection.on('TouristLocationUpdate', msg => onMove?.(msg));

    connection.onreconnecting(() =>
      console.info('[MonitorHub] Reconnecting…'));
    connection.onreconnected(() => {
      console.info('[MonitorHub] Reconnected.');
      connection.invoke('JoinMonitorGroup').catch(console.error);
    });
    connection.onclose(err =>
      err && console.error('[MonitorHub] Connection closed:', err));

    try {
      await connection.start();
      await connection.invoke('JoinMonitorGroup');
      connRef.current = connection;
      console.info('[MonitorHub] Connected and joined Admins group.');
    } catch (err) {
      console.error('[MonitorHub] Failed to connect:', err);
    }
  }, [onEnter, onExit, onMove]);

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      connRef.current?.stop();
      connRef.current = null;
    };
  }, [enabled, connect]);

  return { connection: connRef };
}
