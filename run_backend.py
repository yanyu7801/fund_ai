import subprocess
import sys
import os
os.chdir('D:\\yy\\fund\\backend')
proc = subprocess.Popen(
    [sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'],
    stdout=open('backend.log', 'w'),
    stderr=subprocess.STDOUT
)
print(f"PID: {proc.pid}")