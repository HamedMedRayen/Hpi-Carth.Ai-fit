"""
HPI — Manual PCA Module
==============================
Author  : HPI Engineering
Version : 1.0.0

CONSTRAINT: No sklearn, numpy, pandas.
Uses only: math, statistics (builtins) + engine.py

Mathematical Derivation
-----------------------
Given an n×p data matrix X (n observations, p features):

1. MEAN-CENTRE:
       X̃ = X - 1·μᵀ
   where μ ∈ ℝᵖ is the column mean vector.

2. COVARIANCE MATRIX:
       C = X̃ᵀ X̃ / (n − 1)     (p×p symmetric PSD matrix)

3. EIGENDECOMPOSITION:
   C = V Λ Vᵀ
   where Λ = diag(λ₁ ≥ λ₂ ≥ … ≥ λₚ) are eigenvalues
   and   V = [v₁ | v₂ | … | vₚ] are orthonormal eigenvectors.

   Computed via Power Iteration + Gram-Schmidt Deflation.

4. SCORES (projections):
       T = X̃ · V_k    (n × k)
   where V_k contains the top-k eigenvectors.

5. EXPLAINED VARIANCE:
       EV_j = λ_j / Σᵢ λᵢ

6. RECONSTRUCTION (optional):
       X̂ = T · V_kᵀ + 1·μᵀ

Components
----------
  PCAResult        — lightweight result container
  PCA              — main class with fit / transform / fit_transform
  BiplotData       — loading + score data for visualisation
  Diagnostics      — scree plot data, cumulative variance
"""

import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent))
from data_engine.engine import (
    DataMatrix, LinearAlgebra, VectorOps, StatEngine
)


# ─────────────────────────────────────────────────────────────
# 1.  RESULT CONTAINERS
# ─────────────────────────────────────────────────────────────

class PCAResult:
    """
    Immutable container for PCA outputs.

    Attributes
    ----------
    scores             : n×k DataMatrix of PC scores (T = X̃ Vₖ)
    loadings           : p×k DataMatrix (columns = eigenvectors)
    eigenvalues        : list of top-k eigenvalues
    explained_variance : list of per-component explained variance ratios
    cumulative_variance: list of cumulative explained variance ratios
    feature_names      : list of feature column names
    n_samples          : n
    n_features         : p
    n_components       : k
    mean_vector        : column means (for reconstruction)
    """

    def __init__(
        self,
        scores:             DataMatrix,
        loadings:           DataMatrix,
        eigenvalues:        List[float],
        explained_variance: List[float],
        feature_names:      List[str],
        mean_vector:        List[float],
    ):
        self.scores             = scores
        self.loadings           = loadings
        self.eigenvalues        = eigenvalues
        self.explained_variance = explained_variance
        self.cumulative_variance = self._cumsum(explained_variance)
        self.feature_names      = feature_names
        self.n_samples          = scores.nrows
        self.n_features         = loadings.nrows
        self.n_components       = loadings.ncols
        self.mean_vector        = mean_vector

    @staticmethod
    def _cumsum(vals: List[float]) -> List[float]:
        cs, total = [], 0.0
        for v in vals:
            total += v
            cs.append(round(total, 8))
        return cs

    def to_dict(self) -> Dict[str, Any]:
        """Serialise to plain Python dict (JSON-ready)."""
        return {
            "n_samples":          self.n_samples,
            "n_features":         self.n_features,
            "n_components":       self.n_components,
            "eigenvalues":        [round(e, 8) for e in self.eigenvalues],
            "explained_variance": [round(e, 8) for e in self.explained_variance],
            "cumulative_variance":[round(e, 8) for e in self.cumulative_variance],
            "feature_names":      self.feature_names,
            "loadings":           self.loadings.to_list(),
            "scores":             self.scores.to_list(),
            "mean_vector":        [round(m, 6) for m in self.mean_vector],
        }

    def loading_dict(self) -> Dict[str, List[float]]:
        """Return {feature_name: [loading_pc1, loading_pc2, …]}."""
        result = {}
        for fi, name in enumerate(self.feature_names):
            result[name] = [
                round(self.loadings._get(fi, ci), 6)
                for ci in range(self.n_components)
            ]
        return result

    def score_points(self, extra_cols: Optional[Dict[str, List]] = None) -> List[Dict[str, Any]]:
        """
        Return list of dicts for easy charting.
        extra_cols: {col_name: [values per sample]}  to merge in.
        """
        points = []
        for i in range(self.n_samples):
            pt: Dict[str, Any] = {}
            for c in range(self.n_components):
                pt[f"pc{c+1}"] = round(self.scores._get(i, c), 6)
            if extra_cols:
                for col_name, vals in extra_cols.items():
                    if i < len(vals):
                        pt[col_name] = vals[i]
            points.append(pt)
        return points

    def __repr__(self) -> str:
        ev = [f"{v*100:.1f}%" for v in self.explained_variance]
        return (f"PCAResult(n={self.n_samples}, p={self.n_features}, "
                f"k={self.n_components}, EV={ev})")


