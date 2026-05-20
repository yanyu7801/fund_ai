import urllib.request
import json

try:
    req = urllib.request.Request('http://localhost:8000/api/llm/config')
    with urllib.request.urlopen(req, timeout=3) as response:
        data = response.read()
        print(response.status, data.decode())
except Exception as e:
    print(f"Backend not available: {type(e).__name__}")