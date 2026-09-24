"""
face_server.py — local face-recognition service (port 5002).

  GET  /health
  POST /embed      body = raw JPEG/PNG bytes
                   -> {ok, reason, face_count, face_px, det_score, sharpness, embedding[512]}

Called by the Express backend (server/src/faceClient.js). Nothing leaves this machine.
The backend does the matching against enrolled operators; this service only turns a photo into
an identity vector. Models: ./models/face (python download_face_models.py).
"""
import json
import sys
import warnings
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

warnings.filterwarnings("ignore")
for stream in (sys.stdout, sys.stderr):
    try: stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass

import cv2
import numpy as np
from face_engine import FaceEngine

print("Loading face models (SCRFD + ArcFace MobileFaceNet)...", flush=True)
engine = FaceEngine()
engine.analyse(np.zeros((480, 640, 3), np.uint8))   # warm-up
print("Face service ready", flush=True)

MAX_BYTES = 8 * 1024 * 1024


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[face] {fmt % args}", flush=True)

    def _json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._json(200, {"ok": True, "engine": "scrfd-500m + arcface-mbf"})
        self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path != "/embed":
            return self._json(404, {"ok": False, "error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n <= 0 or n > MAX_BYTES:
                return self._json(400, {"ok": False, "reason": "bad_size", "error": "image missing or too large"})
            img = cv2.imdecode(np.frombuffer(self.rfile.read(n), np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                return self._json(400, {"ok": False, "reason": "bad_image", "error": "could not decode image"})
            r = engine.analyse(img)
            if r.get("embedding") is not None:
                r["embedding"] = [round(float(x), 6) for x in r["embedding"]]
            r.pop("box", None)
            self._json(200, r)
        except Exception as e:
            self._json(500, {"ok": False, "reason": "error", "error": str(e)})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5002
    print(f"Face service listening on 127.0.0.1:{port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
