import sqlite3
conn = sqlite3.connect('C:/PortableLauncher/Arcade/roms/NFL SEASON 2026/nfl_2026/data/nfl_2026.db')
conn.row_factory = sqlite3.Row

# First check what's in predictions
rows = conn.execute("SELECT * FROM predictions WHERE game_id >= 100000 ORDER BY game_id").fetchall()
for r in rows:
    print(dict(r))
    print()