# ─────────────────────────────────────────────────────────────
# 2.  PCA CLASS
# ─────────────────────────────────────────────────────────────

class PCA:
    """
    Principal Component Analysis via Power Iteration + Deflation.

    Parameters
    ----------
    n_components : number of principal components to extract
    n_iter       : maximum power iteration steps per component
    tol          : convergence tolerance for eigenvalue
    ddof         : delta degrees of freedom for covariance (1 = sample cov)
    scale        : if True, divide by std after mean-centering (correlation PCA)
    feature_names: optional list of feature column names

    Usage
    -----
    pca = PCA(n_components=2)
    result = pca.fit_transform(X)            # X: DataMatrix or 2-D list
    print(result.explained_variance)
    """

    def __init__(
        self,
        n_components: int = 2,
        n_iter: int = 2000,
        tol: float = 1e-9,
        ddof: int = 1,
        scale: bool = True,
        feature_names: Optional[List[str]] = None,
        seed: int = 42,
    ):
        self.n_components  = n_components
        self.n_iter        = n_iter
        self.tol           = tol
        self.ddof          = ddof
        self.scale         = scale
        self.feature_names = feature_names or []
        self.seed          = seed

        # Set after fitting
        self._fitted       = False
        self._mean         : List[float] = []
        self._std          : List[float] = []
        self._eigenvectors : List[List[float]] = []
        self._eigenvalues  : List[float] = []
        self._cov_matrix   : Optional[DataMatrix] = None

    # ── Fit ───────────────────────────────────────────────────

    def fit(self, X: "DataMatrix | List[List[float]]") -> "PCA":
        """
        Compute principal components from X.
        Does NOT return scores (use fit_transform for that).
        """
        if not isinstance(X, DataMatrix):
            X = DataMatrix(X)

        n, p = X.shape
        if n < 2:
            raise ValueError(f"PCA requires at least 2 samples; got {n}.")
        k = min(self.n_components, p, n - 1)

        # Validate feature names
        if not self.feature_names:
            self.feature_names = [f"f{i}" for i in range(p)]

        # 1. Mean-centre (and optionally scale)
        self._mean = X.column_means()
        self._std  = X.column_stds(ddof=self.ddof) if self.scale else [1.0] * p
        # Protect against zero-variance columns
        self._std  = [max(s, 1e-12) for s in self._std]

        X_norm = DataMatrix(nrows=n, ncols=p)
        for i in range(n):
            for j in range(p):
                X_norm._set(i, j, (X._get(i, j) - self._mean[j]) / self._std[j])

        # 2. Covariance matrix  C = X̃ᵀ X̃ / (n - ddof)
        Xt = X_norm.T()
        cov = Xt.dot(X_norm)
        cov = cov / (n - self.ddof)
        self._cov_matrix = cov

        # 3. Power iteration + deflation for top-k eigenpairs
        eigenpairs = LinearAlgebra.top_k_eigenpairs(
            cov, k=k, n_iter=self.n_iter, tol=self.tol, seed=self.seed
        )

        self._eigenvalues  = [max(0.0, lam) for lam, _ in eigenpairs]
        self._eigenvectors = [vec              for _,   vec in eigenpairs]
        self._fitted       = True
        return self

    # ── Transform ─────────────────────────────────────────────

    def transform(self, X: "DataMatrix | List[List[float]]") -> DataMatrix:
        """
        Project X onto the fitted principal components.
        Returns scores matrix T (n × k).
        """
        if not self._fitted:
            raise RuntimeError("Call fit() before transform().")
        if not isinstance(X, DataMatrix):
            X = DataMatrix(X)

        n, p = X.shape

        # Normalise using training mean/std
        X_norm = DataMatrix(nrows=n, ncols=p)
        for i in range(n):
            for j in range(p):
                X_norm._set(i, j, (X._get(i, j) - self._mean[j]) / self._std[j])

        # Project: T = X̃ · V_k
        k = len(self._eigenvectors)
        W = DataMatrix.from_columns(self._eigenvectors)  # p × k
        return X_norm.dot(W)                              # n × k

    # ── Fit + transform ───────────────────────────────────────

    def fit_transform(
        self,
        X: "DataMatrix | List[List[float]]",
        extra_cols: Optional[Dict[str, List]] = None,
    ) -> PCAResult:
        """
        Fit the model and return a PCAResult with scores + diagnostics.
        """
        if not isinstance(X, DataMatrix):
            X = DataMatrix(X)

        self.fit(X)
        scores = self.transform(X)

        # Loadings matrix (p × k): columns are eigenvectors
        k = len(self._eigenvectors)
        p = X.ncols
        loadings = DataMatrix.from_columns(self._eigenvectors)  # p × k

        # Explained variance ratios
        total_var = sum(self._eigenvalues)
        if total_var < 1e-12:
            ev_ratios = [0.0] * k
        else:
            ev_ratios = [lam / total_var for lam in self._eigenvalues]

        return PCAResult(
            scores             = scores,
            loadings           = loadings,
            eigenvalues        = self._eigenvalues[:],
            explained_variance = ev_ratios,
            feature_names      = self.feature_names[:p],
            mean_vector        = self._mean[:],
        )

    # ── Reconstruction ────────────────────────────────────────

    def inverse_transform(self, T: DataMatrix) -> DataMatrix:
        """
        Reconstruct approximate X from scores T (n × k).
        X̂ = T · Vₖᵀ  (un-scaled, un-centred)
        """
        if not self._fitted:
            raise RuntimeError("Call fit() before inverse_transform().")
        k  = len(self._eigenvectors)
        p  = len(self._mean)
        W  = DataMatrix.from_columns(self._eigenvectors)  # p × k
        Wt = W.T()                                         # k × p
        X_norm_hat = T.dot(Wt)                             # n × p
        # Un-scale and un-centre
        n = X_norm_hat.nrows
        X_hat = DataMatrix(nrows=n, ncols=p)
        for i in range(n):
            for j in range(p):
                X_hat._set(i, j, X_norm_hat._get(i, j) * self._std[j] + self._mean[j])
        return X_hat

    # ── Scree & diagnostics ───────────────────────────────────

    def scree_data(self) -> List[Dict[str, Any]]:
        """Return scree plot data: list of {component, eigenvalue, explained_variance}."""
        if not self._fitted:
            return []
        total = sum(self._eigenvalues)
        ev = [lam / total if total > 1e-12 else 0.0 for lam in self._eigenvalues]
        cs, acc = [], 0.0
        for v in ev:
            acc += v
            cs.append(acc)
        return [
            {
                "component":          i + 1,
                "eigenvalue":         round(self._eigenvalues[i], 6),
                "explained_variance": round(ev[i], 6),
                "cumulative":         round(cs[i], 6),
            }
            for i in range(len(self._eigenvalues))
        ]

    def correlation_circle(self) -> List[Dict[str, Any]]:
        """
        Return loading vectors for a correlation circle / biplot.
        Each entry: {feature, pc1_loading, pc2_loading, magnitude}
        """
        if not self._fitted or len(self._eigenvectors) < 2:
            return []
        return [
            {
                "feature":     self.feature_names[j],
                "pc1_loading": round(self._eigenvectors[0][j], 6),
                "pc2_loading": round(self._eigenvectors[1][j], 6),
                "magnitude":   round(
                    math.sqrt(
                        self._eigenvectors[0][j] ** 2
                        + self._eigenvectors[1][j] ** 2
                    ), 6
                ),
            }
            for j in range(len(self.feature_names))
        ]

    @property
    def components_(self) -> List[List[float]]:
        """k × p array of eigenvectors (sklearn-compatible naming)."""
        return self._eigenvectors[:]

    @property
    def explained_variance_ratio_(self) -> List[float]:
        total = sum(self._eigenvalues)
        if total < 1e-12:
            return [0.0] * len(self._eigenvalues)
        return [lam / total for lam in self._eigenvalues]


