import http.server
import json
import os
import uuid
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = 3002
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
MEMORY_FILE = os.path.join(DATA_DIR, 'memories.json')

os.makedirs(DATA_DIR, exist_ok=True)

def load_memories():
    try:
        if os.path.exists(MEMORY_FILE):
            with open(MEMORY_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return []

def save_memories(memories):
    with open(MEMORY_FILE, 'w') as f:
        json.dump(memories, f, indent=2)

class MemoryHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length:
            return json.loads(self.rfile.read(length))
        return {}

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            dash = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'memory-dashboard.html')
            with open(dash, 'r') as f:
                self.wfile.write(f.read().encode())
            return

        if parsed.path == '/api/memory/list':
            return self.send_json(load_memories())

        if parsed.path == '/api/memory/retrieve':
            params = parse_qs(parsed.query)
            memories = load_memories()
            tag = params.get('tag', [None])[0]
            text = params.get('text', [None])[0]
            fr = params.get('from', [None])[0]
            to = params.get('to', [None])[0]
            if tag:
                memories = [m for m in memories if tag in m.get('tags', [])]
            if text:
                memories = [m for m in memories if text.lower() in m.get('content', '').lower()]
            if fr:
                memories = [m for m in memories if m.get('timestamp', '') >= fr]
            if to:
                memories = [m for m in memories if m.get('timestamp', '') <= to]
            return self.send_json(memories)

        self.send_json({'error': 'Not found'}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == '/api/memory/save':
            body = self.read_body()
            memories = load_memories()
            memory = {
                'id': str(uuid.uuid4()),
                'content': body.get('content', ''),
                'tags': body.get('tags', []),
                'timestamp': body.get('timestamp', datetime.now().isoformat()),
                'created': datetime.now().isoformat()
            }
            memories.append(memory)
            save_memories(memories)
            return self.send_json({'success': True, 'memory': memory})

        if parsed.path == '/api/memory/export':
            return self.send_json({'success': True, 'memories': load_memories()})

        if parsed.path == '/api/memory/import':
            body = self.read_body()
            existing = load_memories()
            imported = body.get('memories', [])
            merged = existing + imported
            save_memories(merged)
            return self.send_json({'success': True, 'imported': len(imported), 'total': len(merged)})

        self.send_json({'error': 'Not found'}, 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/memory/'):
            mem_id = parsed.path.split('/api/memory/')[1]
            memories = load_memories()
            before = len(memories)
            memories = [m for m in memories if m['id'] != mem_id]
            save_memories(memories)
            return self.send_json({'success': True, 'deleted': before - len(memories)})
        self.send_json({'error': 'Not found'}, 404)

    def log_message(self, format, *args):
        pass

    def log_error(self, format, *args):
        print('ERROR:', format % args)

if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', PORT), MemoryHandler)
    print(f'Federation Memory Server running on http://localhost:{PORT}')
    print(f'Dashboard: http://localhost:{PORT}/')
    server.serve_forever()
