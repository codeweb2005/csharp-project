import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Form, Input, Button, Checkbox, Typography, message } from 'antd'
import { MailOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useAuth } from '../../context/AuthContext'
import './Login.css'

const { Title, Text } = Typography

export default function Login() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const { login, user, loading: authLoading } = useAuth()

    // Redirect to dashboard immediately if already authenticated
    if (!authLoading && user) {
        return <Navigate to="/dashboard" replace />
    }

    const onFinish = async (values) => {
        setLoading(true)
        setError('')
        try {
            const res = await login(values.email, values.password)
            if (res.success) {
                navigate('/dashboard')
            } else {
                setError(res.error?.message || 'Sai email hoặc mật khẩu')
                message.error(res.error?.message || 'Sai email hoặc mật khẩu')
            }
        } catch (err) {
            setError(err?.error?.message || 'Không thể kết nối server. Hãy kiểm tra backend đang chạy.')
            message.error(err?.error?.message || 'Không thể kết nối server. Hãy kiểm tra backend đang chạy.')
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

                    <Form
                        name="login"
                        layout="vertical"
                        initialValues={{
                            email: 'admin@vinhkhanh.app',
                            password: 'Admin@123',
                            remember: true,
                        }}
                        onFinish={onFinish}
                        size="large"
                        className="login-form-antd"
                    >
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, message: 'Vui lòng nhập email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}
                        >
                            <Input prefix={<MailOutlined className="site-form-item-icon" />} placeholder="admin@vinhkhanh.app" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label={<div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Mật khẩu</span> <a href="#">Quên mật khẩu?</a></div>}
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined className="site-form-item-icon" />}
                                placeholder="••••••••"
                            />
                        </Form.Item>

                        <Form.Item name="remember" valuePropName="checked">
                            <Checkbox>Nhớ đăng nhập</Checkbox>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="login-btn-antd" loading={loading} block icon={<ArrowRightOutlined />}>
                                Đăng nhập
                            </Button>
                        </Form.Item>
                    </Form>

                    <p className="login-footer">
                        © 2026 VK Food Tour — Phố Ẩm Thực Vĩnh Khánh
                    </p>
                </div>
            </div>
        </div>
    )
}
