"""SageMaker script-mode training for spam classifier."""
import argparse
import json
import os

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


def load_data(path: str):
    for enc in ("utf-8", "latin-1", "iso-8859-1"):
        try:
            df = pd.read_csv(path, encoding=enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError(f"Could not decode {path}")

    df = df.loc[:, ~df.columns.str.contains(r"^Unnamed")]
    cols = {c.lower(): c for c in df.columns}
    label_col = next(
        (cols[k] for k in ("label", "category", "v1") if k in cols),
        df.columns[0],
    )
    text_col = next(
        (cols[k] for k in ("text", "message", "v2") if k in cols),
        df.columns[1],
    )
    y = (
        df[label_col]
        .astype(str)
        .str.lower()
        .str.strip()
        .map(lambda v: 1 if v in {"spam", "1", "true", "yes"} else 0)
    )
    X = df[text_col].astype(str)
    return X, y


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", type=str, default=os.environ.get("SM_MODEL_DIR"))
    parser.add_argument("--train", type=str, default=os.environ.get("SM_CHANNEL_TRAIN"))
    args = parser.parse_args()

    csv_path = args.train
    if os.path.isdir(csv_path):
        files = [f for f in os.listdir(csv_path) if f.endswith(".csv")]
        if not files:
            raise FileNotFoundError(f"No CSV in {csv_path}")
        csv_path = os.path.join(csv_path, files[0])

    X, y = load_data(csv_path)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    stop_words="english",
                    ngram_range=(1, 2),
                    min_df=2,
                    max_features=20000,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=1000,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)

    metrics = {
        "accuracy": float(accuracy_score(y_test, pred)),
        "f1_spam": float(f1_score(y_test, pred)),
    }
    print("metrics:", metrics)

    os.makedirs(args.model_dir, exist_ok=True)
    joblib.dump(pipe, os.path.join(args.model_dir, "model.joblib"))
    with open(os.path.join(args.model_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f)
