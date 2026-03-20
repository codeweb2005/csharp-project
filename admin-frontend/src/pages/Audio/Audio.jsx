import { useState } from 'react'
import { Upload, Play, Pause, Trash2, Download, Star, Mic, Bot, Volume2, Plus } from 'lucide-react'
import './Audio.css'

const poiOptions = [
  { id: 1, name: 'Ốc Đào Vĩnh Khánh' },
  { id: 2, name: 'Ốc Bà Hiền' },
  { id: 6, name: 'Bún Riêu Cô Ba' },
  { id: 9, name: 'Chè Bà Tư' },
]

const audioFiles = [
  { id: 1, poi: 'Ốc Đào', lang: '🇻🇳', langName: 'Tiếng Việt', file: 'oc-dao-recorded.mp3', type: 'Recorded', duration: 45, size: '2.3 MB', isDefault: true, active: true },
  { id: 2, poi: 'Ốc Đào', lang: '🇻🇳', langName: 'Tiếng Việt', file: 'oc-dao-tts.mp3', type: 'TTS', duration: 42, size: '1.8 MB', isDefault: false, active: true },
  { id: 3, poi: 'Ốc Đào', lang: '🇬🇧', langName: 'English', file: 'oc-dao-en.mp3', type: 'TTS', duration: 48, size: '2.0 MB', isDefault: true, active: true },
  { id: 4, poi: 'Bà Hiền', lang: '🇻🇳', langName: 'Tiếng Việt', file: 'ba-hien-recorded.mp3', type: 'Recorded', duration: 38, size: '1.9 MB', isDefault: true, active: true },
  { id: 5, poi: 'Bà Hiền', lang: '🇬🇧', langName: 'English', file: 'ba-hien-en.mp3', type: 'TTS', duration: 40, size: '1.7 MB', isDefault: true, active: true },
  { id: 6, poi: 'Bún Riêu Cô Ba', lang: '🇻🇳', langName: 'Tiếng Việt', file: 'bun-rieu-recorded.mp3', type: 'Recorded', duration: 42, size: '2.1 MB', isDefault: true, active: true },
  { id: 7, poi: 'Bún Riêu Cô Ba', lang: '🇬🇧', langName: 'English', file: 'bun-rieu-en.mp3', type: 'TTS', duration: 50, size: '2.4 MB', isDefault: true, active: true },
  { id: 8, poi: 'Chè Bà Tư', lang: '🇻🇳', langName: 'Tiếng Việt', file: 'che-ba-tu-recorded.mp3', type: 'Recorded', duration: 35, size: '1.6 MB', isDefault: true, active: true },
  { id: 9, poi: 'Chè Bà Tư', lang: '🇬🇧', langName: 'English', file: 'che-ba-tu-en.mp3', type: 'TTS', duration: 36, size: '1.5 MB', isDefault: true, active: true },
]

const images = [
  { id: 1, name: 'oc-dao-front.jpg', size: '245 KB', primary: true },
  { id: 2, name: 'oc-dao-food-1.jpg', size: '312 KB', primary: false },
  { id: 3, name: 'oc-dao-food-2.jpg', size: '189 KB', primary: false },
  { id: 4, name: 'oc-dao-inside.jpg', size: '275 KB', primary: false },
]

