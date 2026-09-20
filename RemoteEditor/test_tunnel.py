#!/usr/bin/env python
"""Quick test: start server + tunnel, print URL, keep running."""
import sys, os, threading, time, re, subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import server

PORT = 8080

# Start HTTP server in background
stop = server._tunnel_event = threading.Event()
t = threading.Thread(target=server.run_server, args=(PORT, stop), daemon=True)
t.start()
print("[OK] HTTP server on port %d" % PORT)

# Start SSH tunnel
print("[OK] Starting SSH tunnel...")
cmd = [
    "ssh", "-o", "StrictHostKeyChecking=no",
    "-o", "ServerAliveInterval=30",
    "-R", "80:localhost:%d" % PORT,
    "nokey@localhost.run",
]

proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
url = None
deadline = time.time() + 20
while time.time() < deadline:
    line = proc.stdout.readline()
    if not line:
        break
    text = line.decode("utf-8", errors="replace").strip()
    print("  SSH:", text)
    m = re.search(r'(https://\S+\.lhr\.life\S*)', text)
    if m:
        url = m.group(1).rstrip(".")
        break

if url:
    print()
    print("=" * 60)
    print("  LOCAL:  http://127.0.0.1:%d" % PORT)
    print("  INTERNET: %s" % url)
    print("=" * 60)
    print()
    print("Open the INTERNET URL on your Android browser!")

    # Write URL to file
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "tunnel_url.txt"), "w") as f:
        f.write(url)
else:
    print("[FAIL] Could not get tunnel URL")

# Keep running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    stop.set()
    proc.terminate()
