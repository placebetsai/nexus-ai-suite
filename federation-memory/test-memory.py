import http.client
import json
import sys

def test(name, method, path, body=None):
    headers = {'Content-Type': 'application/json'}
    conn = http.client.HTTPConnection('localhost', 3002)
    if body:
        conn.request(method, path, body=json.dumps(body), headers=headers)
    else:
        conn.request(method, path)
    resp = conn.getresponse()
    data = resp.read().decode()
    status = resp.status
    conn.close()
    print(f'{"PASS" if status == 200 else "FAIL"} [{status}] {name}')
    return json.loads(data) if data else {}

print('=== Federation Memory Server Tests ===\n')

# Test 1: Save memory
r = test('POST /api/memory/save', 'POST', '/api/memory/save', {'content': 'Test memory', 'tags': ['test']})
assert 'id' in r.get('memory', {}), 'Save failed'
mem_id = r['memory']['id']

# Test 2: List memories
r = test('GET /api/memory/list', 'GET', '/api/memory/list')
assert isinstance(r, list) and len(r) > 0, 'List failed'

# Test 3: Retrieve by text
r = test('GET /api/memory/retrieve?text=test', 'GET', '/api/memory/retrieve?text=test')
assert len(r) >= 1, 'Retrieve by text failed'

# Test 4: Retrieve by tag
r = test('GET /api/memory/retrieve?tag=test', 'GET', '/api/memory/retrieve?tag=test')
assert len(r) >= 1, 'Retrieve by tag failed'

# Test 5: Delete memory
r = test(f'DELETE /api/memory/{mem_id}', 'DELETE', f'/api/memory/{mem_id}')
assert r.get('deleted', 0) == 1, 'Delete failed'

# Test 6: Export
r = test('POST /api/memory/export', 'POST', '/api/memory/export')
assert 'memories' in r, 'Export failed'

# Test 7: Import
r = test('POST /api/memory/import', 'POST', '/api/memory/import', {'memories': [{'content': 'imported', 'tags': ['import'], 'timestamp': '2026-09-19T10:00:00Z', 'id': 'imp-1', 'created': '2026-09-19T10:00:00Z'}]})
assert r.get('imported', 0) == 1, 'Import failed'

# Test 8: Dashboard
headers = {'Accept': 'text/html'}
conn = http.client.HTTPConnection('localhost', 3002)
conn.request('GET', '/')
resp = conn.getresponse()
html = resp.read().decode()
conn.close()
print(f'{"PASS" if resp.status == 200 else "FAIL"} [{resp.status}] GET / (Dashboard)')
assert 'Federation Memory System' in html, 'Dashboard failed'

print('\n=== All tests passed! ===')
