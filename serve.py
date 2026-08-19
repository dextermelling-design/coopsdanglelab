#!/usr/bin/env python3
"""
Coop's Fishing local server
- Serves the static site
- Proxies NOAA NDBC buoy text (browser CORS is blocked on ndbc.noaa.gov)

Usage:
  python serve.py
  → http://localhost:8765
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = 8765
NDBC_URL = "https://www.ndbc.noaa.gov/data/realtime2/{station}.txt"


def parse_ndbc(text: str) -> dict | None:
    """Return latest valid WTMP (°C) from NDBC realtime2 text."""
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if len(lines) < 3:
        return None
    for line in lines[2:40]:
        parts = line.split()
        if len(parts) < 15:
            continue
        wtmp = parts[14]
        if wtmp in ("MM", "999", "99.0"):
            continue
        try:
            c = float(wtmp)
        except ValueError:
            continue
        if c < -2 or c > 40:
            continue
        yy, mo, dd, hh, mm = parts[0], parts[1], parts[2], parts[3], parts[4]
        when = f"{yy}-{mo.zfill(2)}-{dd.zfill(2)}T{hh.zfill(2)}:{mm.zfill(2)}:00Z"
        return {"c": c, "when": when, "source": "NOAA NDBC"}
    return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Helpful for local dev
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path.startswith("/api/ndbc/"):
            return self.handle_ndbc()
        if self.path.startswith("/api/health"):
            return self.json_response({"ok": True})
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0].rstrip("/") == "/api/feedback":
            return self.handle_feedback()
        self.send_error(404, "Not found")

    def handle_feedback(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return self.json_response({"error": "bad length"}, 400)
        if length > 20_000:
            return self.json_response({"error": "too large"}, 413)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8", errors="replace"))
        except json.JSONDecodeError:
            return self.json_response({"error": "invalid json"}, 400)
        if not isinstance(data, dict):
            return self.json_response({"error": "expected object"}, 400)
        # Honeypot — pretend success
        if str(data.get("website") or data.get("_honey") or "").strip():
            return self.json_response({"ok": True})
        message = str(data.get("message") or "").strip()
        if len(message) < 4:
            return self.json_response({"error": "message too short"}, 400)
        rec = {
            "when": str(data.get("when") or "")[:40],
            "kind": str(data.get("kind") or "idea")[:40],
            "message": message[:2000],
            "water": str(data.get("water") or "")[:120],
            "name": str(data.get("name") or "")[:80],
            "email": str(data.get("email") or "")[:120],
            "href": str(data.get("href") or "")[:300],
        }
        folder = ROOT / "feedback"
        folder.mkdir(exist_ok=True)
        path = folder / "submissions.jsonl"
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        return self.json_response({"ok": True})

    def handle_ndbc(self):
        m = re.match(r"^/api/ndbc/([A-Za-z0-9]+)/?$", self.path.split("?")[0])
        if not m:
            return self.json_response({"error": "bad station id"}, 400)
        station = m.group(1).upper()
        url = NDBC_URL.format(station=station)
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "CoopsFishing/1.0 (local Midwest fishing temps)"},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                text = resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            return self.json_response({"error": f"NDBC HTTP {e.code}", "station": station}, 502)
        except Exception as e:
            return self.json_response({"error": str(e), "station": station}, 502)

        parsed = parse_ndbc(text)
        if not parsed:
            return self.json_response(
                {"error": "no water temperature in recent rows", "station": station},
                404,
            )
        parsed["station"] = station
        return self.json_response(parsed)

    def json_response(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Quieter logs
        if args and str(args[0]).startswith("/api/"):
            super().log_message(fmt, *args)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Coop's Fishing → http://localhost:{PORT}")
    print("  Live temps: USGS (direct) + NOAA NDBC (proxied at /api/ndbc/)")
    print("  Feedback: POST /api/feedback → feedback/submissions.jsonl")
    print("  Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
