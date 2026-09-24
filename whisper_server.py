"""
whisper_server.py — Local Whisper transcription server
Runs on port 5001, accepts POST /transcribe with multipart audio file
Called by the Express backend at POST /api/whisper/transcribe
"""
import sys
import json
import tempfile
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
import cgi

print("Loading Whisper model (base)...", flush=True)
import whisper
model = whisper.load_model("base")
print("Whisper ready on port 5001", flush=True)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[whisper] {format % args}", flush=True)

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"ok":true,"model":"whisper-base"}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/transcribe":
            try:
                ctype, pdict = cgi.parse_header(self.headers.get("Content-Type", ""))
                if "boundary" in pdict:
                    pdict["boundary"] = pdict["boundary"].encode()
                form = cgi.parse_multipart(self.rfile, pdict)
                audio_bytes = form.get("audio", [None])[0]
                if audio_bytes is None:
                    # Try reading raw body
                    length = int(self.headers.get("Content-Length", 0))
                    audio_bytes = self.rfile.read(length)

                # Write to temp file
                suffix = ".webm"
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
                    f.write(audio_bytes)
                    tmp = f.name

                result = model.transcribe(tmp, language="en", fp16=False)
                os.unlink(tmp)

                resp = json.dumps({"transcript": result["text"].strip(), "ok": True})
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(resp.encode())

            except Exception as e:
                err = json.dumps({"error": str(e), "ok": False})
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(err.encode())

        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"ok":true,"model":"whisper-base"}')

        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5001
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Whisper server listening on :{port}", flush=True)
    server.serve_forever()
