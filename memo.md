# 基金分析助手 - 修改记录 (2026-05-20)

## 问题描述
前端查询基金时显示的名称、净值、涨跌幅是硬编码的假数据，不是从天天基金网获取的真实数据。

## 修复内容

### 1. 后端 `backend/app/main.py`
- **移除硬编码数据**：删除 `FALLBACK_FUNDS` 字典中的假数据
- **修复基金查询逻辑**：
  - 使用天天基金网估值接口 `https://fundgz.1234567.com.cn/js/{code}.js`
  - 修复 JSON 解析条件：`content.count('{') > 1` 改为 `content.find('{') != -1`
  - 支持 utf-8 编码解决中文乱码
- **数据源**：
  - 优先使用实时估值接口（返回 name、dwjz、gszzl）
  - 备用使用历史净值 API

### 2. 前端 `frontend/src/App.tsx`
- 新增基金查询输入框和按钮
- 新增基金数据显示区域（名称、净值、涨跌幅）
- 新增"AI 分析"按钮，调用后端 LLM 接口

### 3. 配置 `frontend/vite.config.ts`
- 修复代理端口：`8001` → `8000`

## 测试验证
- 后端 API 测试：`python test_backend.py`
- 输入基金代码 `161725` 返回真实数据：
  ```json
  {"code":"161725","name":"招商中证白酒指数(LOF)A","nav":0.5813,"change":0.41,"source":"天天基金网(实时估值)"}
  ```

## Git 提交
```bash
git add backend/app/main.py frontend/src/App.tsx frontend/vite.config.ts
git commit -m "fix: 修复基金查询功能，从天天基金网获取真实数据"
git push

---

# 基金分析助手 - 修改记录 (2026-05-25)

## 问题
memo.md 所述修复并未真正生效，运行时仍显示硬编码假数据。

## 根因
`frontend/index.html` 是一个独立的自包含 HTML 页面，内含硬编码的 mock 基金数据（`mockFundData`），且**未引用 React 应用**（缺少 `<script type="module" src="/src/main.tsx">`），导致 `src/App.tsx` 从未被加载，用户查询时始终走 mock 数据分支。

## 修复内容

### 1. 前端 `frontend/index.html`
- 重写为 Vite React 入口点：添加 `<div id="root">` 和 `<script type="module" src="/src/main.tsx">`
- **删除**所有内联 CSS 样式
- **删除**所有内联 JavaScript（含后端检测、基金查询、AI 分析等逻辑）
- **删除** `mockFundData` 硬编码字典和所有 mock 回退逻辑

### 2. 配置 `frontend/vite.config.ts`
- 修复代理端口：`8000` → `8001`（因本机 8000 端口被 Java 进程占用）

---

# 基金分析助手 - 修改记录 (2026-05-25 v2)

## 修改内容

### 1. 前端 `frontend/src/App.tsx`
- **移动"配置 API"按钮**：从底部卡片移到 header 右上角，只显示一个按钮
- **改为弹窗模式**：点击按钮弹出模态对话框，包含 API Key 输入框、保存/取消按钮
- **状态指示灯**：header 按钮左侧添加圆点指示灯（绿色=已配置，黄色=未配置）
- **删除底部配置卡片**：移除整个 "LLM API 配置" 区域

---

# 基金分析助手 - 修改记录 (2026-05-25 v3)

## 修改内容

### 前端 `frontend/src/App.tsx`

1. **饼图布局优化**：
   - 容器宽 `280→300px`，高 `280→340px`，加 `overflow: visible` 防止标签被裁剪
   - `cy` 从 `50%→55%`，`outerRadius` 从 `100→90`，为上方标签留空间
   - 标签字号设为 `11px`，与图例一致

2. **图例优化**：
   - 从 PieChart 中移出，独立渲染在饼图下方
   - 两列排列（`gridTemplateColumns: '1fr 1fr'`），每列 5 项
   - 字号 `11px`（缩小约 30%）
   - 整体居中对齐

3. **左右布局**：
   - 饼图与右侧持仓列表各占 50%（`flex: 1`）
   - 左右容器等高，图例底部与表格底部对齐

---

# 基金分析助手 - 修改记录 (2026-05-25 v4)

## 问题
AI 分析请求失败时，前端报 JSON 解析错误（`Unexpected token...`），用户体验差。

## 修复内容

### 1. 后端 `backend/app/main.py`
- 为 `/api/llm/chat` 添加全局 try-catch 异常处理
- 分类处理超时（504）、连接失败（502）、LLM 返回错误（502）等场景
- 所有错误均返回 JSON 格式，避免后端崩溃返回 HTML 导致前端 JSON 解析失败

### 2. 前端 `frontend/src/App.tsx`
- `analyzeWithAI` 函数：`res.json()` 失败时自动回退到 `res.text()` 获取原始错误信息
- 避免 "Unexpected token" 类 JSON 解析错误暴露给用户

---

# 基金分析助手 - 修改记录 (2026-05-26)

## 1. 持仓股票添加当日涨跌幅列

### 后端 `backend/app/main.py`
- `POST /api/fund/holdings` 新增批量查询股票实时行情
- 使用 `push2.eastmoney.com/api/qt/ulist.np/get` 接口
- 股票代码前缀规则：`6xxxxx` → `1.`，其余 → `0.`
- 返回字段 `change`（涨跌幅百分比），获取失败时为 `null`

### 前端 `frontend/src/App.tsx`
- `Holding` 接口新增 `change: number | null`
- 持仓表格新增"涨跌幅"列
- 颜色规则：红色涨、绿色跌（A股惯例）

## 2. 最大回撤排行（横向柱状图）

### 后端 `backend/app/main.py`
- 新增 `POST /api/fund/drawdowns`
- 爬取 `fund.eastmoney.com/pingzhongdata/{code}.js` 获取全部历史累计净值
- 计算成立以来每次超过 5% 的回撤事件
- 回撤周期定义：从峰值到下一次创新高为一个完整周期
- `endDate` 为最低点日期（非恢复日期）
- 返回字段：`startDate`, `endDate`, `maxDrawdown`, `duration` 等

### 前端 `frontend/src/App.tsx`
- 新增 `Drawdown`/`DrawdownsData` 接口
- 持仓板块下新增"最大回撤"区域
- 使用 recharts `BarChart` + `layout="vertical"` 渲染横向柱状图
- Y 轴标签显示时间区间（如 `2021-06-07~2026-05-25`）

## 3. AI 分析提示词优化

### 前端 `frontend/src/App.tsx`
- AI 分析时自动带入持仓股票名称、代码、占比、当日涨跌幅
- 指示模型"结合当前 A 股市场的主流热点和板块轮动趋势"进行分析
- 输出限制 300 字以内

## 4. 错误处理与稳定性优化

### 后端 `backend/app/main.py`
- 添加全局 `@app.exception_handler(Exception)`，所有错误返回 JSON
- `httpx.ConnectError` → 502 + 中文提示
- `httpx.TimeoutException` → 504 + 中文提示
- 未知异常 → 500 + `"服务内部错误: ..."`
- 所有 httpx 客户端添加 `follow_redirects=True`（东方财富部分 API 会 302 跳转）
- 超时从 10s 调整为 15s

### 前端 `frontend/src/App.tsx`
- `queryFund`、`fetchHoldings`、`fetchDrawdowns` 全部改用 `res.text()` + `JSON.parse()` 模式
- 非 JSON 响应直接抛出原文作为错误信息，避免 "Unexpected token" 类错误