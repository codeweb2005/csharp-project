import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './Login.css'

export default function Login() {
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [email, setEmail] = useState('admin@vinhkhanh.app')
    const [password, setPassword] = useState('Admin@123')
    const navigate = useNavigate()
    const { login, user, loading: authLoading } = useAuth()

    // Redirect to dashboard immediately if already authenticated
    if (!authLoading && user) {
        return <Navigate to="/dashboard" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await login(email, password)
            if (res.success) {
                navigate('/dashboard')
            } else {
                setError(res.error?.message || 'Sai email hoặc mật khẩu')
            }
        } catch (err) {
            setError(err?.error?.message || 'Không thể kết nối server. Hãy kiểm tra backend đang chạy.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            {/* Left Hero */}
            <div className="login-hero">
                <div className="login-hero-overlay" />
                <div className="login-hero-content">
                    <div className="login-hero-badge">🍜 Phố Ẩm Thực</div>
                    <h1 className="login-hero-title">Vĩnh Khánh</h1>
                    <p className="login-hero-desc">
                        Hệ thống thuyết minh tự động đa ngôn ngữ
                        <br />cho phố ẩm thực nổi tiếng nhất Sài Gòn
                    </p>
                    <div className="login-hero-stats">
                        <div className="login-hero-stat">
                            <span className="login-hero-stat-value">10+</span>
                            <span className="login-hero-stat-label">Điểm ăn uống</span>
                        </div>
                        <div className="login-hero-stat">
                            <span className="login-hero-stat-value">5</span>
                            <span className="login-hero-stat-label">Ngôn ngữ</span>
                        </div>
                        <div className="login-hero-stat">
                            <span className="login-hero-stat-value">1K+</span>
                            <span className="login-hero-stat-label">Lượt ghé</span>
                        </div>
                    </div>
                </div>
                {/* Floating food emojis */}
                <div className="login-float login-float-1">🦪</div>
                <div className="login-float login-float-2">🍻</div>
                <div className="login-float login-float-3">🍰</div>
                <div className="login-float login-float-4">🧋</div>
            </div>

            {/* Right Form */}
            <div className="login-form-side">
                <div className="login-form-container">
                    <div className="login-brand">
                        <div className="login-brand-icon">🍜</div>
                        <h2 className="login-brand-title">VK Food Tour</h2>
                    </div>
                    <p className="login-form-subtitle">Đăng nhập hệ thống quản trị</p>

                    {error && (
                        <div className="login-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="login-field">
                            <label className="login-label">Email</label>
                            <div className="login-input-wrap">
                                <Mail size={16} />
                                <input
                                    type="email"
                                    placeholder="admin@vinhkhanh.app"
                                    className="login-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="login-field">
                            <label className="login-label">
                                Mật khẩu
                                <a href="#" className="login-forgot">Quên mật khẩu?</a>
                            </label>
                            <div className="login-input-wrap">
                                <Lock size={16} />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="login-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button type="button" className="login-eye" onClick={() => setShowPw(!showPw)}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <label className="login-remember">
                            <input type="checkbox" defaultChecked />
                            <span>Nhớ đăng nhập</span>
                        </label>

                        <button type="submit" className={`login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                            {loading ? (
                                <div className="login-spinner" />
                            ) : (
                                <>
                                    Đăng nhập
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="login-footer">
                        © 2026 VK Food Tour — Phố Ẩm Thực Vĩnh Khánh
                    </p>
                </div>
            </div>
        </div>
    )
}
