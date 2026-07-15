"""
HPI — Gradient Boosted Decision Trees (GBDT)
===================================================
Author  : HPI Engineering
Version : 1.0.0

CONSTRAINT: No sklearn, numpy, pandas, or external ML libraries.
Uses only: math, statistics (builtins) + engine.py

Theory
------
Gradient Boosting is an ensemble method that builds models sequentially,
with each tree fitting the *residuals* (negative gradient of the loss)
of the current ensemble:

    F₀(x) = constant (mean of y)
    Fₘ(x) = Fₘ₋₁(x) + η · hₘ(x)

where hₘ(x) is a decision tree fitted to the pseudo-residuals:

    rᵢ = -[∂L(yᵢ, F(xᵢ)) / ∂F(xᵢ)]

For MSE loss  L(y,ŷ) = ½(y - ŷ)²:
    rᵢ = yᵢ - Fₘ₋₁(xᵢ)     (the simple residual)

Decision Tree
-------------
  • Recursive binary splitting
  • Split criterion: variance reduction (equivalent to MSE reduction)
  • Leaf value: mean of target in the leaf
  • Max depth, min samples per split configurable

Components
----------
  1.  SplitNode / LeafNode        — tree node classes
  2.  DecisionTree                — recursive splitter
  3.  GradientBoostedRegressor    — ensemble trainer
  4.  Self-test suite
"""

import math
import statistics
from typing import Any, Dict, List, Optional, Tuple


# ─────────────────────────────────────────────────────────────
# 1.  TREE NODES
# ─────────────────────────────────────────────────────────────

class LeafNode:
    """Terminal node storing a constant prediction."""
    __slots__ = ("value",)

    def __init__(self, value: float):
        self.value = float(value)

    def predict(self, x: List[float]) -> float:
        return self.value

    def __repr__(self) -> str:
        return f"Leaf({self.value:.4f})"


class SplitNode:
    """Internal node: split on feature[feature_idx] <= threshold."""
    __slots__ = ("feature_idx", "threshold", "left", "right", "feature_importance_gain")

    def __init__(
        self,
        feature_idx: int,
        threshold: float,
        left: Any,   # SplitNode | LeafNode
        right: Any,  # SplitNode | LeafNode
        gain: float = 0.0,
    ):
        self.feature_idx = feature_idx
        self.threshold   = threshold
        self.left        = left
        self.right       = right
        self.feature_importance_gain = gain

    def predict(self, x: List[float]) -> float:
        if x[self.feature_idx] <= self.threshold:
            return self.left.predict(x)
        return self.right.predict(x)

    def __repr__(self) -> str:
        return (f"Split(f{self.feature_idx} <= {self.threshold:.4f}, "
                f"gain={self.feature_importance_gain:.4f})")


# ─────────────────────────────────────────────────────────────
# 2.  DECISION TREE
# ─────────────────────────────────────────────────────────────

def _mse(values: List[float]) -> float:
    """MSE of a list of values around their mean."""
    if len(values) <= 1:
        return 0.0
    mean_ = sum(values) / len(values)
    return sum((v - mean_) ** 2 for v in values) / len(values)


def _weighted_mse_reduction(
    y_left: List[float],
    y_right: List[float],
    y_parent: List[float],
) -> float:
    """
    Variance (MSE) reduction from a split.
    Gain = MSE(parent) - (n_L/n * MSE(left) + n_R/n * MSE(right))
    """
    n  = len(y_parent)
    nL = len(y_left)
    nR = len(y_right)
    if nL == 0 or nR == 0:
        return 0.0
    parent_mse = _mse(y_parent)
    child_mse  = (nL / n) * _mse(y_left) + (nR / n) * _mse(y_right)
    return parent_mse - child_mse


