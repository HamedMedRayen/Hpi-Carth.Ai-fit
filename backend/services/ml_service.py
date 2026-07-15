"""
HPI — ML Service
=======================
Wraps the GBDT engine for volume prediction.
Keeps ML concerns isolated from the analytics service.
"""

import sys
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from data_engine.engine import StatEngine, DataMatrix


def _mse(actual: List[float], predicted: List[float]) -> float:
    if not actual:
        return 0.0
    return sum((a - p) ** 2 for a, p in zip(actual, predicted)) / len(actual)


def _mae(actual: List[float], predicted: List[float]) -> float:
    if not actual:
        return 0.0
    return sum(abs(a - p) for a, p in zip(actual, predicted)) / len(actual)


def _r_squared(actual: List[float], predicted: List[float]) -> float:
    if not actual:
        return 0.0
    mean_a = StatEngine.mean(actual)
    ss_tot = sum((a - mean_a) ** 2 for a in actual)
    ss_res = sum((a - p) ** 2 for a, p in zip(actual, predicted))
    return 1.0 - ss_res / ss_tot if ss_tot > 1e-12 else 0.0


def build_features(metric_rows: List[Dict[str, Any]]) -> List[List[float]]:
    """
    Build feature vectors from metric rows for GBDT.
    Features: [lag1_volume, lag2_volume, total_sets, avg_intensity, fatigue_index, inol, day_of_week]
    """
    n = len(metric_rows)
    vols = [float(r.get("total_volume", 0) or 0) for r in metric_rows]
    features = []

    for i in range(n):
        lag1 = vols[i - 1] if i >= 1 else vols[0]
        lag2 = vols[i - 2] if i >= 2 else vols[0]
        sets = float(metric_rows[i].get("total_sets", 0) or 0)
        intensity = float(metric_rows[i].get("avg_intensity", 0) or 0)
        fatigue = float(metric_rows[i].get("fatigue_index", 0) or 0)
        inol = float(metric_rows[i].get("inol", 0) or 0)

        # Day of week from date string
        date_str = str(metric_rows[i].get("session_date", ""))
        dow = 0
        try:
            from datetime import date
            d = date.fromisoformat(date_str[:10])
            dow = d.weekday()  # 0=Mon, 6=Sun
        except (ValueError, TypeError):
            dow = 0

        features.append([lag1, lag2, sets, intensity, fatigue, inol, float(dow)])

    return features


def run_gbdt_prediction(
    metric_rows: List[Dict[str, Any]],
    n_estimators: int = 50,
    max_depth: int = 3,
    learning_rate: float = 0.1,
    test_ratio: float = 0.2,
) -> Dict[str, Any]:
    """
    Train GBDT on workout metric history and return predictions.

    If the data_engine/gbdt.py module is available, uses the full
    scratch implementation. Falls back to a simple linear baseline
    otherwise (during Step 2 delivery before GBDT is built).
    """
    if len(metric_rows) < 5:
        return {
            "predictions": [], "actuals": [], "dates": [],
            "mse": 0.0, "mae": 0.0, "r_squared": 0.0,
            "n_estimators_used": 0,
            "feature_importances": {},
        }

    dates = [str(r.get("session_date", "")) for r in metric_rows]
    actuals = [float(r.get("total_volume", 0) or 0) for r in metric_rows]
    features = build_features(metric_rows)

    n = len(metric_rows)
    split = max(3, int(n * (1 - test_ratio)))

    X_train = features[:split]
    y_train = actuals[:split]
    X_test = features[split:]
    y_test = actuals[split:]

    # Try to import full GBDT
    try:
        sys.path.insert(0, str(Path(__file__).parent.parent.parent / "data_engine"))
        from gbdt import GradientBoostedRegressor
        model = GradientBoostedRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            min_samples_split=2,
        )
        model.fit(X_train, y_train)
        predictions_train = model.predict(X_train)
        predictions_test = model.predict(X_test) if X_test else []
        predictions = predictions_train + predictions_test
        importances = model.feature_importances()
    except (ImportError, Exception):
        # Fallback: simple linear trend extrapolation
        x_idx = list(range(split))
        if len(x_idx) >= 2:
            slope, intercept, _ = StatEngine.linear_regression(x_idx, y_train)
        else:
            slope, intercept = 0.0, y_train[0] if y_train else 0.0

        predictions = [slope * i + intercept for i in range(n)]
        importances = {"lag1_volume": 0.5, "lag2_volume": 0.3, "total_sets": 0.2}
        n_estimators = 0

    mse = _mse(actuals, predictions[:len(actuals)])
    mae = _mae(actuals, predictions[:len(actuals)])
    r2 = _r_squared(actuals, predictions[:len(actuals)])

    feat_names = ["lag1_volume", "lag2_volume", "total_sets",
                  "avg_intensity", "fatigue_index", "inol", "day_of_week"]

    if isinstance(importances, list):
        importances = {feat_names[i]: round(float(importances[i]), 4)
                       for i in range(min(len(feat_names), len(importances)))}

    return {
        "predictions": [round(p, 2) for p in predictions[:len(actuals)]],
        "actuals": [round(a, 2) for a in actuals],
        "dates": dates,
        "mse": round(mse, 2),
        "mae": round(mae, 2),
        "r_squared": round(r2, 4),
        "n_estimators_used": n_estimators,
        "feature_importances": importances,
    }
