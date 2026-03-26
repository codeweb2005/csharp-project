/**
 * POIForm — Create / Edit Modal for Points of Interest
 *
 * Features:
 *   - OpenStreetMap coordinate picker (MapPicker + Leaflet.js) with geofence circle
 *   - Full CRUD fields: name, category, address, phone, hours, price range
 *   - Priority field for geofence conflict resolution
 *   - Multilingual translations tab (VI / EN)
 *   - Audio preview player for existing narrations (AudioPreview component)
 *   - Submits to POST /pois or PUT /pois/:id via api.js
 *
 * Props:
 *   poi      {object|null}  — POI object when editing; null when creating
 *   onClose  {function}     — called when modal should close
 *   onSaved  {function}     — called after successful save (to refresh parent list)
 *   categories {array}     — list of category objects from the API
 */

import { useState, useEffect } from 'react'
import { X, MapPin, Save, Globe } from 'lucide-react'
import MapPicker from '../MapPicker/MapPicker.jsx'
import AudioPreview from '../AudioPreview/AudioPreview.jsx'
import { pois } from '../../api.js'
import './POIForm.css'

// Language tabs supported in the form
const LANGUAGES = [
    { id: 1, code: 'vi', label: '🇻🇳 Vietnamese', flag: '🇻🇳' },
    { id: 2, code: 'en', label: '🇬🇧 English', flag: '🇬🇧' },
]

const DEFAULT_FORM = {
    categoryId: '',
    address: '',
    phone: '',
    website: '',
    latitude: '',
    longitude: '',
    geofenceRadius: 25,
    priority: 0,
    priceRangeMin: '',
    priceRangeMax: '',
    openingHours: '',
    vendorUserId: '',
    isFeatured: false,
    translations: LANGUAGES.map(l => ({
        languageId: l.id,
        name: '',
        shortDescription: '',
        fullDescription: '',
        narrationText: '',
        highlights: [],
    })),
}