function formatDuration(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Audio() {
  const [selectedPOI, setSelectedPOI] = useState(1)
  const [playingId, setPlayingId] = useState(null)
  const [showTTS, setShowTTS] = useState(false)
  const [filterLang, setFilterLang] = useState('all')

  const filtered = audioFiles.filter(a => {
    if (filterLang !== 'all' && a.langName !== filterLang) return false
    return true
  })

  return (
    <div className="audio-page animate-fadeIn">
      {/* Toolbar */}
      <div className="audio-toolbar">
        <select className="poi-filter-select" value={selectedPOI} onChange={e => setSelectedPOI(+e.target.value)}>
          {poiOptions.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select className="poi-filter-select" value={filterLang} onChange={e => setFilterLang(e.target.value)}>
          <option value="all">Tất cả ngôn ngữ</option>
          <option value="Tiếng Việt">🇻🇳 Tiếng Việt</option>
          <option value="English">🇬🇧 English</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={() => setShowTTS(false)}>
          <Upload size={16} /> Upload Audio
        </button>
        <button className="btn btn-primary" onClick={() => setShowTTS(true)}>
          <Bot size={16} /> Tạo TTS
        </button>
      </div>

      <div className="audio-layout">
        {/* Main Content */}
        <div className="audio-main">
          {/* Images Section */}
          <div className="card">
            <div className="card-title">🖼️ Hình ảnh — Ốc Đào Vĩnh Khánh</div>
            <div className="img-grid">
              {images.map(img => (
                <div key={img.id} className={`img-thumb ${img.primary ? 'primary' : ''}`}>
                  <div className="img-placeholder">
                    <span>📷</span>
                  </div>
                  {img.primary && <span className="img-star">⭐</span>}
                  <div className="img-info">
                    <span className="img-name">{img.name}</span>
                    <span className="img-size">{img.size}</span>
                  </div>
                  <button className="img-delete"><Trash2 size={12} /></button>
                </div>
              ))}
              <div className="img-upload-zone">
                <Upload size={24} />
                <span>Kéo thả hoặc click</span>
                <span className="img-upload-hint">JPG, PNG, WebP — Max 5MB</span>
              </div>
            </div>
          </div>

          {/* Audio Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 20px 0' }}>
              <div className="card-title">🔊 Audio Thuyết minh</div>
            </div>
            <table className="audio-table">
              <thead>
                <tr>
                  <th>Ngôn ngữ</th>
                  <th>File</th>
                  <th>Loại</th>
                  <th>Thời lượng</th>
                  <th>Dung lượng</th>
                  <th>Mặc định</th>
                  <th>Nghe</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="audio-lang">
                        <span className="audio-flag">{a.lang}</span>
                        <span>{a.langName}</span>
                      </div>
                    </td>
                    <td className="audio-filename">{a.file}</td>
                    <td>
                      <span className={`badge ${a.type === 'Recorded' ? 'badge-success' : 'badge-primary'}`}>
                        {a.type === 'Recorded' ? <Mic size={11} /> : <Bot size={11} />}
                        {a.type}
                      </span>
                    </td>
                    <td className="audio-dur">{formatDuration(a.duration)}</td>
                    <td className="audio-size">{a.size}</td>
                    <td>
                      <input type="radio" name={`default-${a.lang}`} defaultChecked={a.isDefault} className="audio-radio" />
                    </td>
                    <td>
                      <button
                        className={`audio-play-btn ${playingId === a.id ? 'playing' : ''}`}
                        onClick={() => setPlayingId(playingId === a.id ? null : a.id)}
                      >
                        {playingId === a.id ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      {playingId === a.id && (
                        <div className="audio-waveform">
                          {Array.from({ length: 20 }).map((_, i) => (
                            <div
                              key={i}
                              className="wave-bar"
                              style={{
                                height: `${Math.random() * 16 + 4}px`,
                                animationDelay: `${i * 0.05}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="audio-actions">
                        <button className="btn-ghost" title="Tải về"><Download size={14} /></button>
                        <button className="btn-ghost btn-ghost-danger" title="Xóa"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TTS Panel */}
        {showTTS && (
          <div className="tts-panel card animate-slideIn">
            <div className="tts-header">
              <h3>🤖 Tạo TTS tự động</h3>
              <button className="btn-ghost" onClick={() => setShowTTS(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Ngôn ngữ</label>
              <select className="form-input">
                <option>🇻🇳 Tiếng Việt</option>
                <option>🇬🇧 English</option>
                <option>🇨🇳 中文</option>
                <option>🇯🇵 日本語</option>
                <option>🇰🇷 한국어</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Giọng đọc</label>
              <select className="form-input">
                <option>vi-VN-HoaiMyNeural (Nữ)</option>
                <option>vi-VN-NamMinhNeural (Nam)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Văn bản thuyết minh</label>
              <textarea
                className="form-input tts-textarea"
                rows={6}
                defaultValue="Chào mừng bạn đến với Ốc Đào, một trong những quán ốc lâu đời nhất tại phố ẩm thực Vĩnh Khánh..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tốc độ đọc</label>
              <div className="tts-speed">
                <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="tts-slider" />
                <span className="tts-speed-val">1.0x</span>
              </div>
            </div>

            <div className="tts-actions">
              <button className="btn btn-secondary w-full">
                <Play size={16} /> Nghe thử
              </button>
              <button className="btn btn-primary w-full">
                <Volume2 size={16} /> Tạo & Lưu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
