import { Save, RotateCcw, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import './Settings.css'

export default function Settings() {
    const [maintenance, setMaintenance] = useState(false)

    return (
        <div className="settings-page animate-fadeIn">
            {/* Geofence */}
            <div className="card settings-card">
                <h3 className="settings-card-title">📍 Cài đặt Geofence</h3>
                <div className="settings-grid">
                    <div className="form-group">
                        <label className="form-label">Bán kính mặc định (mét)</label>
                        <input className="form-input" type="number" defaultValue={30} />
                        <span className="form-hint">Phạm vi 10 – 500 mét</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tần suất cập nhật GPS (giây)</label>
                        <input className="form-input" type="number" defaultValue={5} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Độ chính xác GPS</label>
                        <select className="form-input">
                            <option>Cao (High)</option>
                            <option>Trung bình (Medium)</option>
                            <option>Thấp (Low)</option>
                        </select>
                    </div>
                </div>
                <div className="settings-info">
                    ℹ️ Bán kính nhỏ hơn sẽ kích hoạt chính xác hơn nhưng tốn pin thiết bị hơn
                </div>
            </div>

            {/* Narration */}
            <div className="card settings-card">
                <h3 className="settings-card-title">🔊 Cài đặt Thuyết minh</h3>
                <div className="settings-grid">
                    <div className="form-group">
                        <label className="form-label">Cooldown mặc định (phút)</label>
                        <input className="form-input" type="number" defaultValue={30} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Chế độ thuyết minh mặc định</label>
                        <select className="form-input">
                            <option>Tự động (Auto)</option>
                            <option>Chỉ file ghi âm (Recorded Only)</option>
                            <option>Chỉ TTS (TTS Only)</option>
                            <option>Chỉ văn bản (Text Only)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Giọng TTS tiếng Việt</label>
                        <select className="form-input">
                            <option>vi-VN-HoaiMyNeural (Nữ)</option>
                            <option>vi-VN-NamMinhNeural (Nam)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Giọng TTS tiếng Anh</label>
                        <select className="form-input">
                            <option>en-US-JennyNeural (Female)</option>
                            <option>en-US-GuyNeural (Male)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tốc độ đọc TTS</label>
                        <div className="settings-slider-wrap">
                            <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="settings-slider" />
                            <span className="settings-slider-value">1.0x</span>
                        </div>
                    </div>
                </div>
                <div className="settings-toggle-row">
                    <div>
                        <span className="settings-toggle-label">Tự động tạo TTS khi thêm POI</span>
                        <span className="settings-toggle-desc">Hệ thống sẽ tự động gọi Azure TTS API để tạo file audio</span>
                    </div>
                    <label className="switch">
                        <input type="checkbox" defaultChecked />
                        <span className="switch-slider" />
                    </label>
                </div>
            </div>

            {/* Sync */}
            <div className="card settings-card">
                <h3 className="settings-card-title">🔄 Cài đặt Đồng bộ</h3>
                <div className="settings-grid">
                    <div className="form-group">
                        <label className="form-label">Tần suất đồng bộ (phút)</label>
                        <input className="form-input" type="number" defaultValue={15} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Kích thước batch upload</label>
                        <input className="form-input" type="number" defaultValue={50} />
                        <span className="form-hint">Số records gửi mỗi lần sync</span>
                    </div>
                </div>
                <div className="settings-toggle-row">
                    <div>
                        <span className="settings-toggle-label">Nén dữ liệu khi đồng bộ</span>
                        <span className="settings-toggle-desc">Giảm dung lượng dữ liệu truyền tải</span>
                    </div>
                    <label className="switch">
                        <input type="checkbox" defaultChecked />
                        <span className="switch-slider" />
                    </label>
                </div>
                <div className="settings-toggle-row">
                    <div>
                        <span className="settings-toggle-label">Chỉ đồng bộ qua Wi-Fi</span>
                        <span className="settings-toggle-desc">Không sử dụng dữ liệu di động để sync</span>
                    </div>
                    <label className="switch">
                        <input type="checkbox" />
                        <span className="switch-slider" />
                    </label>
                </div>
            </div>

            {/* API */}
            <div className="card settings-card">
                <h3 className="settings-card-title">🔌 API & Tích hợp</h3>
                <div className="settings-grid">
                    <div className="form-group">
                        <label className="form-label">API Key</label>
                        <div className="settings-key-input">
                            <input className="form-input" defaultValue="vk_live_a1b2c3d4e5f6...xyz" readOnly style={{ flex: 1 }} />
                            <button className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Google Maps API Key</label>
                        <input className="form-input" type="password" defaultValue="AIzaSyB1234567890" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Azure TTS API Key</label>
                        <input className="form-input" type="password" defaultValue="abc123def456" />
                    </div>
                </div>
                <div className="settings-toggle-row settings-maintenance">
                    <div>
                        <span className="settings-toggle-label">
                            <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                            Chế độ bảo trì
                        </span>
                        <span className="settings-toggle-desc">Bật chế độ này sẽ tạm ngưng tất cả API cho mobile app</span>
                    </div>
                    <label className="switch">
                        <input type="checkbox" checked={maintenance} onChange={e => setMaintenance(e.target.checked)} />
                        <span className="switch-slider switch-danger" />
                    </label>
                </div>
                {maintenance && (
                    <div className="settings-warning">
                        ⚠️ Chế độ bảo trì đang BẬT — Tất cả API cho mobile app đã tạm ngưng!
                    </div>
                )}
            </div>

            {/* Save */}
            <div className="settings-actions">
                <button className="btn btn-primary btn-lg">
                    <Save size={18} /> Lưu thay đổi
                </button>
                <button className="btn btn-secondary">
                    <RotateCcw size={16} /> Đặt lại mặc định
                </button>
            </div>
        </div>
    )
}
