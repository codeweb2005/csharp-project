import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../context/AuthContext'

const floats = ['🦪','🍜','🧋','🍻','🍰','🥢']

export default function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login, user, loading: authLoading } = useAuth()

  if (!authLoading && user) return <Navigate to="/dashboard" replace/>

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await login(values.email, values.password)
      if (res.success) navigate('/dashboard')
      else message.error(res.error?.message || 'Invalid email or password')
    } catch (err) {
      message.error(err?.error?.message || 'Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#F8F8F8', fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── Left hero panel ── */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #C92127 0%, #A81B21 50%, #8D1519 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.07) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }}/>

        {/* Floating food emojis */}
        {floats.map((f, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: 22 + (i % 3) * 8,
            opacity: 0.15 + (i % 3) * 0.05,
            top: `${12 + i * 13}%`, left: `${8 + (i % 4) * 22}%`,
            animation: `fadeIn ${1.2 + i * 0.3}s ease-out`,
          }}>{f}</div>
        ))}

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 48px' }}>
          {/* Logo icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 24px',
          }}>🍜</div>

          <div style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 34,
            color: '#FFFFFF', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 14,
          }}>Vĩnh Khánh<br/>Food Tour</div>

          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 48, lineHeight: 1.7 }}>
            Multilingual automated narration<br/>for Saigon's most vibrant food street
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.15)',
            overflow: 'hidden',
          }}>
            {[['10+','Locations'],['5','Languages'],['1K+','Visits']].map(([v,l], i) => (
              <div key={i} style={{
                flex: 1, padding: '16px 0', textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none',
              }}>
                <div style={{
                  fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 22,
                  color: '#FFFFFF',
                }}>{v}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        width: 460, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 56px', background: '#FFFFFF',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          {/* Brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #C92127, #A81B21)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: '0 2px 8px rgba(201,33,39,0.3)',
            }}>🍜</div>
            <div>
              <div style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 16,
                color: '#1A1A1A', letterSpacing: '-0.02em',
              }}>VK Food Tour</div>
              <div style={{ fontSize: 11, color: '#999' }}>Admin Portal</div>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 22,
              color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: 6,
            }}>Welcome back</div>
            <div style={{ fontSize: 13, color: '#999' }}>Sign in to your admin account</div>
          </div>

          <Form name="login" layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="email"
              label="Email address"
              rules={[{ required: true, message: 'Email required' },{ type: 'email', message: 'Invalid email' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#CCC' }}/>}
                placeholder="admin@vinhkhanh.app"
                style={{ height: 44, borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password required' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#CCC' }}/>}
                placeholder="••••••••"
                style={{ height: 44, borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 46, fontSize: 14, fontWeight: 600,
                  background: 'linear-gradient(135deg, #C92127, #A81B21)',
                  border: 'none', borderRadius: 10,
                  boxShadow: '0 4px 14px rgba(201,33,39,0.4)',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In →'}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ marginTop: 32, fontSize: 11, color: '#CCC', textAlign: 'center' }}>
            © 2026 VK Food Tour — Vĩnh Khánh Food Street
          </div>
        </div>
      </div>
    </div>
  )
}
