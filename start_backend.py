import subprocess
import sys
proc = subprocess.Popen(
    [sys.executable, '-m', 'uvicorn', 'app.main:app', '--port', '8001'],
    cwd='D:\\yy\\fund\\backend',
    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
)
print(f"Backend PID: {proc.pid}")