from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os
import re

app = FastAPI()

API_KEY_FILE = "api_key.txt"

FALLBACK_FUNDS = {
    '161039': {'name': '中证500指数增强A', 'nav': 1.8234, 'change': 0.87},
    '000001': {'name': '上证指数', 'nav': 3420.55, 'change': -0.32},
    '110011': {'name': '易方达消费行业股票', 'nav': 3.2456, 'change': 1.23},
    '161725': {'name': '招商中证白酒指数', 'nav': 0.9876, 'change': -0.56},
}


class LLMConfig(BaseModel):
    api_key: str


class LLMRequest(BaseModel):
    prompt: str


class FundQuery(BaseModel):
    code: str


@app.post("/api/llm/config")
async def set_llm_config(config: LLMConfig):
    with open(API_KEY_FILE, "w", encoding="utf-8") as f:
        f.write(config.api_key)
    return {"status": "ok", "message": "API Key 已保存"}


@app.get("/api/llm/config")
async def get_llm_config():
    if os.path.exists(API_KEY_FILE):
        with open(API_KEY_FILE, "r", encoding="utf-8") as f:
            api_key = f.read().strip()
        return {"configured": bool(api_key), "api_key": api_key[:8] + "****" if api_key else ""}
    return {"configured": False}


@app.post("/api/llm/chat")
async def chat(request: LLMRequest):
    if not os.path.exists(API_KEY_FILE):
        raise HTTPException(status_code=400, detail="请先配置 LLM API Key")

    with open(API_KEY_FILE, "r", encoding="utf-8") as f:
        api_key = f.read().strip()

    if not api_key:
        raise HTTPException(status_code=400, detail="API Key 为空，请重新配置")

    url = "https://api.siliconflow.cn/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "Qwen/Qwen3-8B",
        "messages": [{"role": "user", "content": request.prompt}],
        "max_tokens": 1024,
        "temperature": 0.7
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=60.0)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        result = response.json()
        return {"response": result["choices"][0]["message"]["content"]}


@app.post("/api/fund/query")
async def query_fund(query: FundQuery):
    code = query.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="请输入基金代码")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://fund.eastmoney.com/'
    }

    async with httpx.AsyncClient() as client:
        try:
            fund_url = f"https://fund.eastmoney.com/pingzhongdata/{code}.js"
            response = await client.get(fund_url, headers=headers, timeout=10.0)

            if response.status_code == 200:
                js_content = response.text

                name_match = re.search(r'fbrg\.name\s*=\s*"([^"]+)"', js_content)
                nav_match = re.search(r'fbrg\.dwjz\s*=\s*([0-9.]+)', js_content)
                change_match = re.search(r'fbrg\.jjgs\s*=\s*([-+]?[0-9.]+)', js_content)

                if name_match and nav_match:
                    fund_data = {
                        'name': name_match.group(1),
                        'nav': float(nav_match.group(1)),
                        'change': float(change_match.group(1)) if change_match else 0.0,
                        'code': code,
                        'source': '天天基金网'
                    }
                    return fund_data
        except Exception as e:
            print(f"爬取失败: {e}")

    if code in FALLBACK_FUNDS:
        data = FALLBACK_FUNDS[code].copy()
        data['code'] = code
        data['source'] = '备用数据'
        return data

    raise HTTPException(status_code=404, detail=f"未找到基金代码: {code}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)