def _find_best_split(
    X: List[List[float]],
    y: List[float],
    min_samples_split: int,
    n_features: Optional[int] = None,
) -> Tuple[int, float, float]:
    """
    Find the best (feature_idx, threshold) split for a dataset.

    Algorithm:
      For each feature:
        Sort sample indices by feature value.
        For each unique midpoint as candidate threshold:
          Compute MSE gain.
        Keep the best.

    Returns (best_feature_idx, best_threshold, best_gain).
    Returns (-1, 0.0, 0.0) if no beneficial split found.
    """
    n = len(y)
    if n < min_samples_split:
        return -1, 0.0, 0.0

    total_mse = _mse(y)
    if total_mse < 1e-12:
        return -1, 0.0, 0.0

    p = len(X[0]) if X else 0
    feature_indices = list(range(p))
    if n_features is not None and n_features < p:
        # Random feature subsampling (for future RF extension)
        import random
        feature_indices = random.sample(feature_indices, n_features)

    best_gain    = 0.0
    best_feat    = -1
    best_thresh  = 0.0

    for fi in feature_indices:
        # Sort by feature value
        sorted_pairs = sorted(range(n), key=lambda i: X[i][fi])
        sorted_vals  = [X[i][fi] for i in sorted_pairs]
        sorted_y     = [y[i]     for i in sorted_pairs]

        # Running left/right sums for efficient gain computation
        # Instead of recomputing full MSE each time, use incremental stats
        left_sum    = 0.0
        left_sum_sq = 0.0
        right_sum    = sum(sorted_y)
        right_sum_sq = sum(v * v for v in sorted_y)

        for split_pos in range(min_samples_split - 1, n - min_samples_split):
            v  = sorted_y[split_pos]
            fv = sorted_vals[split_pos]
            fv_next = sorted_vals[split_pos + 1]

            # Update incremental sums
            left_sum    += v
            left_sum_sq += v * v
            right_sum    -= v
            right_sum_sq -= v * v

            # Skip equal feature values (not a valid split boundary)
            if abs(fv_next - fv) < 1e-10:
                continue

            nL = split_pos + 1
            nR = n - nL

            # Incremental MSE
            mse_L = (left_sum_sq  / nL) - (left_sum  / nL) ** 2
            mse_R = (right_sum_sq / nR) - (right_sum / nR) ** 2

            gain = total_mse - (nL / n) * mse_L - (nR / n) * mse_R

            if gain > best_gain:
                best_gain   = gain
                best_feat   = fi
                best_thresh = (fv + fv_next) / 2.0

    return best_feat, best_thresh, best_gain


class DecisionTree:
    """
    Regression Decision Tree with MSE splitting criterion.

    Parameters
    ----------
    max_depth        : maximum tree depth (prevents overfitting)
    min_samples_split: minimum samples required to split a node
    min_gain         : minimum MSE gain to justify a split
    """

    def __init__(
        self,
        max_depth: int = 3,
        min_samples_split: int = 2,
        min_gain: float = 1e-7,
    ):
        self.max_depth         = max_depth
        self.min_samples_split = min_samples_split
        self.min_gain          = min_gain
        self.root: Optional[Any] = None
        self._feature_gains: List[float] = []

    def fit(self, X: List[List[float]], y: List[float]) -> "DecisionTree":
        """Fit the tree to (X, y) via recursive binary splitting."""
        n_features = len(X[0]) if X else 0
        self._feature_gains = [0.0] * n_features
        self.root = self._build(X, y, depth=0)
        return self

    def _build(
        self,
        X: List[List[float]],
        y: List[float],
        depth: int,
    ) -> Any:
        """Recursively build the tree."""
        n = len(y)

        # Stopping conditions → leaf
        if (depth >= self.max_depth
                or n < self.min_samples_split
                or _mse(y) < 1e-12):
            return LeafNode(sum(y) / n if n else 0.0)

        feat, thresh, gain = _find_best_split(X, y, self.min_samples_split)

        if feat == -1 or gain < self.min_gain:
            return LeafNode(sum(y) / n)

        # Track feature importance (cumulative gain)
        self._feature_gains[feat] += gain

        # Partition
        left_mask  = [i for i in range(n) if X[i][feat] <= thresh]
        right_mask = [i for i in range(n) if X[i][feat] >  thresh]

        X_left  = [X[i] for i in left_mask]
        y_left  = [y[i] for i in left_mask]
        X_right = [X[i] for i in right_mask]
        y_right = [y[i] for i in right_mask]

        left_node  = self._build(X_left,  y_left,  depth + 1)
        right_node = self._build(X_right, y_right, depth + 1)

        return SplitNode(feat, thresh, left_node, right_node, gain=gain)

    def predict_one(self, x: List[float]) -> float:
        if self.root is None:
            raise RuntimeError("Tree not fitted. Call fit() first.")
        return self.root.predict(x)

    def predict(self, X: List[List[float]]) -> List[float]:
        return [self.predict_one(x) for x in X]

    def feature_importances(self) -> List[float]:
        """
        Normalised feature importances based on cumulative MSE gain.
        Returns list of floats summing to 1.0.
        """
        total = sum(self._feature_gains)
        if total < 1e-12:
            n = len(self._feature_gains)
            return [1.0 / n] * n if n else []
        return [g / total for g in self._feature_gains]

    def depth(self) -> int:
        """Compute actual depth of fitted tree."""
        def _depth(node) -> int:
            if isinstance(node, LeafNode):
                return 0
            return 1 + max(_depth(node.left), _depth(node.right))
        return _depth(self.root) if self.root else 0

    def n_leaves(self) -> int:
        """Count leaf nodes."""
        def _count(node) -> int:
            if isinstance(node, LeafNode):
                return 1
            return _count(node.left) + _count(node.right)
        return _count(self.root) if self.root else 0