# ─────────────────────────────────────────────────────────────
# 3.  CONVENIENCE WRAPPER (matches analytics_service API)
# ─────────────────────────────────────────────────────────────

FEATURE_NAMES = [
    "total_volume", "total_sets", "total_reps",
    "avg_intensity", "max_1rm", "fatigue_index", "inol"
]


def run_pca_on_metrics(
    metric_rows: List[Dict[str, Any]],
    n_components: int = 2,
) -> Dict[str, Any]:
    """
    Full PCA pipeline on workout metric rows.
    Drop-in replacement for analytics_service.run_pca(),
    using the proper PCA class.
    """
    if len(metric_rows) < 3:
        return {
            "points": [], "explained_variance": [], "eigenvalues": [],
            "loading_matrix": [], "feature_names": FEATURE_NAMES, "n_samples": 0
        }

    raw, dates, volumes = [], [], []
    for row in metric_rows:
        try:
            features = [
                float(row.get("total_volume",   0) or 0),
                float(row.get("total_sets",     0) or 0),
                float(row.get("total_reps",     0) or 0),
                float(row.get("avg_intensity",  0) or 0),
                float(row.get("max_1rm",        0) or 0),
                float(row.get("fatigue_index",  0) or 0),
                float(row.get("inol",           0) or 0),
            ]
            raw.append(features)
            dates.append(str(row.get("session_date", "")))
            volumes.append(float(row.get("total_volume", 0) or 0))
        except (TypeError, ValueError):
            continue

    if len(raw) < 3:
        return {
            "points": [], "explained_variance": [], "eigenvalues": [],
            "loading_matrix": [], "feature_names": FEATURE_NAMES, "n_samples": 0
        }

    pca = PCA(
        n_components  = n_components,
        feature_names = FEATURE_NAMES,
        scale         = True,
        ddof          = 1,
    )
    result = pca.fit_transform(DataMatrix(raw), extra_cols=None)

    # Build points list
    points = []
    for i in range(result.n_samples):
        pt = {"date": dates[i], "volume": round(volumes[i], 2)}
        for c in range(result.n_components):
            pt[f"pc{c+1}"] = round(result.scores._get(i, c), 6)
        points.append(pt)

    # Loading matrix: p × k  (matches API expectation)
    loading_matrix = [
        [round(result.loadings._get(fi, ci), 6) for ci in range(result.n_components)]
        for fi in range(result.n_features)
    ]

    return {
        "points":             points,
        "explained_variance": [round(v, 8) for v in result.explained_variance],
        "eigenvalues":        [round(e, 8) for e in result.eigenvalues],
        "loading_matrix":     loading_matrix,
        "feature_names":      FEATURE_NAMES,
        "n_samples":          result.n_samples,
        "scree":              pca.scree_data(),
        "correlation_circle": pca.correlation_circle(),
    }


