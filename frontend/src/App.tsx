import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

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

interface Holding {
  rank: number
  stockCode: string
  stockName: string
  percent: number
  change: number | null
}

interface HoldingsData {
  code: string
  reportDate: string
  holdings: Holding[]
}

interface Drawdown {
  startDate: string
  endDate: string
  peakDate: string
  troughDate: string
  maxDrawdown: number
  duration: number
}

interface DrawdownsData {
  code: string
  drawdowns: Drawdown[]
}

const COLORS = ['#FFD700', '#FFA500', '#FF6B6B', '#52C41A', '#1890FF', '#722ED1', '#EB2F96', '#13C2C2', '#FA8C16', '#2F54EB']

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

  const [holdingsData, setHoldingsData] = useState<HoldingsData | null>(null)
  const [holdingsLoading, setHoldingsLoading] = useState(false)
  const [holdingsError, setHoldingsError] = useState('')

  const [drawdownsData, setDrawdownsData] = useState<DrawdownsData | null>(null)
  const [_drawdownsLoading, setDrawdownsLoading] = useState(false)
  const [_drawdownsError, setDrawdownsError] = useState('')

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
    } catch (e) {
      setConfigStatus(null)
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
    setHoldingsData(null)
    setHoldingsError('')
    setDrawdownsData(null)
    setDrawdownsError('')
    try {
      const res = await fetch('/api/fund/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fundCode.trim() })
      })
      const body = await res.text()
      let data
      try { data = JSON.parse(body) } catch { throw new Error(body || `请求失败 (${res.status})`) }
      if (res.ok) {
        setFundData(data)
        fetchHoldings(fundCode.trim())
        fetchDrawdowns(fundCode.trim())
      } else {
        setFundError(data.detail || '查询失败')
      }
    } catch (e: any) {
      setFundError(`网络错误: ${e.message}`)
    }
    setFundLoading(false)
  }

  const fetchHoldings = async (code: string) => {
    setHoldingsLoading(true)
    setHoldingsError('')
    try {
      const res = await fetch('/api/fund/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const body = await res.text()
      let data
      try { data = JSON.parse(body) } catch { throw new Error(body || `请求失败 (${res.status})`) }
      if (res.ok) {
        setHoldingsData(data)
      } else {
        setHoldingsError(data.detail || '获取持仓失败')
      }
    } catch (e: any) {
      setHoldingsError(`网络错误: ${e.message}`)
    }
    setHoldingsLoading(false)
  }

  const fetchDrawdowns = async (code: string) => {
    setDrawdownsLoading(true)
    setDrawdownsError('')
    try {
      const res = await fetch('/api/fund/drawdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const body = await res.text()
      let data
      try { data = JSON.parse(body) } catch { throw new Error(body || `请求失败 (${res.status})`) }
      if (res.ok) {
        setDrawdownsData(data)
      } else {
        setDrawdownsError(data.detail || '获取回撤数据失败')
      }
    } catch (e: any) {
      setDrawdownsError(`网络错误: ${e.message}`)
    }
    setDrawdownsLoading(false)
  }

  const analyzeWithAI = async () => {
    if (!fundData) return
    setAiLoading(true)
    setAiError('')
    setAiAnalysis('')
    try {
      let holdingsText = ''
      if (holdingsData?.holdings) {
        holdingsText = '\n持仓股票：\n' + holdingsData.holdings.map(h =>
          `  ${h.stockName}(${h.stockCode}) 占比${h.percent}%${h.change !== null ? ` 今日涨跌${h.change >= 0 ? '+' : ''}${h.change}%` : ''}`
        ).join('\n')
      }
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `请分析基金 ${fundData.name}(${fundData.code})，当前净值: ${fundData.nav}，涨跌幅: ${fundData.change}%。${holdingsText}\n\n请结合当前A股市场的主流热点和板块轮动趋势，从持仓结构角度评价该基金的投资价值，给出简要建议（300字以内）。`
        })
      })
      const body = await res.text()
      let data
      try {
        data = JSON.parse(body)
      } catch {
        throw new Error(body || `请求失败 (${res.status})`)
      }
      if (res.ok) {
        setAiAnalysis(data.response || '未收到有效回复')
      } else {
        setAiError(data.detail || `分析失败 (${res.status})`)
      }
    } catch (e: any) {
      setAiError(e.message || 'AI 分析请求失败')
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>基金分析助手</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: configStatus?.configured ? '#52C41A' : '#FFA500',
          }} />
          <button
            onClick={() => { setError(''); setShowConfig(true); }}
            style={{
              backgroundColor: '#000000',
              color: DarkYellowStyle.colors.primary,
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            配置 API
          </button>
        </div>
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
                    color: fundData.change >= 0 ? DarkYellowStyle.colors.error : DarkYellowStyle.colors.success,
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

          {holdingsLoading && (
            <div style={{ padding: '12px', color: DarkYellowStyle.colors.textLight, fontSize: '14px' }}>
              加载持仓数据...
            </div>
          )}

          {holdingsError && (
            <div style={{
              padding: '12px', backgroundColor: '#3d2020', borderRadius: '4px',
              marginBottom: '20px', color: DarkYellowStyle.colors.error, fontSize: '14px',
            }}>
              {holdingsError}
            </div>
          )}

          {holdingsData && holdingsData.holdings.length > 0 && (
            <div style={{
              backgroundColor: DarkYellowStyle.colors.inputBg,
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ margin: '0 0 4px 0', color: DarkYellowStyle.colors.primary, fontSize: '16px' }}>
                前十大持仓股票
              </h3>
              <div style={{ fontSize: '12px', color: DarkYellowStyle.colors.textLight, marginBottom: '16px' }}>
                报告日期: {holdingsData.reportDate}
              </div>

              <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={holdingsData.holdings}
                          dataKey="percent"
                          nameKey="stockName"
                          cx="50%"
                          cy="55%"
                          outerRadius={90}
                          label={({ stockName, percent, cx, cy, midAngle = 0, outerRadius }: any) => {
                            const RADIAN = Math.PI / 180
                            const radius = outerRadius + 30
                            const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN)
                            const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN)
                            return (
                              <text x={x} y={y} fontSize={11} fill={DarkYellowStyle.colors.textLight} textAnchor={x > (cx as number) ? 'start' : 'end'}>
                                {stockName} {percent}%
                              </text>
                            )
                          }}
                          labelLine
                        >
                          {holdingsData.holdings.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `${value}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ul style={{
                    listStyle: 'none', margin: 0, padding: 0,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '2px 24px',
                    fontSize: '11px',
                    paddingTop: '12px',
                  }}>
                    {holdingsData.holdings.map((h, idx) => (
                      <li key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        color: DarkYellowStyle.colors.textLight,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        <span style={{
                          display: 'inline-block',
                          width: 8, height: 8,
                          borderRadius: '50%',
                          backgroundColor: COLORS[idx % COLORS.length],
                          flexShrink: 0,
                        }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {h.stockName}
                        </span>
                        <span style={{ color: DarkYellowStyle.colors.primary, flexShrink: 0 }}>
                          {h.percent}%
                        </span>
                      </li>
                    ))}
                  </ul>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${DarkYellowStyle.colors.border}` }}>
                        <th style={{ textAlign: 'left', padding: '8px 4px', color: DarkYellowStyle.colors.textLight }}>排名</th>
                        <th style={{ textAlign: 'left', padding: '8px 4px', color: DarkYellowStyle.colors.textLight }}>股票名称</th>
                        <th style={{ textAlign: 'right', padding: '8px 4px', color: DarkYellowStyle.colors.textLight }}>占比</th>
                        <th style={{ textAlign: 'right', padding: '8px 4px', color: DarkYellowStyle.colors.textLight }}>涨跌幅</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdingsData.holdings.map((h) => (
                        <tr key={h.rank} style={{ borderBottom: `1px solid ${DarkYellowStyle.colors.border}` }}>
                          <td style={{ padding: '8px 4px', color: DarkYellowStyle.colors.textLight }}>{h.rank}</td>
                          <td style={{ padding: '8px 4px', color: DarkYellowStyle.colors.text }}>
                            {h.stockName}
                            <span style={{ color: DarkYellowStyle.colors.textLight, marginLeft: '6px', fontSize: '12px' }}>
                              {h.stockCode}
                            </span>
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', color: DarkYellowStyle.colors.primary, fontWeight: 500 }}>
                            {h.percent}%
                          </td>
                          <td style={{
                            padding: '8px 4px', textAlign: 'right', fontWeight: 500,
                            color: h.change !== null ? (h.change >= 0 ? DarkYellowStyle.colors.error : DarkYellowStyle.colors.success) : DarkYellowStyle.colors.textLight,
                          }}>
                            {h.change !== null ? `${h.change >= 0 ? '+' : ''}${h.change}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {drawdownsData && drawdownsData.drawdowns.length > 0 && (
            <div style={{
              backgroundColor: DarkYellowStyle.colors.inputBg,
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ margin: '0 0 4px 0', color: DarkYellowStyle.colors.primary, fontSize: '16px' }}>
                最大回撤
              </h3>
              <div style={{ fontSize: '12px', color: DarkYellowStyle.colors.textLight, marginBottom: '16px' }}>
                成立以来超过5%的回撤记录（共{drawdownsData.drawdowns.length}次）
              </div>
              <div style={{ width: '100%', height: Math.max(200, drawdownsData.drawdowns.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={drawdownsData.drawdowns.map(d => ({
                      ...d,
                      label: `${d.startDate}~${d.endDate === d.troughDate ? d.troughDate : d.endDate}`,
                      absDrawdown: Math.abs(d.maxDrawdown),
                    })).reverse()}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
                  >
                    <XAxis type="number" domain={[0, 'auto']} tick={{ fill: DarkYellowStyle.colors.textLight, fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="label" width={80} tick={{ fill: DarkYellowStyle.colors.textLight, fontSize: 10 }} />
                    <Tooltip
                      formatter={(_: any, __: any, props: any) => {
                        const d = props.payload
                        return [`${d.maxDrawdown}%`, `回撤`]
                      }}
                      labelFormatter={() => ''}
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444', fontSize: 12 }}
                    />
                    <Bar dataKey="absDrawdown" fill="#FF6B6B" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
              <div style={{ color: DarkYellowStyle.colors.text, fontSize: '14px', lineHeight: 1.8 }}>
                {aiAnalysis.split('\n').filter(l => l.trim()).map((line, i) => (
                  <p key={i} style={{ margin: '0 0 8px 0' }}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {showConfig && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
          }} onClick={() => setShowConfig(false)}>
            <div style={{
              backgroundColor: DarkYellowStyle.colors.cardBg,
              borderRadius: '8px',
              padding: '30px',
              width: '420px',
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px 0', color: DarkYellowStyle.colors.primary, fontSize: '18px', fontWeight: 500 }}>
                配置 LLM API Key
              </h2>
              <label style={{ display: 'block', marginBottom: '8px', color: DarkYellowStyle.colors.text, fontSize: '14px' }}>
                硅基流动 API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-xxxx..."
                autoFocus
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
                onKeyDown={e => e.key === 'Enter' && saveConfig()}
              />
              {error && (
                <div style={{ padding: '10px 0', color: DarkYellowStyle.colors.error, fontSize: '13px' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => setShowConfig(false)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    color: DarkYellowStyle.colors.textLight,
                    border: `1px solid ${DarkYellowStyle.colors.border}`,
                    padding: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={saveConfig}
                  disabled={loading}
                  style={{
                    flex: 1,
                    backgroundColor: DarkYellowStyle.colors.primary,
                    color: '#000000',
                    border: 'none',
                    padding: '12px',
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
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App