#!/usr/bin/env python
"""
Remote Editor - System Tray GUI
Runs in the system tray (by the clock) with a tkinter window.
Shows both LOCAL and INTERNET (tunnel) URLs.
"""

import os
import sys
import socket
import threading
import tkinter as tk
from tkinter import messagebox

_dir = os.path.dirname(os.path.abspath(__file__))
if _dir not in sys.path:
    sys.path.insert(0, _dir)
import server


class TrayApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Remote Editor Server")
        self.root.geometry("480x420")
        self.root.resizable(False, False)
        self.root.configure(bg="#1e1e2e")
        self.root.protocol("WM_DELETE_WINDOW", self.minimize_to_tray)

        self.stop_event = threading.Event()
        self.running = False
        self.tunnel_url = None

        self.setup_ui()
        self.start_server()

        self.root.after(500, self.minimize_to_tray)

    def setup_ui(self):
        title_frame = tk.Frame(self.root, bg="#181825", height=50)
        title_frame.pack(fill=tk.X)
        title_frame.pack_propagate(False)
        tk.Label(title_frame, text="Remote Editor Server",
                 bg="#181825", fg="#89b4fa",
                 font=("Consolas", 14, "bold")).pack(side=tk.LEFT, padx=10)

        sf = tk.Frame(self.root, bg="#1e1e2e")
        sf.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)

        # Local URL
        local_ip = server.get_local_ip()
        local_url = "http://%s:%d" % (local_ip, server.PORT)

        tk.Label(sf, text="LOCAL (same WiFi):",
                 bg="#1e1e2e", fg="#a6adc8",
                 font=("Consolas", 9)).pack(anchor=tk.W)
        self.local_label = tk.Label(sf, text=local_url,
                                    bg="#313244", fg="#a6e3a1",
                                    font=("Consolas", 11, "bold"),
                                    cursor="hand2", padx=10, pady=5)
        self.local_label.pack(fill=tk.X, pady=(2, 8))
        self.local_label.bind("<Button-1>", lambda e: self.copy_url(local_url))

        # Tunnel URL
        tk.Label(sf, text="INTERNET (anywhere):",
                 bg="#1e1e2e", fg="#a6adc8",
                 font=("Consolas", 9)).pack(anchor=tk.W)
        self.tunnel_label = tk.Label(sf, text="Starting tunnel...",
                                     bg="#313244", fg="#f9e2af",
                                     font=("Consolas", 11, "bold"),
                                     cursor="hand2", padx=10, pady=5)
        self.tunnel_label.pack(fill=tk.X, pady=(2, 8))
        self.tunnel_label.bind("<Button-1>", self.copy_tunnel)

        # Status
        self.status_label = tk.Label(sf, text="Starting...",
                                     bg="#1e1e2e", fg="#a6adc8",
                                     font=("Consolas", 9))
        self.status_label.pack(anchor=tk.W, pady=(4, 0))

        # Instructions
        instructions = (
            "1. Make sure your Android is online (WiFi or mobile data)\n"
            "2. Open Chrome on your Android\n"
            "3. Paste the INTERNET URL above\n"
            "4. Edit files from anywhere in the world!\n\n"
            "Tap any URL to copy it to clipboard."
        )
        tk.Label(sf, text=instructions,
                 bg="#1e1e2e", fg="#6c7086",
                 font=("Consolas", 8), justify=tk.LEFT).pack(anchor=tk.W, pady=(6, 0))

        # Buttons
        bf = tk.Frame(self.root, bg="#1e1e2e")
        bf.pack(fill=tk.X, padx=15, pady=(0, 10))

        self.toggle_btn = tk.Button(bf, text="Stop Server",
                                    bg="#f38ba8", fg="#11111b",
                                    font=("Consolas", 10, "bold"),
                                    relief=tk.FLAT, padx=15, pady=4,
                                    command=self.toggle_server)
        self.toggle_btn.pack(side=tk.LEFT)

        tk.Button(bf, text="Refresh Tunnel",
                  bg="#313244", fg="#cdd6f4",
                  font=("Consolas", 10),
                  relief=tk.FLAT, padx=15, pady=4,
                  command=self.refresh_tunnel).pack(side=tk.LEFT, padx=8)

        tk.Button(bf, text="Show URLs",
                  bg="#313244", fg="#cdd6f4",
                  font=("Consolas", 10),
                  relief=tk.FLAT, padx=15, pady=4,
                  command=self.show_urls).pack(side=tk.LEFT)

        tk.Button(bf, text="Exit",
                  bg="#313244", fg="#f38ba8",
                  font=("Consolas", 10),
                  relief=tk.FLAT, padx=15, pady=4,
                  command=self.quit_app).pack(side=tk.RIGHT)

    def start_server(self):
        if self.running:
            return
        self.running = True
        self.stop_event.clear()
        self.status_label.config(text="Server starting...", fg="#f9e2af")
        self.toggle_btn.config(text="Stop Server", bg="#f38ba8")

        def _start():
            # Start HTTP server
            server.t = threading.Thread(
                target=server.run_server,
                args=(server.PORT, self.stop_event),
                daemon=True
            )
            server.t.start()

            # Start tunnel
            self.root.after(1000, self._start_tunnel_thread)

        t = threading.Thread(target=_start, daemon=True)
        t.start()

    def _start_tunnel_thread(self):
        def _go():
            url = server.start_tunnel(server.PORT)
            self.tunnel_url = url
            if url:
                self.root.after(0, lambda: self.tunnel_label.config(
                    text=url, fg="#a6e3a1"))
                self.root.after(0, lambda: self.status_label.config(
                    text="Running - Internet access enabled!", fg="#a6e3a1"))
            else:
                self.root.after(0, lambda: self.tunnel_label.config(
                    text="Tunnel failed - local only", fg="#f38ba8"))
                self.root.after(0, lambda: self.status_label.config(
                    text="Running - local network only", fg="#f9e2af"))
        threading.Thread(target=_go, daemon=True).start()

    def stop_server(self):
        if not self.running:
            return
        self.running = False
        self.stop_event.set()
        self.toggle_btn.config(text="Start Server", bg="#a6e3a1")
        self.status_label.config(text="Stopped", fg="#f38ba8")
        self.tunnel_label.config(text="Stopped", fg="#f38ba8")

    def toggle_server(self):
        if self.running:
            self.stop_server()
        else:
            self.tunnel_url = None
            self.tunnel_label.config(text="Starting tunnel...", fg="#f9e2af")
            self.start_server()

    def refresh_tunnel(self):
        server.stop_tunnel()
        self.tunnel_url = None
        self.tunnel_label.config(text="Restarting tunnel...", fg="#f9e2af")
        self._start_tunnel_thread()

    def copy_url(self, url):
        self.root.clipboard_clear()
        self.root.clipboard_append(url)
        self.status_label.config(text="URL copied!", fg="#89b4fa")
        self.root.after(2000, lambda: self.status_label.config(
            text="Running" if self.running else "Stopped",
            fg="#a6e3a1" if self.running else "#f38ba8"))

    def copy_tunnel(self, event=None):
        if self.tunnel_url:
            self.copy_url(self.tunnel_url)

    def show_urls(self):
        local_ip = server.get_local_ip()
        local_url = "http://%s:%d" % (local_ip, server.PORT)
        msg = "LOCAL (same WiFi):\n%s\n\nINTERNET (anywhere):\n%s" % (
            local_url, self.tunnel_url or "Starting...")
        messagebox.showinfo("Remote Editor URLs", msg)

    def minimize_to_tray(self):
        self.root.overrideredirect(False)
        self.root.state("iconic")

    def quit_app(self):
        self.stop_server()
        self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = TrayApp()
    app.run()
