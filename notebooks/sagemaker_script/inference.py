"""SageMaker real-time / batch inference for spam classifier."""
from __future__ import annotations

import json
import os
from typing import Any

import joblib
import numpy as np


def model_fn(model_dir: str):
    """Load model created by train.py / notebook packaging."""
    path = os.path.join(model_dir, "model.joblib")
    if not os.path.exists(path):
        # fallback if packed as spam_model.joblib
        alt = os.path.join(model_dir, "spam_model.joblib")
        path = alt if os.path.exists(alt) else path
    return joblib.load(path)


def input_fn(request_body: str | bytes, content_type: str = "application/json"):
    """
    Accepts:
      - application/json: {"texts": ["...", "..."]} or ["...", "..."]
      - text/csv: one message per line
      - text/plain: single message
    """
    if isinstance(request_body, bytes):
        request_body = request_body.decode("utf-8")

    ct = (content_type or "application/json").split(";")[0].strip().lower()

    if ct == "application/json":
        payload = json.loads(request_body)
        if isinstance(payload, dict):
            if "texts" in payload:
                texts = payload["texts"]
            elif "text" in payload:
                texts = [payload["text"]]
            else:
                raise ValueError("JSON must include 'texts' (list) or 'text' (string)")
        elif isinstance(payload, list):
            texts = payload
        elif isinstance(payload, str):
            texts = [payload]
        else:
            raise ValueError(f"Unsupported JSON payload type: {type(payload)}")
        return [str(t) for t in texts]

    if ct in ("text/csv", "text/plain"):
        lines = [ln.strip() for ln in request_body.splitlines() if ln.strip()]
        return lines

    raise ValueError(f"Unsupported content type: {content_type}")


def predict_fn(input_data: list[str], model) -> list[dict[str, Any]]:
    """Return spam probability + label for each text."""
    probs = model.predict_proba(input_data)[:, 1]
    preds = (probs >= 0.5).astype(int)
    results = []
    for text, prob, pred in zip(input_data, probs, preds):
        results.append(
            {
                "text": text,
                "spam_probability": float(np.round(prob, 4)),
                "prediction": "spam" if int(pred) == 1 else "ham",
            }
        )
    return results


def output_fn(prediction: list[dict[str, Any]], accept: str = "application/json"):
    accept = (accept or "application/json").split(";")[0].strip().lower()
    if accept in ("application/json", "*/*"):
        return json.dumps({"results": prediction}), "application/json"
    raise ValueError(f"Unsupported accept type: {accept}")
