"""
face_engine.py — real face recognition, fully local (no cloud, no GPU).

  detect : SCRFD-500M (InsightFace "buffalo_sc") -> face boxes + 5 landmarks
  align  : similarity transform of the 5 landmarks to the ArcFace 112x112 template
  embed  : MobileFaceNet / ArcFace (w600k_mbf) -> 512-d L2-normalised identity vector

Two photos of the same person score a high cosine similarity, different people a low one.
Models live in ./models/face (run `python download_face_models.py` once).
"""
import os
import cv2
import numpy as np
import onnxruntime as ort
from skimage.transform import SimilarityTransform

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "face")

# ArcFace canonical landmark positions in a 112x112 crop
ARCFACE_DST = np.array([
    [38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366],
    [41.5493, 92.3655], [70.7299, 92.2041]], dtype=np.float32)

MIN_FACE_PX = 80          # smaller faces are too far away to recognise reliably
MIN_DET_SCORE = 0.6


def _session(name):
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = max(2, (os.cpu_count() or 4) // 2)
    return ort.InferenceSession(os.path.join(MODEL_DIR, name), opts, providers=["CPUExecutionProvider"])


class FaceEngine:
    def __init__(self):
        self.det = _session("det_500m.onnx")
        self.rec = _session("w600k_mbf.onnx")
        self.det_in = self.det.get_inputs()[0].name
        self.rec_in = self.rec.get_inputs()[0].name

    # ── detection (SCRFD) ────────────────────────────────────────────────────
    def detect(self, img, size=640, thresh=0.5, nms=0.4):
        h, w = img.shape[:2]
        scale = size / max(h, w)
        nw, nh = int(round(w * scale)), int(round(h * scale))
        canvas = np.zeros((size, size, 3), np.uint8)
        canvas[:nh, :nw] = cv2.resize(img, (nw, nh))
        blob = cv2.dnn.blobFromImage(canvas, 1 / 128.0, (size, size), (127.5, 127.5, 127.5), swapRB=True)
        outs = self.det.run(None, {self.det_in: blob})

        boxes, scores, kpss = [], [], []
        for i, stride in enumerate((8, 16, 32)):
            sc = outs[i].reshape(-1)
            bb = outs[i + 3].reshape(-1, 4) * stride
            kp = outs[i + 6].reshape(-1, 10) * stride
            g = size // stride
            ys, xs = np.mgrid[:g, :g]
            centers = np.stack([xs, ys], -1).reshape(-1, 2).astype(np.float32) * stride
            centers = np.repeat(centers, 2, axis=0)             # 2 anchors per cell
            keep = np.where(sc >= thresh)[0]
            if not len(keep):
                continue
            c, b, k = centers[keep], bb[keep], kp[keep]
            boxes.append(np.stack([c[:, 0] - b[:, 0], c[:, 1] - b[:, 1], c[:, 0] + b[:, 2], c[:, 1] + b[:, 3]], 1))
            kpss.append(np.stack([c[:, [0]] + k[:, 0::2], c[:, [1]] + k[:, 1::2]], -1).reshape(-1, 5, 2))
            scores.append(sc[keep])
        if not boxes:
            return []
        boxes = np.concatenate(boxes) / scale
        kpss = np.concatenate(kpss) / scale
        scores = np.concatenate(scores)
        order = scores.argsort()[::-1]
        picked = []
        while len(order):                                        # greedy NMS
            i = order[0]
            picked.append(i)
            xx1 = np.maximum(boxes[i, 0], boxes[order[1:], 0]); yy1 = np.maximum(boxes[i, 1], boxes[order[1:], 1])
            xx2 = np.minimum(boxes[i, 2], boxes[order[1:], 2]); yy2 = np.minimum(boxes[i, 3], boxes[order[1:], 3])
            inter = np.maximum(0, xx2 - xx1) * np.maximum(0, yy2 - yy1)
            area = lambda b: (b[..., 2] - b[..., 0]) * (b[..., 3] - b[..., 1])
            iou = inter / (area(boxes[i]) + area(boxes[order[1:]]) - inter + 1e-9)
            order = order[1:][iou <= nms]
        return [{"box": boxes[i], "kps": kpss[i], "score": float(scores[i])} for i in picked]

    # ── recognition (ArcFace) ────────────────────────────────────────────────
    def embed(self, img, kps):
        tf = SimilarityTransform()
        tf.estimate(kps.astype(np.float32), ARCFACE_DST)  # noqa (deprecated in skimage 0.26, still works)
        aligned = cv2.warpAffine(img, tf.params[:2], (112, 112), borderValue=0.0)
        blob = cv2.dnn.blobFromImage(aligned, 1 / 127.5, (112, 112), (127.5, 127.5, 127.5), swapRB=True)
        v = self.rec.run(None, {self.rec_in: blob})[0][0].astype(np.float32)
        return v / (np.linalg.norm(v) + 1e-9), aligned

    def analyse(self, img):
        """Find faces, pick the main one, return its embedding + quality info."""
        faces = self.detect(img)
        for f in faces:
            b = f["box"]
            f["size"] = float(min(b[2] - b[0], b[3] - b[1]))
        faces.sort(key=lambda f: f["size"] * f["score"], reverse=True)
        out = {"face_count": len(faces), "ok": False}
        if not faces:
            out["reason"] = "no_face"
            return out
        main = faces[0]
        out["box"] = [float(x) for x in main["box"]]
        out["det_score"] = main["score"]
        out["face_px"] = main["size"]
        if main["score"] < MIN_DET_SCORE:
            out["reason"] = "low_confidence"
            return out
        if main["size"] < MIN_FACE_PX:
            out["reason"] = "too_small"
            return out
        # a second, similarly large face makes it unclear who is being scanned
        if len(faces) > 1 and faces[1]["size"] > 0.7 * main["size"] and faces[1]["score"] >= MIN_DET_SCORE:
            out["reason"] = "multiple_faces"
            return out
        x1, y1, x2, y2 = [int(max(0, v)) for v in main["box"]]
        crop = img[y1:y2, x1:x2]
        out["sharpness"] = float(cv2.Laplacian(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()) if crop.size else 0.0
        emb, _ = self.embed(img, main["kps"])
        out["embedding"] = emb
        out["ok"] = True
        return out
