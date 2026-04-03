/**
 * AudioPreview Component
 *
 * Renders an inline HTML5 audio player for a single narration file.
 * Used on the POI detail and audio management pages so admins can
 * preview narrations without leaving the page.
 *
 * Props:
 *   audioId   {number}  — AudioNarration ID. The stream URL is built from this.
 *   label     {string}  — Optional label shown above the player (e.g. language name).
 *   voiceType {string}  — "Recorded" or "TTS" — shown as a badge.
 *
 * The stream URL points to GET /api/v1/audio/{id}/stream which returns
 * either a direct audio stream (local storage) or redirects to an S3
 * presigned URL (production).
 */

import './AudioPreview.css'
import { API_BASE } from '../../api.js'

// Fallback if API_BASE is not exported — derive from env
const BASE = API_BASE ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5015/api/v1'

export default function AudioPreview({ audioId, label, voiceType, duration }) {
    if (!audioId) return null

    const streamUrl = `${BASE}/audio/${audioId}/stream`

    return (
        <div className="audio-preview">
            {/* Header row */}
            <div className="audio-preview-header">
                {label && <span className="audio-preview-label">{label}</span>}
                <span className={`audio-preview-badge ${voiceType === 'TTS' ? 'badge-tts' : 'badge-recorded'}`}>
                    {voiceType === 'TTS' ? '🤖 TTS' : '🎙 Recorded'}
                </span>
                {duration > 0 && (
                    <span className="audio-preview-duration">
                        {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
                    </span>
                )}
            </div>

            {/* Native HTML5 audio player */}
            <audio
                className="audio-preview-player"
                controls
                preload="metadata"
                src={streamUrl}
                aria-label={`Audio narration preview${label ? ': ' + label : ''}`}
            >
                Your browser does not support the audio element.
            </audio>
        </div>
    )
}
