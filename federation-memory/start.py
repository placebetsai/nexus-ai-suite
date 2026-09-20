import subprocess, time, os
os.chdir(r"C:\Users\ASUS2\Documents\New OpenCode Project\federation-memory")
p = subprocess.Popen(["python", "fed-memory.py"], creationflags=0x00000008)
time.sleep(3)
print(f"Server started, PID: {p.pid}")
