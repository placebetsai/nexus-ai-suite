import sys, os, threading, time, re, subprocess, socket

DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8080
CF = os.path.join(DIR, "cloudflared.exe")

_tunnel_proc = None

def start_tunnel(port):
    global _tunnel_proc
    if not os.path.isfile(CF):
        print("[Tunnel] cloudflared.exe not found!", flush=True)
        return None
    _tunnel_proc = subprocess.Popen(
        [CF, "tunnel", "--url", "http://localhost:%d" % port, "--no-autoupdate"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
    )
    url = None
    ready = False
    deadline = time.time() + 30
    while time.time() < deadline:
        line = _tunnel_proc.stdout.readline()
        if not line:
            break
        text = line.decode("utf-8", errors="replace").strip()
        if not url:
            m = re.search(r'(https://\S+\.trycloudflare\.com)', text)
            if m:
                url = m.group(1)
                print("[Tunnel] URL found: %s (waiting for edge...)" % url, flush=True)
        if "Registered tunnel connection" in text:
            ready = True
            print("[Tunnel] Edge connected!", flush=True)
            break
    if url and ready:
        with open(os.path.join(DIR, "tunnel_url.txt"), "w") as f:
            f.write(url)
        return url
    return None

sys.path.insert(0, DIR)
import server

stop_event = threading.Event()
t = threading.Thread(target=server.run_server, args=(PORT, stop_event), daemon=True)
t.start()
time.sleep(2)

try:
    ip = socket.gethostbyname(socket.gethostname())
except:
    ip = "?"

print("=" * 50, flush=True)
print("  LOCAL:    http://%s:%d" % (ip, PORT), flush=True)
print("=" * 50, flush=True)
print("Starting internet tunnel...", flush=True)

url = start_tunnel(PORT)

if url:
    print("", flush=True)
    print("=" * 50, flush=True)
    print("  LOCAL:    http://%s:%d" % (ip, PORT), flush=True)
    print("  INTERNET: %s" % url, flush=True)
    print("=" * 50, flush=True)
    print("", flush=True)
    print("Open the INTERNET URL on your Android!", flush=True)
else:
    print("Tunnel failed. Use LOCAL: http://%s:%d" % (ip, PORT), flush=True)

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    if _tunnel_proc:
        try: _tunnel_proc.terminate()
        except: pass
    stop_event.set()
