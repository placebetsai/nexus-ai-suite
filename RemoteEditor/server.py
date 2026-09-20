#!/usr/bin/env python
"""
Remote Code Editor Server
Serve a web-based code editor accessible from Android or any browser.
Pure Python stdlib - no external dependencies.
"""

import http.server
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.parse
from pathlib import Path

PORT = 8080
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVE_DIR = os.path.expanduser("~")  # Start from user home


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


class EditorHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Silence logs

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html, status=200):
        body = html.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, filepath):
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            ext = os.path.splitext(filepath)[1].lower()
            mime_map = {
                ".js": "application/javascript",
                ".css": "text/css",
                ".json": "application/json",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".gif": "image/gif",
                ".svg": "image/svg+xml",
                ".ico": "image/x-icon",
                ".woff": "font/woff",
                ".woff2": "font/woff2",
            }
            mime = mime_map.get(ext, "application/octet-stream")
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_error(404)

    def read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/" or path == "":
            self.send_html(self.get_editor_html())
            return

        if path == "/api/list":
            query = urllib.parse.parse_qs(parsed.query)
            dirpath = query.get("dir", [SERVE_DIR])[0]
            self.handle_list(dirpath)
            return

        if path == "/api/read":
            query = urllib.parse.parse_qs(parsed.query)
            filepath = query.get("file", [""])[0]
            self.handle_read(filepath)
            return

        if path == "/api/ip":
            self.send_json({"ip": get_local_ip(), "port": PORT})
            return

        # Serve static files
        safe = os.path.normpath(path.lstrip("/"))
        full = os.path.join(ROOT_DIR, safe)
        if os.path.isfile(full):
            self.send_file(full)
        else:
            self.send_error(404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/api/save":
            self.handle_save()
            return
        if path == "/api/mkdir":
            self.handle_mkdir()
            return
        if path == "/api/delete":
            self.handle_delete()
            return
        if path == "/api/rename":
            self.handle_rename()
            return
        if path == "/api/exec":
            self.handle_exec()
            return
        if path == "/api/search":
            self.handle_search()
            return

        self.send_error(404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)
        if path == "/api/save":
            self.handle_save()
            return
        self.send_error(404)

    def handle_list(self, dirpath):
        try:
            dirpath = os.path.expanduser(dirpath)
            dirpath = os.path.abspath(dirpath)
            if not os.path.isdir(dirpath):
                self.send_json({"error": "Not a directory"}, 400)
                return

            entries = []
            parent = os.path.dirname(dirpath)
            entries.append({"name": "..", "path": parent, "isDir": True})

            for name in sorted(os.listdir(dirpath)):
                full = os.path.join(dirpath, name)
                is_dir = os.path.isdir(full)
                try:
                    size = os.path.getsize(full) if not is_dir else 0
                    mtime = os.path.getmtime(full)
                except Exception:
                    size = 0
                    mtime = 0
                entries.append({
                    "name": name,
                    "path": full,
                    "isDir": is_dir,
                    "size": size,
                    "mtime": mtime,
                })
            self.send_json({"dir": dirpath, "entries": entries})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_read(self, filepath):
        try:
            filepath = os.path.abspath(filepath)
            if not os.path.isfile(filepath):
                self.send_json({"error": "File not found"}, 404)
                return
            size = os.path.getsize(filepath)
            if size > 10 * 1024 * 1024:  # 10MB limit
                self.send_json({"error": "File too large"}, 413)
                return
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            ext = os.path.splitext(filepath)[1].lower()
            lang_map = {
                ".py": "python", ".js": "javascript", ".ts": "typescript",
                ".html": "html", ".css": "css", ".json": "json",
                ".md": "markdown", ".java": "java", ".c": "c",
                ".cpp": "cpp", ".h": "cpp", ".cs": "csharp",
                ".rb": "ruby", ".go": "go", ".rs": "rust",
                ".php": "php", ".sh": "shell", ".bat": "shell",
                ".xml": "xml", ".yaml": "yaml", ".yml": "yaml",
                ".sql": "sql", ".txt": "text",
            }
            lang = lang_map.get(ext, "text/plain")
            self.send_json({
                "file": filepath,
                "content": content,
                "language": lang,
                "size": size,
            })
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_save(self):
        try:
            data = json.loads(self.read_body())
            filepath = os.path.abspath(data["file"])
            content = data.get("content", "")
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            self.send_json({"ok": True, "file": filepath})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_mkdir(self):
        try:
            data = json.loads(self.read_body())
            dirpath = os.path.abspath(data["path"])
            os.makedirs(dirpath, exist_ok=True)
            self.send_json({"ok": True})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_delete(self):
        try:
            data = json.loads(self.read_body())
            target = os.path.abspath(data["path"])
            if os.path.isdir(target):
                shutil.rmtree(target)
            elif os.path.isfile(target):
                os.remove(target)
            self.send_json({"ok": True})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_rename(self):
        try:
            data = json.loads(self.read_body())
            old = os.path.abspath(data["old"])
            new = os.path.abspath(data["new"])
            os.rename(old, new)
            self.send_json({"ok": True})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_exec(self):
        try:
            data = json.loads(self.read_body())
            cmd = data.get("command", "")
            cwd = data.get("cwd", os.path.expanduser("~"))
            timeout_val = min(data.get("timeout", 30), 120)
            proc = subprocess.Popen(
                cmd, shell=True, cwd=cwd,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )
            try:
                stdout, _ = proc.communicate(timeout=timeout_val)
                output = stdout.decode("utf-8", errors="replace")
            except subprocess.TimeoutExpired:
                proc.kill()
                output = "Command timed out"
            self.send_json({"output": output, "code": proc.returncode})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_search(self):
        try:
            data = json.loads(self.read_body())
            query = data.get("query", "").lower()
            dirpath = data.get("dir", SERVE_DIR)
            max_results = min(data.get("max", 50), 200)
            results = []
            for root, dirs, files in os.walk(dirpath):
                dirs[:] = [d for d in dirs if d not in (
                    ".git", "node_modules", "__pycache__", ".venv", "venv",
                    ".cache", "AppData", "Library", ".Trash",
                )]
                for fname in files:
                    if query in fname.lower():
                        full = os.path.join(root, fname)
                        rel = os.path.relpath(full, dirpath)
                        results.append({"name": fname, "path": full, "rel": rel})
                        if len(results) >= max_results:
                            self.send_json({"results": results, "truncated": True})
                            return
            self.send_json({"results": results, "truncated": False})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def get_editor_html(self):
        return OPEN_EDITOR_HTML


OPEN_EDITOR_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<title>Remote Code Editor</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/dracula.min.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#1e1e2e;--fg:#cdd6f4;--surface:#313244;--border:#45475a;--accent:#89b4fa;--green:#a6e3a1;--red:#f38ba8;--yellow:#f9e2af;--bar:#181825}
body{font-family:'SF Mono','Fira Code','Consolas',monospace;background:var(--bg);color:var(--fg);height:100vh;display:flex;flex-direction:column;overflow:hidden}
#topbar{background:var(--bar);padding:6px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);flex-shrink:0;z-index:100}
#topbar h1{font-size:13px;color:var(--accent);white-space:nowrap}
#topbar input{flex:1;background:var(--surface);border:1px solid var(--border);color:var(--fg);padding:5px 8px;border-radius:4px;font-size:13px;min-width:0}
#topbar button{background:var(--surface);border:1px solid var(--border);color:var(--fg);padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;white-space:nowrap}
#topbar button:hover{background:var(--accent);color:var(--bar)}
#topbar button.save-btn{background:var(--green);color:#11111b;border-color:var(--green)}
.tabs{display:flex;background:var(--bar);border-bottom:1px solid var(--border);overflow-x:auto;flex-shrink:0}
.tab{padding:6px 14px;cursor:pointer;font-size:12px;color:#a6adc8;border-right:1px solid var(--border);white-space:nowrap;display:flex;align-items:center;gap:6px}
.tab.active{background:var(--bg);color:var(--fg)}
.tab .close{color:#6c7086;font-size:14px;line-height:1}
.tab .close:hover{color:var(--red)}
.tab .dot{width:6px;height:6px;border-radius:50%;background:var(--yellow);display:none}
.tab.modified .dot{display:inline-block}
#main{flex:1;display:flex;overflow:hidden}
#sidebar{width:240px;background:var(--bar);border-right:1px solid var(--border);overflow-y:auto;flex-shrink:0;display:none}
#sidebar.open{display:block}
#sidebar .header{padding:8px 10px;font-size:11px;color:#a6adc8;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center}
#sidebar .header button{background:none;border:none;color:var(--accent);cursor:pointer;font-size:16px}
#file-tree{padding:0 4px 8px}
.tree-item{display:flex;align-items:center;gap:4px;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:12px;color:#a6adc8}
.tree-item:hover{background:var(--surface);color:var(--fg)}
.tree-item.dir{color:var(--yellow)}
.tree-item.selected{background:var(--surface);color:var(--fg)}
.tree-icon{width:14px;text-align:center;flex-shrink:0}
#editor-wrap{flex:1;position:relative;overflow:hidden}
.CodeMirror{height:100%!important;font-size:14px;line-height:1.5}
#search-panel{position:absolute;top:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:0 0 0 6px;padding:8px;z-index:50;display:none;gap:6px}
#search-panel input{background:var(--bg);border:1px solid var(--border);color:var(--fg);padding:4px 8px;border-radius:3px;font-size:12px;width:180px}
#search-panel button{background:var(--surface);border:1px solid var(--border);color:var(--fg);padding:4px 8px;border-radius:3px;cursor:pointer;font-size:11px}
#statusbar{background:var(--bar);padding:3px 10px;font-size:11px;color:#a6adc8;display:flex;justify-content:space-between;border-top:1px solid var(--border);flex-shrink:0}
#terminal-panel{height:200px;background:#11111b;border-top:1px solid var(--border);display:none;flex-direction:column;flex-shrink:0}
#terminal-panel.open{display:flex}
#terminal-panel .term-header{padding:4px 10px;background:var(--bar);font-size:11px;color:#a6adc8;display:flex;justify-content:space-between;border-bottom:1px solid var(--border)}
#terminal-panel .term-header button{background:none;border:none;color:var(--accent);cursor:pointer}
#terminal-output{flex:1;overflow-y:auto;padding:8px 10px;font-size:12px;color:var(--fg);white-space:pre-wrap;word-break:break-all}
#terminal-input-wrap{display:flex;padding:4px 8px;background:var(--bar);border-top:1px solid var(--border)}
#terminal-input{flex:1;background:transparent;border:none;color:var(--green);font-family:inherit;font-size:12px;outline:none}
#cmd-input{background:var(--bg);border:1px solid var(--border);color:var(--fg);padding:5px 8px;border-radius:4px;font-size:13px;font-family:inherit;flex:1}
#overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:200;display:none;align-items:center;justify-content:center}
#overlay.open{display:flex}
#modal{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;max-width:400px;width:90%}
#modal h3{margin-bottom:10px;color:var(--accent);font-size:14px}
#modal input{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--fg);padding:6px 10px;border-radius:4px;font-size:13px;margin-bottom:10px}
#modal .btn-row{display:flex;gap:8px;justify-content:flex-end}
#modal button{padding:6px 14px;border-radius:4px;border:1px solid var(--border);cursor:pointer;font-size:12px}
#modal .btn-ok{background:var(--accent);color:var(--bar);border-color:var(--accent)}
#modal .btn-cancel{background:var(--surface);color:var(--fg)}
.toast{position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:var(--surface);color:var(--fg);padding:8px 16px;border-radius:6px;font-size:12px;z-index:300;border:1px solid var(--border);opacity:0;transition:opacity 0.3s}
.toast.show{opacity:1}
@media(max-width:600px){
  #sidebar{width:180px;position:absolute;left:0;top:0;bottom:0;z-index:80}
  .CodeMirror{font-size:13px}
}
</style>
</head>
<body>
<div id="topbar">
  <h1>RemoteEditor</h1>
  <button onclick="toggleSidebar()" title="Toggle Files">&#9776;</button>
  <input id="cmd-input" placeholder="Type command & Enter..." onkeydown="if(event.key==='Enter')runCmd()">
  <button onclick="runCmd()">&#9654;</button>
  <button class="save-btn" onclick="saveFile()" title="Ctrl+S">&#128190; Save</button>
  <button onclick="toggleTerminal()" title="Terminal">Term</button>
</div>
<div class="tabs" id="tabs"></div>
<div id="main">
  <div id="sidebar">
    <div class="header">Files <button onclick="refreshTree()">&#8635;</button></div>
    <div id="file-tree"></div>
  </div>
  <div id="editor-wrap">
    <div id="search-panel">
      <input id="search-input" placeholder="Find..." oninput="doSearch()">
      <button onclick="closeSearch()">&#10005;</button>
    </div>
    <textarea id="editor-area"></textarea>
  </div>
</div>
<div id="terminal-panel">
  <div class="term-header">Terminal <button onclick="toggleTerminal()">&#10005;</button></div>
  <div id="terminal-output"></div>
  <div id="terminal-input-wrap">
    <span style="color:var(--green)">$ </span>
    <input id="terminal-input" onkeydown="if(event.key==='Enter')sendTermCmd()" autofocus>
  </div>
</div>
<div id="statusbar">
  <span id="status-left">Ready</span>
  <span id="status-right"></span>
</div>
<div id="overlay"><div id="modal"><h3 id="modal-title">Input</h3><input id="modal-input" onkeydown="if(event.key==='Enter')modalOk()"><div class="btn-row"><button class="btn-cancel" onclick="modalCancel()">Cancel</button><button class="btn-ok" onclick="modalOk()">OK</button></div></div></div>
<div class="toast" id="toast"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/htmlmixed/htmlmixed.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clike/clike.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/ruby/ruby.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/go/go.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/rust/rust.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/php/php.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/shell/shell.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/sql/sql.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/yaml/yaml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/closebrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/selection/active-line.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/search.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/searchcursor.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/dialog/dialog.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/dialog/dialog.min.css">
<script>
var editor, currentDir='~', openFiles={}, activeFile=null, dirty={};

function init(){
  editor = CodeMirror.fromTextArea(document.getElementById('editor-area'),{
    theme:'dracula',
    lineNumbers:true,
    matchBrackets:true,
    autoCloseBrackets:true,
    styleActiveLine:true,
    indentUnit:2,
    tabSize:2,
    indentWithTabs:false,
    lineWrapping:true,
    extraKeys:{
      'Ctrl-S':function(e){saveFile()},
      'Cmd-S':function(e){saveFile()},
      'Ctrl-F':function(e){toggleSearch()},
      'Cmd-F':function(e){toggleSearch()},
    }
  });
  editor.on('change',function(){
    if(activeFile) dirty[activeFile]=true;
    renderTabs();
  });
  document.addEventListener('keydown',function(e){
    if(e.ctrlKey&&e.key==='s'){e.preventDefault();saveFile()}
    if(e.ctrlKey&&e.key==='f'){e.preventDefault();toggleSearch()}
  });
  refreshTree();
  setStatus('Connected');
}

async function api(url,data){
  var opts={headers:{'Content-Type':'application/json'}};
  if(data){opts.method='POST';opts.body=JSON.stringify(data)}
  var r=await fetch(url,opts);
  return r.json();
}

async function refreshTree(){
  var d=await api('/api/list?dir='+encodeURIComponent(currentDir));
  if(d.error){toast(d.error);return}
  currentDir=d.dir;
  var html='';
  d.entries.forEach(function(e){
    var cls='tree-item'+(e.isDir?' dir':'');
    var icon=e.isDir?(e.name==='..'?'&#8679;':'&#128193;'):fileIcon(e.name);
    html+='<div class="'+cls+'" onclick="'+(e.isDir?"navigate('"+esc(e.path)+"')":"openFile('"+esc(e.path)+"')")+'" title="'+esc(e.path)+'"><span class="tree-icon">'+icon+'</span>'+esc(e.name)+'</div>';
  });
  document.getElementById('file-tree').innerHTML=html;
  document.getElementById('sidebar').classList.add('open');
}

function fileIcon(n){
  var ext=n.split('.').pop().toLowerCase();
  var m={py:'&#128013;',js:'&#127312;',ts:'&#127319;',html:'&#127760;',css:'&#127912;',json:'&#128196;',md:'&#128221;',java:'&#9749;',go:'&#128071;',rs:'&#128043;',rb:'&#128142;',php:'&#128024;',sh:'&#128424;',sql:'&#128451;',txt:'&#128196;'};
  return m[ext]||'&#128196;';
}

function navigate(path){currentDir=path;refreshTree()}

async function openFile(path){
  if(!path)return;
  var d=await api('/api/read?file='+encodeURIComponent(path));
  if(d.error){toast(d.error);return}
  if(!openFiles[path]){
    openFiles[path]={content:d.content,language:d.language,saved:true};
    dirty[path]=false;
  }
  activeFile=path;
  editor.setValue(openFiles[path].content);
  var mode=d.language||'text/plain';
  editor.setOption('mode',mode);
  renderTabs();
  updateStatus();
  if(window.innerWidth<600)document.getElementById('sidebar').classList.remove('open');
}

function renderTabs(){
  var h='';
  Object.keys(openFiles).forEach(function(f){
    var name=f.split(/[\\/]/).pop();
    var cls='tab'+(f===activeFile?' active':'')+(dirty[f]?' modified':'');
    h+='<div class="'+cls+'" onclick="switchTab(\''+esc(f)+'\')"><span>'+esc(name)+'</span><span class="dot"></span><span class="close" onclick="event.stopPropagation();closeTab(\''+esc(f)+'\')">&times;</span></div>';
  });
  document.getElementById('tabs').innerHTML=h;
}

function switchTab(f){
  if(activeFile)openFiles[activeFile].content=editor.getValue();
  activeFile=f;
  editor.setValue(openFiles[f].content);
  editor.setOption('mode',openFiles[f].language||'text/plain');
  renderTabs();
  updateStatus();
}

function closeTab(f){
  if(dirty[f]&&!confirm('Unsaved changes. Close anyway?'))return;
  delete openFiles[f];
  delete dirty[f];
  if(activeFile===f){
    var keys=Object.keys(openFiles);
    if(keys.length>0){switchTab(keys[0])}
    else{activeFile=null;editor.setValue('');renderTabs()}
  }else renderTabs();
}

async function saveFile(){
  if(!activeFile)return;
  var content=editor.getValue();
  var d=await api('/api/save',{file:activeFile,content:content});
  if(d.error){toast('Error: '+d.error);return}
  openFiles[activeFile].content=content;
  dirty[activeFile]=false;
  renderTabs();
  toast('Saved!');
  updateStatus();
}

function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open')}

function toggleTerminal(){document.getElementById('terminal-panel').classList.toggle('open')}

async function runCmd(){
  var input=document.getElementById('cmd-input');
  var cmd=input.value.trim();
  if(!cmd)return;
  input.value='';
  var d=await api('/api/exec',{command:cmd,cwd:currentDir});
  var out=d.output||d.error||'No output';
  toast(out.substring(0,200));
  document.getElementById('terminal-output').textContent+='\n$ '+cmd+'\n'+out+'\n';
  var tp=document.getElementById('terminal-output');
  tp.scrollTop=tp.scrollHeight;
}

async function sendTermCmd(){
  var input=document.getElementById('terminal-input');
  var cmd=input.value.trim();
  if(!cmd)return;
  input.value='';
  var out=document.getElementById('terminal-output');
  out.textContent+='\n$ '+cmd+'\n';
  var d=await api('/api/exec',{command:cmd,cwd:currentDir,timeout:30});
  out.textContent+=(d.output||d.error||'No output')+'\n';
  out.scrollTop=out.scrollHeight;
}

function toggleSearch(){
  var p=document.getElementById('search-panel');
  p.style.display=p.style.display==='flex'?'none':'flex';
  if(p.style.display==='flex')document.getElementById('search-input').focus();
}
function closeSearch(){document.getElementById('search-panel').style.display='none'}
function doSearch(){
  var q=document.getElementById('search-input').value;
  if(!q){editor.setCursor(0,0);return}
  var cursor=editor.getSearchCursor(q,{caseFold:true});
  if(cursor.findNext()){editor.setSelection(cursor.from(),cursor.to());editor.scrollIntoView()}
}

function setStatus(s){document.getElementById('status-left').textContent=s}
function updateStatus(){
  if(!activeFile)return;
  var name=activeFile.split(/[\\/]/).pop();
  var mode=editor.getOption('mode');
  var pos=editor.getCursor();
  document.getElementById('status-right').textContent=name+' | '+mode+' | Ln '+(pos.line+1)+' Col '+(pos.ch+1);
}
editor&&editor.on('cursorActivity',updateStatus);

function toast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(t._to);t._to=setTimeout(function(){t.classList.remove('show')},3000);
}

var _modalCb=null;
function showModal(title,cb){
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-input').value='';
  document.getElementById('overlay').classList.add('open');
  document.getElementById('modal-input').focus();
  _modalCb=cb;
}
function modalOk(){
  document.getElementById('overlay').classList.remove('open');
  if(_modalCb)_modalCb(document.getElementById('modal-input').value);
}
function modalCancel(){document.getElementById('overlay').classList.remove('open');_modalCb=null}

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}

init();
</script>
</body>
</html>"""


class ThreadedHTTPServer(http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

    def process_request(self, request, client_address):
        t = threading.Thread(target=self.process_request_thread, args=(request, client_address))
        t.daemon = True
        t.start()

    def process_request_thread(self, request, client_address):
        try:
            self.finish_request(request, client_address)
        except Exception:
            self.handle_error(request, client_address)
        finally:
            self.shutdown_request(request)


_tunnel_proc = None
_tunnel_url = None


def _drain_output(proc):
    """Keep reading stdout so SSH doesn't die from broken pipe."""
    try:
        for _ in proc.stdout:
            pass
    except Exception:
        pass


def start_tunnel(port=8080):
    """Start SSH tunnel via localhost.run. Returns the public HTTPS URL or None."""
    global _tunnel_proc, _tunnel_url

    import subprocess, time, re
    cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no",
        "-o", "ServerAliveInterval=30",
        "-R", "80:localhost:%d" % port,
        "nokey@localhost.run",
    ]

    _tunnel_proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )

    deadline = time.time() + 20
    while time.time() < deadline:
        line = _tunnel_proc.stdout.readline()
        if not line:
            break
        text = line.decode("utf-8", errors="replace").strip()
        m = re.search(r'(https://\S+\.lhr\.life\S*)', text)
        if m:
            _tunnel_url = m.group(1).rstrip(".")
            print("[Tunnel] Public URL: %s" % _tunnel_url)
            # Drain stdout in background so SSH stays alive
            threading.Thread(target=_drain_output, args=(_tunnel_proc,), daemon=True).start()
            try:
                url_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tunnel_url.txt")
                with open(url_file, "w") as f:
                    f.write(_tunnel_url)
            except Exception:
                pass
            return _tunnel_url
    print("[Tunnel] Failed to get URL")
    return None


def stop_tunnel():
    global _tunnel_proc
    if _tunnel_proc:
        try:
            _tunnel_proc.terminate()
        except Exception:
            pass
        _tunnel_proc = None


def run_server(port, stop_event=None):
    server = ThreadedHTTPServer(("0.0.0.0", port), EditorHandler)
    ip = get_local_ip()
    print("Server running at http://%s:%d" % (ip, port))
    print("Open this URL on your Android browser!")

    if stop_event:
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        while not stop_event.is_set():
            stop_event.wait(1)
        stop_tunnel()
        server.shutdown()
    else:
        server.serve_forever()


if __name__ == "__main__":
    run_server(PORT)