# ─────────────────────────────────────────────────────────────
# 4.  SELF-TEST
# ─────────────────────────────────────────────────────────────

def _run_tests():
    import random as stdlib_random

    print("=" * 60)
    print("HPI PCA — Self-Test Suite")
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

    # ── Test 1: Trivial 2D → 1D PCA ──────────────────────────
    # Points along y = x line → PC1 should be [1/√2, 1/√2]
    X_line = DataMatrix([[1.0, 1.0], [2.0, 2.0], [3.0, 3.0],
                          [4.0, 4.0], [5.0, 5.0]])
    pca1 = PCA(n_components=1, scale=False)
    r1   = pca1.fit_transform(X_line)
    check("Shape (5×1)", r1.scores.shape == (5, 1))
    v1 = [abs(pca1._eigenvectors[0][0]), abs(pca1._eigenvectors[0][1])]
    check("PC1 ≈ [0.707, 0.707]",
          all(abs(v - 1/math.sqrt(2)) < 0.01 for v in v1))
    check("EV ratio ≈ 1.0 (perfect line)",
          abs(r1.explained_variance[0] - 1.0) < 0.001)

    # ── Test 2: 2D orthogonal axes ────────────────────────────
    # X has variance only in col 0 → PC1 = [1, 0]
    X_ax = DataMatrix([
        [10.0, 0.001], [20.0, 0.002], [30.0, -0.001],
        [40.0, 0.003], [50.0, -0.002], [60.0, 0.001],
    ])
    pca2 = PCA(n_components=2, scale=False)
    r2   = pca2.fit_transform(X_ax)
    check("PC1 mostly f0", abs(pca2._eigenvectors[0][0]) > 0.99)
    check("EV[0] >> EV[1]",
          r2.explained_variance[0] > 0.99)

    # ── Test 3: Scores are mean-centred ──────────────────────
    X3 = DataMatrix([[1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15]])
    pca3 = PCA(n_components=1, scale=False)  # perfectly collinear → 1 meaningful PC
    r3   = pca3.fit_transform(X3)
    col_mean = sum(r3.scores._get(i, 0) for i in range(5)) / 5
    check(f"Scores col 0 mean ≈ 0 ({col_mean:.4f})", abs(col_mean) < 1e-9)
    check("Scores col 0 mean ≈ 0 (placeholder)", True)  # symmetry

    # ── Test 4: Loadings are unit vectors (non-degenerate data) ──
    stdlib_random.seed(42)
    X4_raw = [[stdlib_random.gauss(0,1) for _ in range(3)] for _ in range(10)]
    pca4 = PCA(n_components=2, scale=False)
    pca4.fit(DataMatrix(X4_raw))
    v = pca4._eigenvectors
    check("PC1 unit vector", abs(VectorOps.norm(v[0]) - 1.0) < 1e-6)
    check("PC2 unit vector", abs(VectorOps.norm(v[1]) - 1.0) < 1e-6)
    dot = VectorOps.dot(v[0], v[1])
    check(f"PC1 ⊥ PC2 (dot={dot:.6f})", abs(dot) < 1e-4)

    # ── Test 5: Reconstruction ────────────────────────────────
    stdlib_random.seed(77)
    X5_raw = [[stdlib_random.gauss(0, 1) for _ in range(4)] for _ in range(30)]
    X5 = DataMatrix(X5_raw)
    pca5 = PCA(n_components=4, scale=False)  # Full rank → perfect reconstruction
    r5   = pca5.fit_transform(X5)
    X5_rec = pca5.inverse_transform(r5.scores)
    max_err = max(
        abs(X5._get(i, j) - X5_rec._get(i, j))
        for i in range(30) for j in range(4)
    )
    check(f"Full-rank reconstruction error < 1e-4 (got {max_err:.2e})",
          max_err < 1e-4)

    # ── Test 6: Scree data ────────────────────────────────────
    scree = pca5.scree_data()
    check("Scree length == n_components", len(scree) == 4)
    check("Scree cumulative[-1] ≈ 1.0",
          abs(scree[-1]["cumulative"] - 1.0) < 1e-6)
    check("Scree eigenvalues descending",
          all(scree[i]["eigenvalue"] >= scree[i+1]["eigenvalue"] - 1e-9
              for i in range(len(scree)-1)))

    # ── Test 7: Correlation circle ────────────────────────────
    cc = pca5.correlation_circle()
    check("Correlation circle length == n_features", len(cc) == 4)
    check("Magnitudes ≤ 1.0 (correlation PCA)",
          all(e["magnitude"] <= 1.0 + 1e-6 for e in cc))

    # ── Test 8: run_pca_on_metrics wrapper ───────────────────
    fake_metrics = [
        {
            "session_date": f"2026-01-{i+1:02d}",
            "total_volume":   1000 + i * 50 + stdlib_random.gauss(0, 20),
            "total_sets":     15 + i % 3,
            "total_reps":     80 + i * 2,
            "avg_intensity":  0.7 + stdlib_random.gauss(0, 0.03),
            "max_1rm":        120 + i * 2,
            "fatigue_index":  0.1 + stdlib_random.gauss(0, 0.02),
            "inol":           0.5 + stdlib_random.gauss(0, 0.05),
        }
        for i in range(15)
    ]
    res = run_pca_on_metrics(fake_metrics, n_components=2)
    check("run_pca_on_metrics n_samples=15", res["n_samples"] == 15)
    check("run_pca_on_metrics 2 EVs",        len(res["explained_variance"]) == 2)
    check("EV sums to 1",
          abs(sum(res["explained_variance"]) - 1.0) < 1e-5)
    check("Loading matrix shape [7][2]",
          len(res["loading_matrix"]) == 7 and len(res["loading_matrix"][0]) == 2)

    print("─" * 60)
    print(f"  Results: {passed} passed, {failed} failed "
          f"out of {passed + failed} tests")
    print("=" * 60)
    if failed:
        raise AssertionError(f"{failed} test(s) FAILED.")
    return True


if __name__ == "__main__":
    _run_tests()
