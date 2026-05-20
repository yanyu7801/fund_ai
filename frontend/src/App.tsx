import { useState, useEffect } from 'react'

const DarkYellowStyle = {
  colors: {
    background: '#1a1a1a',
    cardBg: '#2d2d2d',
    primary: '#FFD700',
    secondary: '#E6C200',
    accent: '#FFA500',
    text: '#F0F0F0',
    textLight: '#AAAAAA',
    border: '#444444',
    success: '#52C41A',
    inputBg: '#333333',
  }
}

function App() {
  const [apiKey, setApiKey] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; api_key: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkConfig()
    const interval = setInterval(checkConfig, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkConfig = async () => {
    try {
      const res = await fetch('/api/llm/config')
      const data = await res.json()
      setConfigStatus(data)
      setError('')
    } catch (e) {
      setError('无法连接到后端服务')
      console.error('API 连接失败:', e)
    }
  }

  const saveConfig = async () => {
    if (!apiKey) {
      setError('请输入 API Key')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey })
      })
      const data = await res.json()
      if (res.ok) {
        setApiKey('')
        setShowConfig(false)
        checkConfig()
      } else {
        setError(`保存失败: ${data.detail || res.statusText}`)
      }
    } catch (e: any) {
      setError(`网络错误: ${e.message || '请确保后端服务已在8000端口启动'}`)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: DarkYellowStyle.colors.background,
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      color: DarkYellowStyle.colors.text,
    }}>
      <header style={{
        backgroundColor: DarkYellowStyle.colors.primary,
        color: '#000000',
        padding: '20px 40px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>基金分析助手</h1>
      </header>

      <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: DarkYellowStyle.colors.cardBg,
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ margin: 0, color: DarkYellowStyle.colors.primary, fontSize: '18px', fontWeight: 500 }}>
                LLM API 配置
              </h2>
              <span style={{ fontSize: '12px', color: DarkYellowStyle.colors.textLight }}>
                后端: {configStatus !== null ? '✓ 已连接' : '✗ 未连接'}
              </span>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              style={{
                backgroundColor: DarkYellowStyle.colors.primary,
                color: '#000000',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {showConfig ? '隐藏配置' : '配置 API'}
            </button>
          </div>

          {showConfig && (
            <div style={{
              padding: '20px',
              backgroundColor: DarkYellowStyle.colors.inputBg,
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              <label style={{ display: 'block', marginBottom: '8px', color: DarkYellowStyle.colors.text, fontSize: '14px' }}>
                硅基流动 API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-xxxx..."
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  color: DarkYellowStyle.colors.text,
                  backgroundColor: DarkYellowStyle.colors.inputBg,
                  border: `1px solid ${DarkYellowStyle.colors.border}`,
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={saveConfig}
                disabled={loading}
                style={{
                  marginTop: '16px',
                  backgroundColor: DarkYellowStyle.colors.primary,
                  color: '#000000',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#3d2020',
              borderRadius: '4px',
              marginBottom: '20px',
              color: '#FF6B6B',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <div style={{
            padding: '20px',
            backgroundColor: configStatus?.configured ? '#1d3d1d' : '#3d3d20',
            borderRadius: '8px',
            border: `1px solid ${configStatus?.configured ? '#2d5a2d' : '#5a5a2d'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: configStatus?.configured ? DarkYellowStyle.colors.success : DarkYellowStyle.colors.accent,
              }} />
              <span style={{ color: DarkYellowStyle.colors.text, fontSize: '14px' }}>
                状态: {configStatus?.configured ? '已配置' : '未配置'}
              </span>
            </div>
            {configStatus?.configured && configStatus.api_key && (
              <p style={{ margin: '8px 0 0 18px', color: DarkYellowStyle.colors.textLight, fontSize: '13px' }}>
                API Key: {configStatus.api_key}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App