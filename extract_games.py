import json
import sys

files = {
    "W1": r"C:\Users\ASUS2\.local\share\opencode\tool-output\tool_06b8588ed0017HxPB3D4Q8yEts",
    "W2": r"C:\Users\ASUS2\.local\share\opencode\tool-output\tool_06b871a3f001SGeCLsjiRM5chF",
}

for week_label, filepath in files.items():
    print(f"\n{'='*60}")
    print(f"  {week_label}")
    print(f"{'='*60}")
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    events = data.get("events", [])
    print(f"Total events: {len(events)}")
    for ev in events:
        event_id = ev.get("id", "")
        name = ev.get("name", "")
        date = ev.get("date", "")
        comps = ev.get("competitions", [])
        if comps:
            state = comps[0].get("status", {}).get("type", {}).get("state", "")
        else:
            state = ""

        competitors = ev.get("competitions", [{}])[0].get("competitors", [])
        home = away = None
        for c in competitors:
            info = {
                "abbr": c.get("team", {}).get("abbreviation", ""),
                "score": c.get("score", ""),
                "homeAway": c.get("homeAway", ""),
            }
            if info["homeAway"] == "home":
                home = info
            else:
                away = info

        h_abbr = home["abbr"] if home else "???"
        h_score = home["score"] if home else "?"
        a_abbr = away["abbr"] if away else "???"
        a_score = away["score"] if away else "?"

        print(f"  {a_abbr} {a_score} @ {h_abbr} {h_score}  |  state={state}  |  {date}  |  {name}")

print("\nDone.")