export default function POIForm({ poi, onClose, onSaved, categories = [] }) {
    const isEdit = Boolean(poi?.id)

    // ── Form state ─────────────────────────────────────────────────────
    const [form, setForm] = useState(() => {
        if (!poi) return { ...DEFAULT_FORM }

        // Pre-fill from POI object when editing
        return {
            categoryId: poi.categoryId ?? '',
            address: poi.address ?? '',
            phone: poi.phone ?? '',
            website: poi.website ?? '',
            latitude: poi.latitude ?? '',
            longitude: poi.longitude ?? '',
            geofenceRadius: poi.geofenceRadius ?? 25,
            priority: poi.priority ?? 0,
            priceRangeMin: poi.priceRangeMin ?? '',
            priceRangeMax: poi.priceRangeMax ?? '',
            openingHours: poi.openingHours ?? '',
            vendorUserId: poi.vendorUserId ?? '',
            isFeatured: poi.isFeatured ?? false,
            translations: LANGUAGES.map(l => {
                const existing = poi.translations?.find(t => t.languageId === l.id)
                return {
                    languageId: l.id,
                    name: existing?.name ?? '',
                    shortDescription: existing?.shortDescription ?? '',
                    fullDescription: existing?.fullDescription ?? '',
                    narrationText: existing?.narrationText ?? '',
                    highlights: existing?.highlights ?? [],
                }
            }),
        }
    })

    const [activeLang, setActiveLang] = useState(0)   // index into LANGUAGES
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    // ── Handlers ───────────────────────────────────────────────────────

    /** Update a top-level form field */
    function setField(key, value) {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    /** Update a field within a specific language translation */
    function setTranslation(langIndex, key, value) {
        setForm(prev => {
            const translations = [...prev.translations]
            translations[langIndex] = { ...translations[langIndex], [key]: value }
            return { ...prev, translations }
        })
    }

    /** Called by MapPicker when user clicks/drags the marker */
    function handleLocationChange({ lat, lng }) {
        setForm(prev => ({ ...prev, latitude: lat, longitude: lng }))
    }

    /** Submit to API */
    async function handleSubmit(e) {
        e.preventDefault()
        setError(null)

        // Basic validation
        const viTrans = form.translations[0]
        if (!viTrans.name.trim()) {
            setError('Vietnamese name is required.')
            return
        }
        if (!form.latitude || !form.longitude) {
            setError('Please pick a location on the map.')
            return
        }
        if (!form.categoryId) {
            setError('Please select a category.')
            return
        }

        // Build payload (strip empty optional fields)
        const payload = {
            categoryId: Number(form.categoryId),
            address: form.address,
            phone: form.phone || null,
            website: form.website || null,
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
            geofenceRadius: Number(form.geofenceRadius),
            priority: Number(form.priority),
            priceRangeMin: form.priceRangeMin !== '' ? Number(form.priceRangeMin) : null,
            priceRangeMax: form.priceRangeMax !== '' ? Number(form.priceRangeMax) : null,
            openingHours: form.openingHours || null,
            vendorUserId: form.vendorUserId !== '' ? Number(form.vendorUserId) : null,
            isFeatured: form.isFeatured,
            translations: form.translations.filter(t => t.name.trim()),   // only send filled langs
        }

        try {
            setSaving(true)
            if (isEdit) {
                await pois.update(poi.id, payload)
            } else {
                await pois.create(payload)
            }
            onSaved()
        } catch (err) {
            setError(err?.error?.message ?? 'Failed to save POI. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    // Close on Escape key
    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div className="poi-form-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="poi-form-modal" role="dialog" aria-modal="true"
                aria-label={isEdit ? 'Edit POI' : 'Create new POI'}>

                {/* Header */}
                <div className="poi-form-header">
                    <div className="poi-form-title">
                        <MapPin size={20} />
                        <h2>{isEdit ? `Edit: ${poi.name}` : 'Add New POI'}</h2>
                    </div>
                    <button className="poi-form-close" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="poi-form-error" role="alert">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="poi-form-body">
                    <div className="poi-form-cols">

                        {/* ── Left column: Basic info ─────────────────── */}
                        <div className="poi-form-col">
                            <h3 className="poi-form-section-title">Basic Information</h3>

                            {/* Category */}
                            <label className="poi-form-label">
                                Category <span className="required">*</span>
                                <select
                                    className="poi-form-input"
                                    value={form.categoryId}
                                    onChange={e => setField('categoryId', e.target.value)}
                                    required
                                >
                                    <option value="">Select category…</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.icon} {c.translations?.[0]?.name ?? `Category ${c.id}`}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {/* Address */}
                            <label className="poi-form-label">
                                Address
                                <input
                                    className="poi-form-input"
                                    type="text"
                                    value={form.address}
                                    onChange={e => setField('address', e.target.value)}
                                    placeholder="e.g. 149 Vĩnh Khánh, P.10, Q.4"
                                />
                            </label>

                            {/* Phone / Website */}
                            <div className="poi-form-row">
                                <label className="poi-form-label">
                                    Phone
                                    <input
                                        className="poi-form-input"
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => setField('phone', e.target.value)}
                                        placeholder="028 xxxx xxxx"
                                    />
                                </label>
                                <label className="poi-form-label">
                                    Website
                                    <input
                                        className="poi-form-input"
                                        type="url"
                                        value={form.website}
                                        onChange={e => setField('website', e.target.value)}
                                        placeholder="https://..."
                                    />
                                </label>
                            </div>

                            {/* Price range */}
                            <div className="poi-form-row">
                                <label className="poi-form-label">
                                    Min price (₫)
                                    <input
                                        className="poi-form-input"
                                        type="number"
                                        min="0"
                                        value={form.priceRangeMin}
                                        onChange={e => setField('priceRangeMin', e.target.value)}
                                        placeholder="0"
                                    />
                                </label>
                                <label className="poi-form-label">
                                    Max price (₫)
                                    <input
                                        className="poi-form-input"
                                        type="number"
                                        min="0"
                                        value={form.priceRangeMax}
                                        onChange={e => setField('priceRangeMax', e.target.value)}
                                        placeholder="500000"
                                    />
                                </label>
                            </div>

                            {/* Opening hours */}
                            <label className="poi-form-label">
                                Opening Hours
                                <input
                                    className="poi-form-input"
                                    type="text"
                                    value={form.openingHours}
                                    onChange={e => setField('openingHours', e.target.value)}
                                    placeholder='e.g. {"mon-fri":"09:00-22:00"}'
                                />
                            </label>

                            {/* Geofence radius + Priority */}
                            <div className="poi-form-row">
                                <label className="poi-form-label">
                                    Geofence Radius (m)
                                    <input
                                        className="poi-form-input"
                                        type="number"
                                        min="10"
                                        max="500"
                                        value={form.geofenceRadius}
                                        onChange={e => setField('geofenceRadius', e.target.value)}
                                    />
                                </label>
                                <label className="poi-form-label">
                                    Priority
                                    <input
                                        className="poi-form-input"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={form.priority}
                                        onChange={e => setField('priority', e.target.value)}
                                        title="Higher = plays first when geofences overlap on mobile"
                                    />
                                </label>
                            </div>

                            {/* Featured toggle */}
                            <label className="poi-form-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={form.isFeatured}
                                    onChange={e => setField('isFeatured', e.target.checked)}
                                />
                                <span>⭐ Featured POI</span>
                            </label>
                        </div>

                        {/* ── Right column: Map picker ─────────────────── */}
                        <div className="poi-form-col">
                            <h3 className="poi-form-section-title">
                                Location <span className="required">*</span>
                            </h3>
                            <p className="poi-form-hint">
                                Click on the map to set the POI location.
                                The dashed circle shows the geofence radius.
                            </p>

                            {/* MapPicker — integrates OpenStreetMap via Leaflet.js */}
                            <MapPicker
                                lat={form.latitude}
                                lng={form.longitude}
                                radius={Number(form.geofenceRadius) || 25}
                                onLocationChange={handleLocationChange}
                            />
                        </div>
                    </div>

                    {/* ── Translations section ───────────────────── */}
                    <div className="poi-form-translations">
                        <div className="poi-form-section-title-row">
                            <Globe size={16} />
                            <h3 className="poi-form-section-title">Content &amp; Translations</h3>
                        </div>

                        {/* Language tabs */}
                        <div className="poi-form-lang-tabs">
                            {LANGUAGES.map((lang, idx) => (
                                <button
                                    key={lang.id}
                                    type="button"
                                    className={`poi-form-lang-tab ${idx === activeLang ? 'active' : ''}`}
                                    onClick={() => setActiveLang(idx)}
                                >
                                    {lang.flag} {lang.label}
                                </button>
                            ))}
                        </div>

                        {/* Active language form */}
                        {LANGUAGES.map((lang, idx) => (
                            <div
                                key={lang.id}
                                className="poi-form-lang-content"
                                style={{ display: idx === activeLang ? 'flex' : 'none' }}
                            >
                                <label className="poi-form-label">
                                    Name {idx === 0 && <span className="required">*</span>}
                                    <input
                                        className="poi-form-input"
                                        type="text"
                                        value={form.translations[idx].name}
                                        onChange={e => setTranslation(idx, 'name', e.target.value)}
                                        placeholder={`POI name in ${lang.label}`}
                                    />
                                </label>

                                <label className="poi-form-label">
                                    Short Description
                                    <input
                                        className="poi-form-input"
                                        type="text"
                                        value={form.translations[idx].shortDescription}
                                        onChange={e => setTranslation(idx, 'shortDescription', e.target.value)}
                                        placeholder="One-line summary shown in list view"
                                    />
                                </label>

                                <label className="poi-form-label">
                                    Full Description
                                    <textarea
                                        className="poi-form-input poi-form-textarea"
                                        rows={4}
                                        value={form.translations[idx].fullDescription}
                                        onChange={e => setTranslation(idx, 'fullDescription', e.target.value)}
                                        placeholder="Detailed description shown on detail page"
                                    />
                                </label>

                                <label className="poi-form-label">
                                    Narration Script
                                    <textarea
                                        className="poi-form-input poi-form-textarea"
                                        rows={4}
                                        value={form.translations[idx].narrationText}
                                        onChange={e => setTranslation(idx, 'narrationText', e.target.value)}
                                        placeholder="Text used for TTS audio generation. Written for spoken delivery."
                                    />
                                </label>

                                {/* Audio preview — only shown when editing an existing POI */}
                                {isEdit && poi.audio?.length > 0 && (() => {
                                    const narration = poi.audio.find(a => a.languageId === lang.id && a.isDefault)
                                        ?? poi.audio.find(a => a.languageId === lang.id)
                                    return narration ? (
                                        <div>
                                            <p className="poi-form-hint">Current narration audio:</p>
                                            <AudioPreview
                                                audioId={narration.id}
                                                label={`${lang.flag} ${lang.label}`}
                                                voiceType={narration.voiceType}
                                                duration={narration.duration}
                                            />
                                        </div>
                                    ) : null
                                })()}
                            </div>
                        ))}
                    </div>

                    {/* ── Actions ────────────────────────────────────── */}
                    <div className="poi-form-actions">
                        <button type="button" className="poi-form-btn poi-form-btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="poi-form-btn poi-form-btn-save" disabled={saving}>
                            <Save size={16} />
                            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create POI')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
