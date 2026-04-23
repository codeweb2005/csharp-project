import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMonitorHub } from '../../hooks/useMonitorHub';
import { presence } from '../../api';
import { Users, MapPin, Store, Wifi, WifiOff, RefreshCw } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const VINH_KHANH_CENTER  = [10.7538, 106.6932];
const SNAPSHOT_INTERVAL_MS = 10_000;

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color, bg }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #EEEEEE',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flex: 1,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} color={color}/>
      </div>
      <div>
        <div style={{
          fontSize: 26, fontWeight: 800, color: '#1A1A1A',
          fontFamily: "'Manrope', sans-serif", lineHeight: 1,
        }}>{value}</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ─── POI Presence List ────────────────────────────────────────────────────────
function PoiPresenceList({ perPOI }) {
  if (!perPOI?.length) return (
    <div style={{ color: '#CCC', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>
      Chưa có du khách tại POI nào.
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {perPOI.map(p => (
        <div key={p.poiId} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#FAFAFA', border: '1px solid #EEEEEE',
          borderRadius: 8, padding: '8px 12px',
        }}>
          <span style={{ color: '#444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} color="#C92127"/> {p.poiName || `POI #${p.poiId}`}
          </span>
          <span style={{
            background: '#C92127', color: '#fff', borderRadius: 20,
            padding: '2px 10px', fontWeight: 700, fontSize: 12,
          }}>{p.count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Live Event Log ─────────────────────────────────────────────────────────
function LiveEventLog({ events }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events]);

  if (!events.length) return (
    <div style={{ color: '#CCC', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
      Đang chờ sự kiện...
    </div>
  );

  const colorMap = { enter: '#16a34a', exit: '#D97706', move: '#2563EB' };
  const labelMap = { enter: 'Vào', exit: 'Ra', move: 'Di chuyển' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {events.map((ev, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '6px 0',
          borderBottom: i < events.length - 1 ? '1px solid #F5F5F5' : 'none',
        }}>
          {/* Color dot */}
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: colorMap[ev.eventType] || '#999',
            flexShrink: 0, marginTop: 5,
          }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#333', lineHeight: 1.4 }}>
              <span style={{
                fontWeight: 600,
                color: colorMap[ev.eventType] || '#666',
              }}>{labelMap[ev.eventType] || ev.eventType}</span>
              {ev.poiName ? <span style={{ color: '#555' }}> · {ev.poiName}</span> : ''}
            </div>
            <div style={{ fontSize: 10, color: '#BBB', marginTop: 1 }}>
              {new Date(ev.timestamp).toLocaleTimeString('vi-VN')}
              {ev.sessionId ? ` · ${String(ev.sessionId).slice(0, 8)}` : ''}
            </div>
          </div>
        </div>
      ))}
      <div ref={endRef}/>
    </div>
  );
}

// ─── Tourist Markers ─────────────────────────────────────────────────────────
function TouristMarkers({ positions }) {
  return positions
    .filter(p => p.latitude && p.longitude)
    .map((p, i) => (
      <CircleMarker
        key={i}
        center={[p.latitude, p.longitude]}
        radius={p.poiId ? 10 : 7}
        pathOptions={{
          fillColor:    p.poiId ? '#C92127' : '#E05B1A',
          fillOpacity:  0.75,
          color:        '#FFF',
          weight:       2,
        }}
      >
        <Popup>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <strong>{p.sessionId}</strong><br/>
            {p.poiName ? `📍 ${p.poiName}` : '🚶 Đang di chuyển'}<br/>
            <span style={{ color: '#999' }}>{new Date(p.updatedAt).toLocaleTimeString('vi-VN')}</span>
          </div>
        </Popup>
      </CircleMarker>
    ));
}

// ─── Main Page ────────────────────────────────────────────────────────────────
/**
 * Live Tour Monitor
 * - SignalR WebSocket: onEnter / onExit / onMove events
 * - REST fallback: snapshot polling every 10s
 * - Leaflet map: CircleMarker per tourist position
 * - Stats: total tourists, at-POI count, active POIs
 */
export default function LiveMonitorPage() {
  const [snapshot,   setSnapshot]   = useState(null);
  const [events,     setEvents]     = useState([]);
  const [connected,  setConnected]  = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // ── REST snapshot ──────────────────────────────────────────────────────────
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await presence.getSnapshot();
      if (res?.success) { setSnapshot(res.data); setLastUpdate(new Date()); }
    } catch (err) {
      console.error('[Monitor] Snapshot error:', err);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
    const timer = setInterval(fetchSnapshot, SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchSnapshot]);

  // ── SignalR ────────────────────────────────────────────────────────────────
  const pushEvent = useCallback((ev) => {
    setEvents(prev => [...prev.slice(-49), ev]);
    fetchSnapshot();
  }, [fetchSnapshot]);

  const handleEnter = useCallback(msg => { setConnected(true); pushEvent({ ...msg, eventType: 'enter' }); }, [pushEvent]);
  const handleExit  = useCallback(msg => pushEvent({ ...msg, eventType: 'exit' }),  [pushEvent]);
  const handleMove  = useCallback(msg => pushEvent({ ...msg, eventType: 'move' }),  [pushEvent]);
  const handleWebVisitorUpdate = useCallback(() => {
    setConnected(true);
    fetchSnapshot();
  }, [fetchSnapshot]);

  useMonitorHub({
    onEnter: handleEnter,
    onExit: handleExit,
    onMove: handleMove,
    onWebVisitorUpdate: handleWebVisitorUpdate,
  });

  // ── Derived values ─────────────────────────────────────────────────────────
  const activeTourists = snapshot?.totalOnlineVisitors ?? snapshot?.activeTourists ?? 0;
  const perPOI         = snapshot?.perPOI ?? [];
  const positions      = snapshot?.positions ?? [];
  const touristsAtPOI  = positions.filter(p => p.poiId).length;

  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid #EEEEEE',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeInUp 0.3s ease-out' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 18,
            color: '#1A1A1A', letterSpacing: '-0.02em',
          }}>Live Tour Monitor</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Realtime — Phố ẩm thực Vĩnh Khánh, Q.4
          </div>
        </div>

        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: '#999',
            }}>
              <RefreshCw size={11}/>
              {lastUpdate.toLocaleTimeString('vi-VN')}
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: connected ? 'rgba(22,163,74,0.08)' : 'rgba(217,119,6,0.08)',
            border: `1px solid ${connected ? 'rgba(22,163,74,0.2)' : 'rgba(217,119,6,0.2)'}`,
            borderRadius: 20, padding: '5px 12px',
          }}>
            {connected
              ? <Wifi size={13} color="#16a34a"/>
              : <WifiOff size={13} color="#D97706"/>
            }
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: connected ? '#16a34a' : '#D97706',
            }}>
              {connected ? 'SignalR' : 'Polling'}
            </span>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connected ? '#16a34a' : '#D97706',
              boxShadow: connected ? '0 0 6px rgba(22,163,74,0.5)' : 'none',
              animation: connected ? 'livePulse 2s infinite' : 'none',
            }}/>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'flex', gap: 12 }}>
        <StatCard icon={Users}  value={activeTourists} label="Du khách online" color="#C92127" bg="rgba(201,33,39,0.08)"/>
        <StatCard icon={MapPin} value={touristsAtPOI}  label="Đang tại điểm"  color="#E05B1A" bg="rgba(224,91,26,0.08)"/>
        <StatCard icon={Store}  value={perPOI.length}  label="POI có người"   color="#2563EB" bg="rgba(37,99,235,0.08)"/>
      </div>

      {/* ── Map + Sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>

        {/* Leaflet Map */}
        <div style={{
          ...cardStyle, padding: 0, overflow: 'hidden', height: 460,
        }}>
          <MapContainer
            key="vinh-khanh-monitor-map"
            center={VINH_KHANH_CENTER}
            zoom={17}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            {/* Light OSM tiles */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            <TouristMarkers positions={positions}/>
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* POI Presence */}
          <div style={cardStyle}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: '#555',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Store size={13} color="#C92127"/> Du khách theo POI
            </div>
            <PoiPresenceList perPOI={perPOI}/>
          </div>

          {/* Event Log */}
          <div style={{ ...cardStyle, flex: 1 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: '#555',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C92127' }}/>
              Sự kiện gần đây
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <LiveEventLog events={events}/>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
