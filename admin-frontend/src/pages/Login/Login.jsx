import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [email, setEmail] = useState('admin@vinhkhanh.app')
    const [password, setPassword] = useState('Admin@123')
    const navigate = useNavigate()
    const { login } = useAuth()

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
        <div className="flex min-h-screen">
            {/* Left Hero */}
            <div className="flex-1 bg-gradient-to-br from-slate-900 via-blue-900/60 to-slate-900 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.1)_0%,transparent_40%)]" />
                <div className="relative z-10 text-white p-15 max-w-[500px]">
                    <div className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 rounded-full text-sm mb-5 backdrop-blur-sm">🍜 Phố Ẩm Thực</div>
                    <h1 className="text-5xl font-extrabold leading-[1.1] bg-gradient-to-br from-white to-blue-300 bg-clip-text text-transparent mb-4">Vĩnh Khánh</h1>
                    <p className="text-base text-slate-400 leading-relaxed mb-10">
                        Hệ thống thuyết minh tự động đa ngôn ngữ
                        <br />cho phố ẩm thực nổi tiếng nhất Sài Gòn
                    </p>
                    <div className="flex gap-8">
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-primary-light">10+</span>
                            <span className="text-xs text-slate-500 mt-0.5">Điểm ăn uống</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-primary-light">5</span>
                            <span className="text-xs text-slate-500 mt-0.5">Ngôn ngữ</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-primary-light">1K+</span>
                            <span className="text-xs text-slate-500 mt-0.5">Lượt ghé</span>
                        </div>
                    </div>
                </div>
                {/* Floating food emojis */}
                <div className="absolute top-[15%] right-[20%] text-4xl opacity-15 animate-float z-[1]">🦪</div>
                <div className="absolute bottom-[20%] left-[15%] text-4xl opacity-15 animate-float z-[1]" style={{animationDelay:'1.5s'}}>🍻</div>
                <div className="absolute top-[60%] right-[10%] text-4xl opacity-15 animate-float z-[1]" style={{animationDelay:'3s'}}>🍰</div>
                <div className="absolute bottom-[10%] right-[35%] text-4xl opacity-15 animate-float z-[1]" style={{animationDelay:'4.5s'}}>🧋</div>
            </div>

            {/* Right Form */}
            <div className="w-[480px] flex items-center justify-center p-12 bg-white">
                <div className="w-full max-w-[360px]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-violet-600 rounded-xl flex items-center justify-center text-2xl">🍜</div>
                        <h2 className="text-2xl font-bold text-text-dark">VK Food Tour</h2>
                    </div>
                    <p className="text-text-muted text-[0.9rem] mb-8">Đăng nhập hệ thống quản trị</p>

                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm mb-2 animate-fade-in">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-1.5">
                            <label className="flex justify-between text-sm font-medium text-text-muted">Email</label>
                            <div className="flex items-center gap-2.5 px-4 py-3 border-[1.5px] border-border-light rounded-xl transition-all text-text-muted bg-slate-50 focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] focus-within:bg-white">
                                <Mail size={16} />
                                <input
                                    type="email"
                                    placeholder="admin@vinhkhanh.app"
                                    className="flex-1 border-none bg-transparent text-[0.93rem] text-text-dark outline-none"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="flex justify-between text-sm font-medium text-text-muted">
                                Mật khẩu
                                <a href="#" className="text-xs text-primary font-normal hover:underline">Quên mật khẩu?</a>
                            </label>
                            <div className="flex items-center gap-2.5 px-4 py-3 border-[1.5px] border-border-light rounded-xl transition-all text-text-muted bg-slate-50 focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] focus-within:bg-white">
                                <Lock size={16} />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="flex-1 border-none bg-transparent text-[0.93rem] text-text-dark outline-none"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button type="button" className="text-text-muted hover:text-text-dark p-0.5" onClick={() => setShowPw(!showPw)}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                            <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
                            <span>Nhớ đăng nhập</span>
                        </label>

                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-br from-primary to-indigo-600 text-white rounded-xl text-base font-semibold mt-1 transition-all hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_8px_24px_rgba(59,130,246,0.35)] disabled:opacity-85 disabled:cursor-wait"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5.5 h-5.5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Đăng nhập
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-[0.72rem] text-text-muted mt-12">
                        © 2026 VK Food Tour — Phố Ẩm Thực Vĩnh Khánh
                    </p>
                </div>
            </div>
        </div>
    )
}