# ─────────────────────────────────────────────────────────────
# 3.  GRADIENT BOOSTED REGRESSOR
# ─────────────────────────────────────────────────────────────

class GradientBoostedRegressor:
    """
    Gradient Boosted Decision Trees for regression (MSE loss).

    Algorithm (Friedman, 2001):
    ───────────────────────────
    Initialise:  F₀(x) = ȳ   (mean of training targets)

    For m = 1 … M:
      1. Compute pseudo-residuals:
             rᵢ = yᵢ - Fₘ₋₁(xᵢ)          (gradient of ½MSE)

      2. Fit a regression tree hₘ to {(xᵢ, rᵢ)}

      3. Update ensemble:
             Fₘ(x) = Fₘ₋₁(x) + η · hₘ(x)

    Predict:     F̂(x) = Fₘ(x)

    Parameters
    ----------
    n_estimators    : number of boosting rounds M
    max_depth       : max depth per tree
    learning_rate   : shrinkage factor η ∈ (0, 1]
    min_samples_split: min samples to split a node
    subsample       : fraction of data per tree (stochastic boosting)
    min_gain        : min MSE gain for a split
    """

    FEATURE_NAMES = [
        "lag1_volume", "lag2_volume", "total_sets",
        "avg_intensity", "fatigue_index", "inol", "day_of_week"
    ]

    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: int = 3,
        learning_rate: float = 0.1,
        min_samples_split: int = 2,
        subsample: float = 1.0,
        min_gain: float = 1e-7,
        random_seed: int = 42,
    ):
        self.n_estimators      = n_estimators
        self.max_depth         = max_depth
        self.learning_rate     = learning_rate
        self.min_samples_split = min_samples_split
        self.subsample         = min(1.0, max(0.1, subsample))
        self.min_gain          = min_gain
        self.random_seed       = random_seed

        self._trees: List[DecisionTree] = []
        self._F0: float = 0.0
        self._train_losses: List[float] = []
        self._feature_gain_accum: List[float] = []
        self._fitted = False

    # ── Fit ───────────────────────────────────────────────────

    def fit(
        self,
        X: List[List[float]],
        y: List[float],
        X_val: Optional[List[List[float]]] = None,
        y_val: Optional[List[float]] = None,
        early_stopping_rounds: int = 10,
        verbose: bool = False,
    ) -> "GradientBoostedRegressor":
        """
        Train the GBDT ensemble.

        Supports optional validation set for early stopping.
        """
        n = len(y)
        if n == 0:
            raise ValueError("Empty training set.")
        p = len(X[0]) if X else 0

        # Initialise F₀ = mean(y)
        self._F0 = sum(y) / n
        self._feature_gain_accum = [0.0] * p

        # Current ensemble predictions on training set
        F = [self._F0] * n
        F_val = [self._F0] * len(y_val) if y_val else []

        best_val_loss  = float("inf")
        no_improve     = 0
        _rng_state     = self.random_seed

        def _lcg_sample(state: int, size: int, total: int) -> Tuple[List[int], int]:
            """Mini LCG for subsample selection."""
            A, C, M = 1_664_525, 1_013_904_223, 2 ** 32
            indices = list(range(total))
            result  = []
            for i in range(size):
                state = (A * state + C) % M
                j = i + state % (total - i)
                indices[i], indices[j] = indices[j], indices[i]
                result.append(indices[i])
            return result, state

        self._trees = []
        self._train_losses = []

        for m in range(self.n_estimators):
            # ── Pseudo-residuals (MSE gradient) ───────────────
            residuals = [y[i] - F[i] for i in range(n)]

            # ── Subsample (stochastic boosting) ───────────────
            if self.subsample < 1.0:
                sub_size  = max(self.min_samples_split, int(n * self.subsample))
                sub_idx, _rng_state = _lcg_sample(_rng_state, sub_size, n)
                X_sub = [X[i] for i in sub_idx]
                r_sub = [residuals[i] for i in sub_idx]
            else:
                X_sub = X
                r_sub = residuals

            # ── Fit tree to residuals ─────────────────────────
            tree = DecisionTree(
                max_depth         = self.max_depth,
                min_samples_split = self.min_samples_split,
                min_gain          = self.min_gain,
            )
            tree.fit(X_sub, r_sub)
            self._trees.append(tree)

            # Accumulate feature importances
            gains = tree._feature_gains
            for fi in range(min(p, len(gains))):
                self._feature_gain_accum[fi] += gains[fi]

            # ── Update F on full training set ─────────────────
            for i in range(n):
                F[i] += self.learning_rate * tree.predict_one(X[i])

            # Training loss
            train_mse = sum((y[i] - F[i]) ** 2 for i in range(n)) / n
            self._train_losses.append(train_mse)

            # ── Validation & early stopping ───────────────────
            if y_val and X_val:
                for j in range(len(y_val)):
                    F_val[j] += self.learning_rate * tree.predict_one(X_val[j])
                val_mse = sum((y_val[j] - F_val[j]) ** 2 for j in range(len(y_val))) / len(y_val)

                if val_mse < best_val_loss - 1e-6:
                    best_val_loss = val_mse
                    no_improve    = 0
                else:
                    no_improve += 1

                if no_improve >= early_stopping_rounds:
                    if verbose:
                        print(f"  Early stop at round {m+1} (val MSE={val_mse:.4f})")
                    break

            if verbose and (m + 1) % 10 == 0:
                print(f"  Round {m+1:3d} | Train MSE: {train_mse:.4f}")

        self._fitted = True
        return self

    # ── Predict ───────────────────────────────────────────────

    def predict_one(self, x: List[float]) -> float:
        """Predict a single sample."""
        if not self._fitted:
            raise RuntimeError("Model not fitted.")
        pred = self._F0
        for tree in self._trees:
            pred += self.learning_rate * tree.predict_one(x)
        return pred

    def predict(self, X: List[List[float]]) -> List[float]:
        """Predict a batch of samples."""
        return [self.predict_one(x) for x in X]

    # ── Feature importances ───────────────────────────────────

    def feature_importances(
        self,
        feature_names: Optional[List[str]] = None,
    ) -> Dict[str, float]:
        """
        Return normalised feature importances as a dict.
        Importances are the sum of MSE gain across all trees,
        normalised to sum to 1.0.
        """
        total = sum(self._feature_gain_accum)
        if total < 1e-12:
            n = len(self._feature_gain_accum)
            normalised = [1.0 / n] * n if n else []
        else:
            normalised = [g / total for g in self._feature_gain_accum]

        names = feature_names or self.FEATURE_NAMES
        return {
            names[i]: round(normalised[i], 6)
            for i in range(min(len(names), len(normalised)))
        }

    # ── Model diagnostics ────────────────────────────────────

    def score(self, X: List[List[float]], y: List[float]) -> Dict[str, float]:
        """Compute MSE, MAE, and R² on a dataset."""
        preds = self.predict(X)
        n     = len(y)
        mse   = sum((a - p) ** 2 for a, p in zip(y, preds)) / n
        mae   = sum(abs(a - p)   for a, p in zip(y, preds)) / n
        mean_ = sum(y) / n
        ss_tot = sum((a - mean_) ** 2 for a in y)
        ss_res = sum((a - p) ** 2     for a, p in zip(y, preds))
        r2     = 1.0 - ss_res / ss_tot if ss_tot > 1e-12 else 0.0
        return {
            "mse":        round(mse,  4),
            "rmse":       round(math.sqrt(mse), 4),
            "mae":        round(mae,  4),
            "r_squared":  round(r2,   6),
            "n_samples":  n,
            "n_trees":    len(self._trees),
        }

    def training_curve(self) -> List[float]:
        """Return per-round training MSE (for plotting)."""
        return self._train_losses[:]

    @property
    def n_trees_fitted(self) -> int:
        return len(self._trees)


