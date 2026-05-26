from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
import os
import json
import sys
import re
import traceback

sys.stdout.reconfigure(encoding='utf-8')

app = FastAPI()


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(status_code=500, content={"detail": "Internal server error: " + repr(exc)[:200]})

API_KEY_FILE = "api_key.txt"


class LLMConfig(BaseModel):
    api_key: str


class LLMRequest(BaseModel):
    prompt: str


class FundQuery(BaseModel):
    code: str


class FundResponse(BaseModel):
    code: str
    name: str
    nav: float
    change: float
    source: str


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

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=60.0)
            if response.status_code != 200:
                detail = (response.text[:500] if response.text else f"status {response.status_code}")
                raise HTTPException(status_code=502, detail=f"LLM error: {detail}")
            result = response.json()
            return {"response": result["choices"][0]["message"]["content"]}
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="LLM API timeout, please retry")
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="Cannot connect to LLM API")
    except HTTPException:
        raise
    except Exception as e:
        err = repr(e)[:200]
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {err}")


@app.post("/api/fund/query")
async def query_fund(query: FundQuery):
    code = query.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="请输入基金代码")

    async with httpx.AsyncClient() as client:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://fund.eastmoney.com/',
            'Accept-Charset': 'utf-8'
        }

        gz_url = f"https://fundgz.1234567.com.cn/js/{code}.js"
        gz_response = await client.get(gz_url, headers=headers, timeout=10.0)

        if gz_response.status_code == 200:
            content = gz_response.text
            if 'jsonpgz' in content and content.find('{') != -1:
                start = content.find('({') + 1
                end = content.rfind('})') + 1
                if start > 0 and end > 0:
                    gz_data = json.loads(content[start:end])
                    result = {
                        'code': code,
                        'name': gz_data.get('name', code),
                        'nav': float(gz_data.get('dwjz', 0)),
                        'change': float(gz_data.get('gszzl', 0)),
                        'source': '天天基金网(实时估值)'
                    }
                    return JSONResponse(content=result, media_type="application/json; charset=utf-8")

        api_url = f"https://api.fund.eastmoney.com/f10/lsjz?fundCode={code}&pageIndex=1&pageSize=1"
        api_response = await client.get(api_url, headers=headers, timeout=10.0)

        if api_response.status_code == 200:
            data = api_response.json()
            if data.get('Data') and data['Data'].get('LSJZList'):
                latest = data['Data']['LSJZList'][0]
                name_match = data['Data'].get('CodeName') or code
                result = {
                    'code': code,
                    'name': name_match,
                    'nav': float(latest.get('DWJZ', 0)),
                    'change': float(latest.get('JZZZL', 0)),
                    'source': '天天基金网(历史净值)'
                }
                return JSONResponse(content=result, media_type="application/json; charset=utf-8")

    raise HTTPException(status_code=404, detail=f"未找到基金代码: {code}")


@app.post("/api/fund/holdings")
async def fund_holdings(query: FundQuery):
    code = query.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="请输入基金代码")

    async with httpx.AsyncClient() as client:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://fundf10.eastmoney.com/',
        }

        url = f"https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code={code}&topline=10&year=&month=&rt=0."
        response = await client.get(url, headers=headers, timeout=10.0)

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="获取持仓数据失败")

        content = response.content.decode('utf-8', errors='replace')

        holdings = []
        pattern = r'<tr><td>(\d+)</td><td><a[^>]*>([^<]+)</a></td><td[^>]*><a[^>]*>([^<]+)</a></td><td[^>]*><span[^>]*></span></td><td[^>]*><span[^>]*></span></td><td[^>]*>(?:<a[^>]*>[^<]*</a>)+</td><td[^>]*>([^<]+)</td>'
        matches = re.findall(pattern, content)

        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', content)
        report_date = date_match.group(1) if date_match else ""

        for m in matches:
            rank, stock_code, stock_name, pct_str = m
            pct = float(pct_str.strip('%'))
            holdings.append({
                'rank': int(rank),
                'stockCode': stock_code,
                'stockName': stock_name,
                'percent': pct,
                'change': None,
            })

        # 批量获取股票实时涨跌幅
        if holdings:
            secids = []
            for h in holdings:
                sc = h['stockCode']
                prefix = '1.' if sc.startswith('6') else '0.'
                secids.append(f"{prefix}{sc}")
            quote_url = f"https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids={','.join(secids)}&fields=f3,f12"
            try:
                quote_resp = await client.get(quote_url, headers=headers, timeout=10.0, follow_redirects=True)
                if quote_resp.status_code == 200:
                    qdata = quote_resp.json()
                    if qdata.get('data') and qdata['data'].get('diff'):
                        change_map = {}
                        for item in qdata['data']['diff']:
                            change_map[item['f12']] = item.get('f3')
                        for h in holdings:
                            if h['stockCode'] in change_map:
                                h['change'] = change_map[h['stockCode']]
            except Exception:
                pass

        return JSONResponse(content={
            'code': code,
            'reportDate': report_date,
            'holdings': holdings,
        }, media_type="application/json; charset=utf-8")


