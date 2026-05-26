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