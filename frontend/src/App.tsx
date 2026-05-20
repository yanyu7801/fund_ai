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
    error: '#FF6B6B',
    inputBg: '#333333',
  }
}

interface FundData {
  code: string
  name: string
  nav: number
  change: number
  source: string
}

function App() {
  const [apiKey, setApiKey] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; api_key: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [fundCode, setFundCode] = useState('')
  const [fundData, setFundData] = useState<FundData | null>(null)
  const [fundLoading, setFundLoading] = useState(false)
  const [fundError, setFundError] = useState('')

  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

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

  const queryFund = async () => {
    if (!fundCode.trim()) {
      setFundError('请输入基金代码')
      return
    }
    setFundLoading(true)
    setFundError('')
    setFundData(null)
    setAiAnalysis('')
    try {
      const res = await fetch('/api/fund/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fundCode.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        setFundData(data)
      } else {
        setFundError(data.detail || '查询失败')
      }
    } catch (e: any) {
      setFundError(`网络错误: ${e.message}`)
    }
    setFundLoading(false)
  }

  const analyzeWithAI = async () => {
    if (!fundData) return
    setAiLoading(true)
    setAiError('')
    setAiAnalysis('')
    try {
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `请分析基金 ${fundData.name}(${fundData.code})，当前净值: ${fundData.nav}，涨跌幅: ${fundData.change}%。给出简要评价和建议。`
        })
      })
      const data = await res.json()
      if (res.ok) {
        setAiAnalysis(data.response || '未收到有效回复')
      } else {
        setAiError(data.detail || '分析失败')
      }
    } catch (e: any) {
      setAiError(`网络错误: ${e.message}`)
    }
    setAiLoading(false)
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

      <main style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: DarkYellowStyle.colors.cardBg,
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          marginBottom: '30px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ margin: 0, color: DarkYellowStyle.colors.primary, fontSize: '18px', fontWeight: 500 }}>
                基金查询
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input
              type="text"
              value={fundCode}
              onChange={e => setFundCode(e.target.value)}
              placeholder="输入基金代码，如 161725"
              onKeyDown={e => e.key === 'Enter' && queryFund()}
              style={{
                flex: 1,
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
              onClick={queryFund}
              disabled={fundLoading}
              style={{
                backgroundColor: DarkYellowStyle.colors.primary,
                color: '#000000',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '4px',
                cursor: fundLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: fundLoading ? 0.7 : 1,
              }}
            >
              {fundLoading ? '查询中...' : '查询'}
            </button>
          </div>

          {fundError && (
            <div style={{
              padding: '12px',
              backgroundColor: '#3d2020',
              borderRadius: '4px',
              marginBottom: '20px',
              color: DarkYellowStyle.colors.error,
              fontSize: '14px',
            }}>
              {fundError}
            </div>
          )}

          {fundData && (
            <div style={{
              backgroundColor: DarkYellowStyle.colors.inputBg,
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, color: DarkYellowStyle.colors.primary, fontSize: '16px' }}>
                    {fundData.name}
                  </h3>
                  <span style={{ color: DarkYellowStyle.colors.textLight, fontSize: '13px' }}>
                    代码: {fundData.code}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: DarkYellowStyle.colors.text }}>
                    {fundData.nav}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: fundData.change >= 0 ? DarkYellowStyle.colors.success : DarkYellowStyle.colors.error,
                  }}>
                    {fundData.change >= 0 ? '+' : ''}{fundData.change}%
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: DarkYellowStyle.colors.textLight }}>
                数据来源: {fundData.source}
              </div>
            </div>
          )}

          {fundData && (
            <button
              onClick={analyzeWithAI}
              disabled={aiLoading || !configStatus?.configured}
              style={{
                backgroundColor: DarkYellowStyle.colors.secondary,
                color: '#000000',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '4px',
                cursor: (aiLoading || !configStatus?.configured) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: (aiLoading || !configStatus?.configured) ? 0.7 : 1,
              }}
            >
              {aiLoading ? 'AI 分析中...' : 'AI 分析'}
            </button>
          )}

          {aiError && (
            <div style={{
              padding: '12px',
              backgroundColor: '#3d2020',
              borderRadius: '4px',
              marginTop: '16px',
              color: DarkYellowStyle.colors.error,
              fontSize: '14px',
            }}>
              {aiError}
            </div>
          )}

          {aiAnalysis && (
            <div style={{
              backgroundColor: DarkYellowStyle.colors.inputBg,
              borderRadius: '8px',
              padding: '20px',
              marginTop: '20px',
              border: `1px solid ${DarkYellowStyle.colors.border}`,
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: DarkYellowStyle.colors.primary, fontSize: '15px' }}>
                AI 分析结果
              </h4>
              <p style={{ margin: 0, color: DarkYellowStyle.colors.text, fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {aiAnalysis}
              </p>
            </div>
          )}
        </div>

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
              color: DarkYellowStyle.colors.error,
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