"""
whisper_server.py — Local Whisper transcription server
Runs on port 5001. POST /transcribe takes the raw audio bytes as the request body
(X-Audio-Ext header gives the container, default webm). GET /health for liveness.
Called by the Express backend at POST /api/whisper/transcribe.
Engine: faster-whisper (CTranslate2, int8 on CPU) with the small.en model — clearly more accurate than
the old "base" model and still ~1-1.5 s per spoken sentence. Override with env WHISPER_MODEL
(tiny.en / base.en / small.en / medium.en / distil-large-v3 ...). Falls back to openai-whisper "base"
if faster-whisper isn't installed. Requires ffmpeg on PATH for the fallback engine.
"""
import sys
import json
import tempfile
import os
from http.server import HTTPServer, BaseHTTPRequestHandler

# Windows consoles default to cp1252: printing a non-Latin transcript would crash the request
for stream in (sys.stdout, sys.stderr):
    try: stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass

PROMPT = "Hey Cat. CAT 320 excavator, hydraulic oil, track tension, fuel, seatbelt, boom, bucket, swing."
MODEL_NAME = os.environ.get("WHISPER_MODEL", "small.en")

try:
    from faster_whisper import WhisperModel
    print(f"Loading faster-whisper model ({MODEL_NAME}, int8, cpu)...", flush=True)
    _fw = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8", cpu_threads=max(4, (os.cpu_count() or 8) // 2))

    def transcribe(path):
        segs, _ = _fw.transcribe(
            path, language="en", beam_size=5, temperature=0.0,
            condition_on_previous_text=False,
            initial_prompt=PROMPT, hotwords="Hey Cat",
            vad_filter=True, vad_parameters={"min_silence_duration_ms": 500},   # drop silence/noise -> fewer hallucinations
            no_speech_threshold=0.6,
        )
        return " ".join(s.text.strip() for s in segs).strip()

    ENGINE = f"faster-whisper-{MODEL_NAME}"
except ImportError:
    import whisper
    print("faster-whisper not installed — falling back to openai-whisper base", flush=True)
    _ow = whisper.load_model("base")

    def transcribe(path):
        r = _ow.transcribe(path, language="en", fp16=False, initial_prompt=PROMPT, condition_on_previous_text=False)
        return r["text"].strip()

    ENGINE = "whisper-base"
print("Whisper ready", flush=True)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[whisper] {format % args}", flush=True)

    def _json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"ok": True, "model": ENGINE})
        else:
            self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path != "/transcribe":
            return self._json(404, {"ok": False, "error": "not found"})
        tmp = None
        try:
            length = int(self.headers.get("Content-Length", 0))
            audio = self.rfile.read(length)
            if not audio:
                return self._json(400, {"ok": False, "error": "empty audio"})
            ext = "".join(c for c in self.headers.get("X-Audio-Ext", "webm") if c.isalnum())[:5] or "webm"
            with tempfile.NamedTemporaryFile(suffix="." + ext, delete=False) as f:
                f.write(audio)
                tmp = f.name
            text = transcribe(tmp)
            # language is forced to English; non-Latin output on noise/silence is a hallucination
            letters = [c for c in text if c.isalpha()]
            if letters and sum(c.isascii() for c in letters) / len(letters) < 0.6:
                text = ""
            print(f"[whisper] heard: {text!r}", flush=True)
            self._json(200, {"ok": True, "transcript": text})
        except Exception as e:
            self._json(500, {"ok": False, "error": str(e)})
        finally:
            if tmp and os.path.exists(tmp):
                os.unlink(tmp)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5001
    print(f"Whisper server listening on 127.0.0.1:{port}", flush=True)
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