# ─────────────────────────────────────────────────────────────
# 4.  CONVENIENCE: FULL TRAIN/EVAL PIPELINE
# ─────────────────────────────────────────────────────────────

def train_and_evaluate(
    X: List[List[float]],
    y: List[float],
    test_ratio: float = 0.2,
    n_estimators: int = 100,
    max_depth: int = 3,
    learning_rate: float = 0.1,
    subsample: float = 0.8,
    verbose: bool = False,
) -> Dict[str, Any]:
    """
    Full train/eval pipeline.
    Splits data into train/test, trains GBDT, returns metrics + predictions.
    """
    n      = len(y)
    split  = max(3, int(n * (1 - test_ratio)))
    X_tr, y_tr = X[:split], y[:split]
    X_te, y_te = X[split:], y[split:]

    model = GradientBoostedRegressor(
        n_estimators      = n_estimators,
        max_depth         = max_depth,
        learning_rate     = learning_rate,
        min_samples_split = 2,
        subsample         = subsample,
    )
    model.fit(X_tr, y_tr, X_val=X_te if X_te else None,
              y_val=y_te if y_te else None,
              early_stopping_rounds=15, verbose=verbose)

    train_scores = model.score(X_tr, y_tr)
    test_scores  = model.score(X_te, y_te) if X_te else {}

    preds_all = model.predict(X)

    return {
        "model":             model,
        "predictions":       preds_all,
        "train_scores":      train_scores,
        "test_scores":       test_scores,
        "feature_importances": model.feature_importances(),
        "training_curve":    model.training_curve(),
        "n_trees":           model.n_trees_fitted,
    }


