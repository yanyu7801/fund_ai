import requests
import time

time.sleep(2)

print("=== 测试后端 API ===")
try:
    r = requests.get('http://localhost:8000/api/llm/config', timeout=5)
    print(f"GET /api/llm/config -> {r.status_code}: {r.json()}")
except Exception as e:
    print(f"后端API失败: {e}")

print("\n=== 测试前端 ===")
try:
    r = requests.get('http://localhost:5173/', timeout=5)
    print(f"前端页面 -> {r.status_code}, 长度: {len(r.text)}")
except Exception as e:
    print(f"前端失败: {e}")