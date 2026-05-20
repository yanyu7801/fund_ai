import requests
try:
    r = requests.get('http://localhost:5173', timeout=5)
    print(f"Status: {r.status_code}")
    print(f"Length: {len(r.text)}")
    print("Has root div:", '<div id="root">' in r.text)
except Exception as e:
    print(f"Error: {e}")