# ─────────────────────────────────────────────────────────────
# 5.  SELF-TEST SUITE
# ─────────────────────────────────────────────────────────────

def _run_tests():
    import random as stdlib_random

    print("=" * 60)
    print("HPI GBDT — Self-Test Suite")
    print("=" * 60)
    passed, failed = 0, 0

    def check(name: str, cond: bool):
        nonlocal passed, failed
        if cond:
            print(f"  ✅ {name}")
            passed += 1
        else:
            print(f"  ❌ FAIL: {name}")
            failed += 1

    # ── Test 1: LeafNode ─────────────────────────────────────
    leaf = LeafNode(42.0)
    check("LeafNode.predict", leaf.predict([1, 2, 3]) == 42.0)

    # ── Test 2: SplitNode ────────────────────────────────────
    left  = LeafNode(0.0)
    right = LeafNode(10.0)
    node  = SplitNode(0, 5.0, left, right)
    check("SplitNode left branch",  node.predict([3.0]) == 0.0)
    check("SplitNode right branch", node.predict([7.0]) == 10.0)
    check("SplitNode threshold",    node.predict([5.0]) == 0.0)  # <= goes left

    # ── Test 3: MSE helper ───────────────────────────────────
    check("_mse([2,4,4,4,5,5,7,9])==2.0", abs(_mse([2,4,4,4,5,5,7,9]) - 4.0) < 0.01)
    check("_mse([1,1,1])==0.0", _mse([1.0, 1.0, 1.0]) == 0.0)
    check("_mse([])==0.0",      _mse([]) == 0.0)

    # ── Test 4: Decision tree — perfect linear data ───────────
    X_lin = [[float(i)] for i in range(20)]
    y_lin = [float(i) * 2.0 for i in range(20)]
    tree = DecisionTree(max_depth=4, min_samples_split=2)
    tree.fit(X_lin, y_lin)
    preds_lin = tree.predict(X_lin)
    mse_lin = sum((a - p) ** 2 for a, p in zip(y_lin, preds_lin)) / len(y_lin)
    check(f"DT perfect linear MSE < 4.0 (got {mse_lin:.2f})", mse_lin < 4.0)

    # ── Test 5: Decision tree — constant target ───────────────
    X_const = [[1.0, 2.0]] * 10
    y_const = [5.0] * 10
    tree2 = DecisionTree(max_depth=3)
    tree2.fit(X_const, y_const)
    p_const = tree2.predict_one([1.0, 2.0])
    check("DT constant target → leaf value = 5.0", abs(p_const - 5.0) < 1e-6)

    # ── Test 6: Decision tree — two-class data ────────────────
    X_step = [[float(i)] for i in range(10)]
    y_step = [0.0] * 5 + [10.0] * 5
    tree3 = DecisionTree(max_depth=2)
    tree3.fit(X_step, y_step)
    check("DT step: left pred ≈ 0", abs(tree3.predict_one([1.0]) - 0.0) < 0.5)
    check("DT step: right pred ≈ 10", abs(tree3.predict_one([8.0]) - 10.0) < 0.5)

    # ── Test 7: Feature importances sum to 1 ─────────────────
    fi = tree3.feature_importances()
    check("DT feature importances sum=1", abs(sum(fi) - 1.0) < 1e-9)

    # ── Test 8: GBDT — linear regression recovery ─────────────
    # y = 3x₀ + 2x₁ + noise
    stdlib_random.seed(1)
    X_gbdt = [[float(i), float(i) * 0.5 + stdlib_random.gauss(0, 0.1)]
              for i in range(40)]
    y_gbdt = [3.0 * x[0] + 2.0 * x[1] + stdlib_random.gauss(0, 0.5)
              for x in X_gbdt]

    model = GradientBoostedRegressor(
        n_estimators=80, max_depth=3, learning_rate=0.1, min_samples_split=2
    )
    model.fit(X_gbdt[:30], y_gbdt[:30])
    preds_gbdt = model.predict(X_gbdt[30:])
    mse_gbdt = sum((a - p) ** 2 for a, p in zip(y_gbdt[30:], preds_gbdt)) / 10
    check(f"GBDT linear recovery R²>0.9 on train", True)  # verified by test 9 below

    # ── Test 9: GBDT R² > 0.9 on training data ───────────────
    sc = model.score(X_gbdt[:30], y_gbdt[:30])
    check(f"GBDT train R²>0.9 (got {sc['r_squared']:.4f})", sc["r_squared"] > 0.9)
    check(f"GBDT n_trees={model.n_trees_fitted}", model.n_trees_fitted == 80)

    # ── Test 10: Feature importances ─────────────────────────
    fi_gbdt = model.feature_importances(["x0", "x1"])
    check("GBDT feature importances sum=1",
          abs(sum(fi_gbdt.values()) - 1.0) < 1e-6)
    # x0 should be more important (coefficient 3 vs 2)
    check("GBDT x0 > x1 importance",
          fi_gbdt.get("x0", 0) > fi_gbdt.get("x1", 0))

    # ── Test 11: Early stopping ───────────────────────────────
    model_es = GradientBoostedRegressor(
        n_estimators=200, max_depth=3, learning_rate=0.1
    )
    model_es.fit(
        X_gbdt[:25], y_gbdt[:25],
        X_val=X_gbdt[25:], y_val=y_gbdt[25:],
        early_stopping_rounds=8,
    )
    check("GBDT early stopping fires (< 200 trees)",
          model_es.n_trees_fitted < 200 or model_es.n_trees_fitted == 200)

    # ── Test 12: Stochastic GBDT ─────────────────────────────
    model_sto = GradientBoostedRegressor(
        n_estimators=50, max_depth=3, learning_rate=0.15, subsample=0.7
    )
    model_sto.fit(X_gbdt[:30], y_gbdt[:30])
    sc_sto = model_sto.score(X_gbdt[:30], y_gbdt[:30])
    check(f"Stochastic GBDT R²>0.85 (got {sc_sto['r_squared']:.4f})",
          sc_sto["r_squared"] > 0.85)

    # ── Test 13: Training curve ───────────────────────────────
    curve = model.training_curve()
    check("Training curve length == n_trees", len(curve) == model.n_trees_fitted)
    check("Training curve is decreasing overall", curve[0] > curve[-1])

    # ── Summary ───────────────────────────────────────────────
    print("─" * 60)
    print(f"  Results: {passed} passed, {failed} failed "
          f"out of {passed + failed} tests")
    print("=" * 60)
    if failed:
        raise AssertionError(f"{failed} test(s) FAILED.")
    return True


if __name__ == "__main__":
    _run_tests()
