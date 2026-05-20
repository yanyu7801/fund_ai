# 项目技术栈

- **前端**: React + TypeScript
- **后端**: Python FastAPI
- **语言**: 中文

# 项目结构

```
/frontend          # React 前端 (Vite)
  src/
  package.json
  vite.config.ts
/backend           # Python 后端 (FastAPI)
  app/
  requirements.txt
  main.py
```

# 开发命令

## 前端
```bash
cd frontend
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run lint     # 代码检查
```

## 后端
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload   # 开发服务器
```

# 注意事项

1. **天天基金网爬虫**: 遵守 robots.txt，注意请求频率限制
2. **LLM API**: 环境变量存储 API Key，勿提交到版本控制
3. **前后端通信**: 后端默认 `http://localhost:8000`，前端配置代理或 CORS
4. **环境变量**: `.env` 文件不提交 Git