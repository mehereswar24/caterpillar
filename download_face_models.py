"""Downloads the two face models (~16 MB, InsightFace "buffalo_sc") into ./models/face. Run once."""
import io
import os
import urllib.request
import zipfile

URL = "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_sc.zip"
DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "face")
NEEDED = ("det_500m.onnx", "w600k_mbf.onnx")

os.makedirs(DEST, exist_ok=True)
if all(os.path.exists(os.path.join(DEST, f)) for f in NEEDED):
    print("Face models already present in", DEST)
else:
    print("Downloading", URL)
    with urllib.request.urlopen(URL, timeout=180) as r:
        data = r.read()
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for f in NEEDED:
            z.extract(f, DEST)
    print("Saved to", DEST)