@app.post("/api/fund/drawdowns")
async def fund_drawdowns(query: FundQuery):
    code = query.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="请输入基金代码")

    async with httpx.AsyncClient(follow_redirects=True) as client:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://fund.eastmoney.com/',
        }
        url = f"https://fund.eastmoney.com/pingzhongdata/{code}.js"
        resp = await client.get(url, headers=headers, timeout=15.0)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="获取基金数据失败")

        m = re.search(r'var Data_ACWorthTrend\s*=\s*(\[.*?\])\s*;', resp.text, re.DOTALL)
        if not m:
            raise HTTPException(status_code=502, detail="未找到净值数据")
        nav_data = json.loads(m.group(1))

    # 按日期升序排序
    nav_data.sort(key=lambda x: x[0])
    if len(nav_data) < 2:
        return JSONResponse(content={'code': code, 'drawdowns': []})

    # 计算回撤：从峰值到下一次创新高为一个完整回撤周期
    peak_nav = nav_data[0][1]
    peak_date = nav_data[0][0]
    peak_idx = 0
    drawdowns = []
    dd_trough_idx = 0
    dd_trough_nav = nav_data[0][1]
    in_drawdown = False
    dd_start_idx = 0

    for i in range(1, len(nav_data)):
        ts, nav = nav_data[i]

        if nav >= peak_nav:
            # 创新高，结束当前回撤（如有）
            if in_drawdown:
                max_dd = (dd_trough_nav - peak_nav) / peak_nav * 100
                if max_dd < -5:
                    drawdowns.append({
                        'startDate': timestamp_to_date(nav_data[dd_start_idx][0]),
                        'endDate': timestamp_to_date(nav_data[dd_trough_idx][0]),
                        'peakDate': timestamp_to_date(peak_date),
                        'troughDate': timestamp_to_date(nav_data[dd_trough_idx][0]),
                        'maxDrawdown': round(max_dd, 2),
                        'duration': dd_trough_idx - dd_start_idx,
                    })
                in_drawdown = False
            peak_nav = nav
            peak_date = ts
            peak_idx = i
        else:
            dd = (nav - peak_nav) / peak_nav * 100
            if not in_drawdown and dd < -5:
                in_drawdown = True
                dd_start_idx = peak_idx
                dd_trough_idx = i
                dd_trough_nav = nav
            elif in_drawdown:
                if nav < dd_trough_nav:
                    dd_trough_idx = i
                    dd_trough_nav = nav

    # 处理仍在进行中的回撤
    if in_drawdown:
        max_dd = (dd_trough_nav - peak_nav) / peak_nav * 100
        if max_dd < -5:
            drawdowns.append({
                'startDate': timestamp_to_date(nav_data[dd_start_idx][0]),
                'endDate': timestamp_to_date(nav_data[-1][0]),
                'peakDate': timestamp_to_date(peak_date),
                'troughDate': timestamp_to_date(nav_data[dd_trough_idx][0]),
                'maxDrawdown': round(max_dd, 2),
                'duration': len(nav_data) - 1 - dd_start_idx,
            })

    return JSONResponse(content={
        'code': code,
        'drawdowns': drawdowns,
    }, media_type="application/json; charset=utf-8")


def timestamp_to_date(ts):
    from datetime import datetime
    return datetime.fromtimestamp(ts / 1000).strftime('%Y-%m-%d')


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)