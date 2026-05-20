import subprocess
import sys

proc = subprocess.Popen(
    [sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000', '--log-level', 'info'],
    cwd='D:\\yy\\fund\\backend',
    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
)
print(f"Started: {proc.pid}")