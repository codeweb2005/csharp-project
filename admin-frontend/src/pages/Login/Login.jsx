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
                setError(res.error?.message || 'Invalid email or password')
                message.error(res.error?.message || 'Invalid email or password')
            }
        } catch (err) {
            setError(err?.error?.message || 'Cannot connect to server. Please check if the backend is running.')
            message.error(err?.error?.message || 'Cannot connect to server. Please check if the backend is running.')
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
                    <div className="login-hero-badge">🍜 Food Street</div>
                    <h1 className="login-hero-title">Vinh Khanh</h1>
                    <p className="login-hero-desc">
                        Multilingual automated narration system
                        <br />for Saigon's most famous food street
                    </p>
                    <div className="login-hero-stats">
                        <div className="login-hero-stat">
                            <span className="login-hero-stat-value">10+</span>
                            <span className="login-hero-stat-label">Locations</span>
                        </div>
                        <div className="login-hero-stat">
                            <span className="login-hero-stat-value">5</span>
                            <span className="login-hero-stat-label">Languages</span>
                        </div>
                        <div className="login-hero-stat">
                            <span className="login-hero-stat-value">1K+</span>
                            <span className="login-hero-stat-label">Visits</span>
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
                    <p className="login-form-subtitle">Admin Login</p>

                    <Form
                        name="login"
                        layout="vertical"
                        initialValues={{
                            remember: true,
                        }}
                        onFinish={onFinish}
                        size="large"
                        className="login-form-antd"
                    >
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, message: 'Please input your email!' }, { type: 'email', message: 'Invalid email format!' }]}
                        >
                            <Input prefix={<MailOutlined className="site-form-item-icon" />} placeholder="Enter your email" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label={<div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Password</span> <a href="#">Forgot password?</a></div>}
                            rules={[{ required: true, message: 'Please input your password!' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined className="site-form-item-icon" />}
                                placeholder="••••••••"
                            />
                        </Form.Item>

                        <Form.Item name="remember" valuePropName="checked">
                            <Checkbox>Remember me</Checkbox>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="login-btn-antd" loading={loading} block icon={<ArrowRightOutlined />}>
                                Login
                            </Button>
                        </Form.Item>
                    </Form>

                    <p className="login-footer">
                        © 2026 VK Food Tour — Vinh Khanh Food Street
                    </p>
                </div>
            </div>
        </div>
    )
}
