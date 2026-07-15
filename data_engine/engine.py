"""
HPI — Custom Data Science Engine
=======================================
Author  : HPI Engineering
Version : 1.0.0

CONSTRAINT: Zero external math/data libraries.
Uses ONLY: math, statistics, random (Python builtins).

Contents
--------
1.  Exceptions
2.  DataMatrix         — Core n-dimensional matrix class
    2a. Construction & validation
    2b. Indexing & slicing
    2c. Arithmetic operators
    2d. Matrix operations  (dot, transpose, inverse, det)
    2e. Statistical ops    (mean, std, var, normalize, center)
    2f. I/O helpers
3.  VectorOps          — Standalone vector utilities
4.  StatEngine         — Descriptive & inferential statistics
5.  MathUtils          — General mathematical utilities
6.  DistanceMetrics    — Euclidean, Manhattan, Cosine, etc.
7.  LinearAlgebra      — Gram-Schmidt, QR, eigen helpers
8.  Activation funcs   — Sigmoid, ReLU, Softmax (for future NN use)
"""

import math
import statistics
import random
import copy
from typing import List, Union, Tuple, Optional, Callable, Iterator


# ─────────────────────────────────────────────────────────────────────────────
# 1. EXCEPTIONS
# ─────────────────────────────────────────────────────────────────────────────

class DimensionError(Exception):
    """Raised when matrix dimensions are incompatible for an operation."""


class SingularMatrixError(Exception):
    """Raised when a matrix is singular (non-invertible)."""


class ConvergenceError(Exception):
    """Raised when an iterative algorithm fails to converge."""


class IndexError(Exception):
    """Raised for invalid matrix indices."""


# ─────────────────────────────────────────────────────────────────────────────
# 2. DATAMATRIX
# ─────────────────────────────────────────────────────────────────────────────

Number = Union[int, float]


class DataMatrix:
    """
    A pure-Python n×m matrix with full linear-algebra support.

    Storage
    -------
    Internal data is a flat list of floats stored in **row-major** order.
    Element at row i, col j is at index  i * ncols + j.

    Examples
    --------
    >>> m = DataMatrix([[1, 2], [3, 4]])
    >>> m.shape
    (2, 2)
    >>> m[0, 1]
    2.0
    >>> m[:, 0]          # first column as DataMatrix (2×1)
    DataMatrix([[1.0], [3.0]])
    """

    # ── 2a. Construction & validation ────────────────────────────────────────

    def __init__(
        self,
        data: Union[List[List[Number]], List[Number], "DataMatrix", None] = None,
        nrows: int = 0,
        ncols: int = 0,
        fill: float = 0.0,
    ):
        """
        Build a DataMatrix from:
          • 2-D list   → DataMatrix([[1,2],[3,4]])
          • 1-D list   → treated as column vector (n×1)
          • DataMatrix → deep copy
          • shape args → DataMatrix(nrows=3, ncols=3) filled with `fill`
        """
        if data is None:
            # shape-only construction
            if nrows <= 0 or ncols <= 0:
                raise ValueError("nrows and ncols must be positive integers.")
            self._nrows = nrows
            self._ncols = ncols
            self._data: List[float] = [float(fill)] * (nrows * ncols)
            return

        if isinstance(data, DataMatrix):
            self._nrows = data._nrows
            self._ncols = data._ncols
            self._data = data._data[:]
            return

        if isinstance(data, list):
            if len(data) == 0:
                self._nrows = 0
                self._ncols = 0
                self._data = []
                return
            # 1-D list → column vector
            if not isinstance(data[0], (list, tuple)):
                self._nrows = len(data)
                self._ncols = 1
                self._data = [float(v) for v in data]
                return
            # 2-D list
            self._nrows = len(data)
            self._ncols = len(data[0])
            for i, row in enumerate(data):
                if len(row) != self._ncols:
                    raise DimensionError(
                        f"Row {i} has {len(row)} elements; expected {self._ncols}."
                    )
            self._data = [float(v) for row in data for v in row]
            return

        raise TypeError(f"Cannot build DataMatrix from type {type(data).__name__}.")

    # ── Class methods (alternative constructors) ──────────────────────────────

    @classmethod
    def zeros(cls, nrows: int, ncols: int) -> "DataMatrix":
        return cls(nrows=nrows, ncols=ncols, fill=0.0)

    @classmethod
    def ones(cls, nrows: int, ncols: int) -> "DataMatrix":
        return cls(nrows=nrows, ncols=ncols, fill=1.0)

    @classmethod
    def identity(cls, n: int) -> "DataMatrix":
        m = cls.zeros(n, n)
        for i in range(n):
            m._set(i, i, 1.0)
        return m

    @classmethod
    def from_flat(cls, flat: List[float], nrows: int, ncols: int) -> "DataMatrix":
        """Build from flat row-major list."""
        if len(flat) != nrows * ncols:
            raise DimensionError(
                f"Flat list length {len(flat)} ≠ {nrows}×{ncols}={nrows*ncols}."
            )
        m = cls(nrows=nrows, ncols=ncols)
        m._data = [float(v) for v in flat]
        return m

    @classmethod
    def from_columns(cls, cols: List[List[float]]) -> "DataMatrix":
        """Build from list of column vectors."""
        if not cols:
            return cls(nrows=0, ncols=0)
        nrows = len(cols[0])
        ncols = len(cols)
        m = cls(nrows=nrows, ncols=ncols)
        for j, col in enumerate(cols):
            for i, v in enumerate(col):
                m._set(i, j, v)
        return m

    @classmethod
    def from_rows(cls, rows: List[List[float]]) -> "DataMatrix":
        return cls(rows)

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def shape(self) -> Tuple[int, int]:
        return (self._nrows, self._ncols)

    @property
    def nrows(self) -> int:
        return self._nrows

    @property
    def ncols(self) -> int:
        return self._ncols

    @property
    def size(self) -> int:
        return self._nrows * self._ncols

    def is_square(self) -> bool:
        return self._nrows == self._ncols

    def is_vector(self) -> bool:
        return self._ncols == 1 or self._nrows == 1

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _idx(self, i: int, j: int) -> int:
        """Flat index for (row i, col j)."""
        return i * self._ncols + j

    def _get(self, i: int, j: int) -> float:
        return self._data[self._idx(i, j)]

    def _set(self, i: int, j: int, v: float) -> None:
        self._data[self._idx(i, j)] = float(v)

    def _resolve_index(self, key, size: int) -> Union[int, range]:
        """Resolve int / slice to int or range of valid indices."""
        if isinstance(key, int):
            if key < 0:
                key = size + key
            if not (0 <= key < size):
                raise IndexError(f"Index {key} out of bounds for size {size}.")
            return key
        if isinstance(key, slice):
            return range(*key.indices(size))
        raise TypeError(f"Invalid index type: {type(key).__name__}.")

    # ── 2b. Indexing & slicing ────────────────────────────────────────────────

    def __getitem__(self, key):
        """
        Supports:
          m[i, j]          → float
          m[i, :]          → DataMatrix (1 × ncols)
          m[:, j]          → DataMatrix (nrows × 1)
          m[r1:r2, c1:c2]  → DataMatrix sub-block
          m[i]             → DataMatrix (1 × ncols)  (row shorthand)
        """
        # Single integer → row shorthand
        if isinstance(key, int):
            r = self._resolve_index(key, self._nrows)
            row = [self._get(r, j) for j in range(self._ncols)]
            return DataMatrix([row])

        if not isinstance(key, tuple) or len(key) != 2:
            raise TypeError("DataMatrix requires [row, col] indexing.")

        ri, ci = key
        row_idx = self._resolve_index(ri, self._nrows)
        col_idx = self._resolve_index(ci, self._ncols)

        # Both scalars → single float
        if isinstance(row_idx, int) and isinstance(col_idx, int):
            return self._get(row_idx, col_idx)

        # Build row and col ranges
        rows = [row_idx] if isinstance(row_idx, int) else list(row_idx)
        cols = [col_idx] if isinstance(col_idx, int) else list(col_idx)

        result = [[self._get(r, c) for c in cols] for r in rows]
        return DataMatrix(result)

    def __setitem__(self, key, value):
        """Supports m[i, j] = v and m[i, :] = [v, ...]."""
        if isinstance(key, int):
            # row shorthand
            r = self._resolve_index(key, self._nrows)
            if isinstance(value, (list, tuple)):
                for j, v in enumerate(value):
                    self._set(r, j, v)
            else:
                for j in range(self._ncols):
                    self._set(r, j, float(value))
            return

        if not isinstance(key, tuple) or len(key) != 2:
            raise TypeError("DataMatrix requires [row, col] indexing.")

        ri, ci = key
        row_idx = self._resolve_index(ri, self._nrows)
        col_idx = self._resolve_index(ci, self._ncols)

        rows = [row_idx] if isinstance(row_idx, int) else list(row_idx)
        cols = [col_idx] if isinstance(col_idx, int) else list(col_idx)

        if isinstance(value, DataMatrix):
            for i, r in enumerate(rows):
                for j, c in enumerate(cols):
                    self._set(r, c, value._get(i, j))
        elif isinstance(value, (list, tuple)):
            if isinstance(value[0], (list, tuple)):
                for i, r in enumerate(rows):
                    for j, c in enumerate(cols):
                        self._set(r, c, float(value[i][j]))
            else:
                if len(rows) == 1:
                    for j, c in enumerate(cols):
                        self._set(rows[0], c, float(value[j]))
                else:
                    for i, r in enumerate(rows):
                        self._set(r, cols[0], float(value[i]))
        else:
            for r in rows:
                for c in cols:
                    self._set(r, c, float(value))

    def row(self, i: int) -> List[float]:
        """Return row i as plain Python list."""
        i = self._resolve_index(i, self._nrows)
        return [self._get(i, j) for j in range(self._ncols)]

    def col(self, j: int) -> List[float]:
        """Return column j as plain Python list."""
        j = self._resolve_index(j, self._ncols)
        return [self._get(i, j) for i in range(self._nrows)]

    def rows(self) -> Iterator[List[float]]:
        """Iterate over rows as plain Python lists."""
        for i in range(self._nrows):
            yield self.row(i)

    def cols(self) -> Iterator[List[float]]:
        """Iterate over columns as plain Python lists."""
        for j in range(self._ncols):
            yield self.col(j)

    def to_list(self) -> List[List[float]]:
        """Convert to 2-D Python list."""
        return [self.row(i) for i in range(self._nrows)]

    def to_flat(self) -> List[float]:
        """Return flat row-major list."""
        return self._data[:]

    def flatten(self) -> "DataMatrix":
        """Return as 1×(n*m) row vector."""
        return DataMatrix([self._data[:]])

    def copy(self) -> "DataMatrix":
        return DataMatrix(self)

    # ── 2c. Arithmetic operators ──────────────────────────────────────────────

    def __repr__(self) -> str:
        rows = []
        for i in range(min(self._nrows, 6)):
            row_str = "  [" + ", ".join(f"{self._get(i,j):10.4f}" for j in range(self._ncols)) + "]"
            rows.append(row_str)
        if self._nrows > 6:
            rows.append(f"  ... ({self._nrows - 6} more rows)")
        inner = "\n".join(rows)
        return f"DataMatrix({self._nrows}×{self._ncols})[\n{inner}\n]"

    def __len__(self) -> int:
        return self._nrows

    def __iter__(self):
        """Iterate over rows as DataMatrix objects."""
        for i in range(self._nrows):
            yield DataMatrix([self.row(i)])

    def __eq__(self, other: "DataMatrix") -> bool:
        if not isinstance(other, DataMatrix):
            return False
        if self.shape != other.shape:
            return False
        tol = 1e-9
        return all(abs(a - b) < tol for a, b in zip(self._data, other._data))

    def __add__(self, other: Union["DataMatrix", Number]) -> "DataMatrix":
        if isinstance(other, (int, float)):
            result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
            result._data = [v + other for v in self._data]
            return result
        if isinstance(other, DataMatrix):
            if self.shape != other.shape:
                raise DimensionError(
                    f"Cannot add {self.shape} and {other.shape}."
                )
            result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
            result._data = [a + b for a, b in zip(self._data, other._data)]
            return result
        return NotImplemented

    def __radd__(self, other: Number) -> "DataMatrix":
        return self.__add__(other)

    def __sub__(self, other: Union["DataMatrix", Number]) -> "DataMatrix":
        if isinstance(other, (int, float)):
            return self.__add__(-other)
        if isinstance(other, DataMatrix):
            if self.shape != other.shape:
                raise DimensionError(
                    f"Cannot subtract {self.shape} and {other.shape}."
                )
            result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
            result._data = [a - b for a, b in zip(self._data, other._data)]
            return result
        return NotImplemented

    def __rsub__(self, other: Number) -> "DataMatrix":
        result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
        result._data = [other - v for v in self._data]
        return result

    def __mul__(self, other: Union["DataMatrix", Number]) -> "DataMatrix":
        """Element-wise multiplication (Hadamard) or scalar multiply."""
        if isinstance(other, (int, float)):
            result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
            result._data = [v * other for v in self._data]
            return result
        if isinstance(other, DataMatrix):
            # Hadamard product
            if self.shape != other.shape:
                raise DimensionError(
                    f"Element-wise multiply requires same shape: "
                    f"{self.shape} vs {other.shape}. Use .dot() for matrix multiply."
                )
            result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
            result._data = [a * b for a, b in zip(self._data, other._data)]
            return result
        return NotImplemented

    def __rmul__(self, other: Number) -> "DataMatrix":
        return self.__mul__(other)

    def __truediv__(self, other: Union["DataMatrix", Number]) -> "DataMatrix":
        if isinstance(other, (int, float)):
            if other == 0:
                raise ZeroDivisionError("Cannot divide DataMatrix by zero.")
            result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
            result._data = [v / other for v in self._data]
            return result
        if isinstance(other, DataMatrix):
            if self.shape != other.shape:
                raise DimensionError("Element-wise divide requires same shape.")
            result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
            result._data = [a / b for a, b in zip(self._data, other._data)]
            return result
        return NotImplemented

    def __neg__(self) -> "DataMatrix":
        result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
        result._data = [-v for v in self._data]
        return result

    def __pow__(self, exponent: Number) -> "DataMatrix":
        """Element-wise power."""
        result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
        result._data = [v ** exponent for v in self._data]
        return result

    def __abs__(self) -> "DataMatrix":
        result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
        result._data = [abs(v) for v in self._data]
        return result

    # ── 2d. Matrix operations ─────────────────────────────────────────────────

    def dot(self, other: "DataMatrix") -> "DataMatrix":
        """
        Matrix multiplication: self (n×k) @ other (k×m) → (n×m).

        Uses the standard triple-loop algorithm; O(n·k·m).
        For large matrices consider block-tiled variants (not implemented here
        to keep code readable per spec).
        """
        if not isinstance(other, DataMatrix):
            raise TypeError("dot() requires a DataMatrix operand.")
        if self._ncols != other._nrows:
            raise DimensionError(
                f"dot() shape mismatch: ({self._nrows}×{self._ncols}) @ "
                f"({other._nrows}×{other._ncols})."
            )
        n, k, m = self._nrows, self._ncols, other._ncols
        result = DataMatrix(nrows=n, ncols=m)
        # Precompute rows of self and cols of other for cache locality
        for i in range(n):
            for j in range(m):
                acc = 0.0
                for p in range(k):
                    acc += self._get(i, p) * other._get(p, j)
                result._set(i, j, acc)
        return result

    def T(self) -> "DataMatrix":
        """Return transpose."""
        result = DataMatrix(nrows=self._ncols, ncols=self._nrows)
        for i in range(self._nrows):
            for j in range(self._ncols):
                result._set(j, i, self._get(i, j))
        return result

    # Alias
    transpose = T

    def trace(self) -> float:
        """Sum of diagonal elements (square matrices)."""
        if not self.is_square():
            raise DimensionError("trace() requires a square matrix.")
        return sum(self._get(i, i) for i in range(self._nrows))

    def diagonal(self) -> List[float]:
        """Return diagonal elements as list."""
        n = min(self._nrows, self._ncols)
        return [self._get(i, i) for i in range(n)]

    def frobenius_norm(self) -> float:
        """Frobenius norm = sqrt(sum of squares of all elements)."""
        return math.sqrt(sum(v * v for v in self._data))

    def max_norm(self) -> float:
        """Max absolute value element."""
        return max(abs(v) for v in self._data)

    def determinant(self) -> float:
        """
        Determinant via LU decomposition with partial pivoting.
        O(n³).
        """
        if not self.is_square():
            raise DimensionError("determinant() requires a square matrix.")
        n = self._nrows
        # Work on a copy
        A = [self.row(i)[:] for i in range(n)]
        sign = 1
        for col in range(n):
            # Partial pivot
            pivot_row = max(range(col, n), key=lambda r: abs(A[r][col]))
            if abs(A[pivot_row][col]) < 1e-12:
                return 0.0  # singular
            if pivot_row != col:
                A[col], A[pivot_row] = A[pivot_row], A[col]
                sign *= -1
            pivot = A[col][col]
            for row in range(col + 1, n):
                factor = A[row][col] / pivot
                for k in range(col, n):
                    A[row][k] -= factor * A[col][k]
        det = sign * 1.0
        for i in range(n):
            det *= A[i][i]
        return det

    def inverse(self) -> "DataMatrix":
        """
        Matrix inverse via Gauss-Jordan elimination with partial pivoting.
        Raises SingularMatrixError if the matrix is not invertible.
        """
        if not self.is_square():
            raise DimensionError("inverse() requires a square matrix.")
        n = self._nrows
        # Augmented matrix [A | I]
        aug = [self.row(i) + [1.0 if i == j else 0.0 for j in range(n)]
               for i in range(n)]

        for col in range(n):
            # Partial pivot
            pivot_row = max(range(col, n), key=lambda r: abs(aug[r][col]))
            if abs(aug[pivot_row][col]) < 1e-12:
                raise SingularMatrixError(
                    "Matrix is singular or nearly singular."
                )
            if pivot_row != col:
                aug[col], aug[pivot_row] = aug[pivot_row], aug[col]

            pivot = aug[col][col]
            aug[col] = [v / pivot for v in aug[col]]

            for row in range(n):
                if row == col:
                    continue
                factor = aug[row][col]
                aug[row] = [aug[row][k] - factor * aug[col][k]
                            for k in range(2 * n)]

        # Extract right half
        result = DataMatrix(nrows=n, ncols=n)
        for i in range(n):
            for j in range(n):
                result._set(i, j, aug[i][n + j])
        return result

    def solve(self, b: "DataMatrix") -> "DataMatrix":
        """
        Solve Ax = b via Gaussian elimination with back-substitution.
        A must be square; b must be (n×1).
        """
        if not self.is_square():
            raise DimensionError("solve() requires a square coefficient matrix.")
        n = self._nrows
        if b._nrows != n or b._ncols != 1:
            raise DimensionError(f"b must be ({n}×1), got {b.shape}.")

        # Augmented [A | b]
        aug = [self.row(i) + [b._get(i, 0)] for i in range(n)]

        for col in range(n):
            pivot_row = max(range(col, n), key=lambda r: abs(aug[r][col]))
            if abs(aug[pivot_row][col]) < 1e-12:
                raise SingularMatrixError("System has no unique solution.")
            aug[col], aug[pivot_row] = aug[pivot_row], aug[col]
            pivot = aug[col][col]
            aug[col] = [v / pivot for v in aug[col]]
            for row in range(n):
                if row == col:
                    continue
                factor = aug[row][col]
                aug[row] = [aug[row][k] - factor * aug[col][k]
                            for k in range(n + 1)]

        result = DataMatrix(nrows=n, ncols=1)
        for i in range(n):
            result._set(i, 0, aug[i][n])
        return result

    def hstack(self, other: "DataMatrix") -> "DataMatrix":
        """Horizontal concatenation (same number of rows)."""
        if self._nrows != other._nrows:
            raise DimensionError(
                f"hstack requires same nrows: {self._nrows} vs {other._nrows}."
            )
        result = DataMatrix(nrows=self._nrows, ncols=self._ncols + other._ncols)
        for i in range(self._nrows):
            for j in range(self._ncols):
                result._set(i, j, self._get(i, j))
            for j in range(other._ncols):
                result._set(i, self._ncols + j, other._get(i, j))
        return result

    def vstack(self, other: "DataMatrix") -> "DataMatrix":
        """Vertical concatenation (same number of columns)."""
        if self._ncols != other._ncols:
            raise DimensionError(
                f"vstack requires same ncols: {self._ncols} vs {other._ncols}."
            )
        result = DataMatrix(nrows=self._nrows + other._nrows, ncols=self._ncols)
        for i in range(self._nrows):
            for j in range(self._ncols):
                result._set(i, j, self._get(i, j))
        for i in range(other._nrows):
            for j in range(other._ncols):
                result._set(self._nrows + i, j, other._get(i, j))
        return result

    def apply(self, func: Callable[[float], float]) -> "DataMatrix":
        """Element-wise application of a scalar function."""
        result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
        result._data = [func(v) for v in self._data]
        return result

    def map_rows(self, func: Callable[[List[float]], List[float]]) -> "DataMatrix":
        """Apply a function to each row and return a new DataMatrix."""
        new_rows = [func(self.row(i)) for i in range(self._nrows)]
        return DataMatrix(new_rows)

    def sum_all(self) -> float:
        """Sum of all elements."""
        return sum(self._data)

    def sum_rows(self) -> "DataMatrix":
        """Return (nrows×1) column vector of row sums."""
        result = DataMatrix(nrows=self._nrows, ncols=1)
        for i in range(self._nrows):
            result._set(i, 0, sum(self.row(i)))
        return result

    def sum_cols(self) -> "DataMatrix":
        """Return (1×ncols) row vector of column sums."""
        result = DataMatrix(nrows=1, ncols=self._ncols)
        for j in range(self._ncols):
            result._set(0, j, sum(self.col(j)))
        return result

    # ── 2e. Statistical operations ────────────────────────────────────────────

    def column_means(self) -> List[float]:
        """Return list of per-column means."""
        return [statistics.mean(self.col(j)) for j in range(self._ncols)]

    def column_stds(self, ddof: int = 0) -> List[float]:
        """
        Per-column standard deviations.
        ddof=0 → population std; ddof=1 → sample std.
        """
        stds = []
        for j in range(self._ncols):
            col = self.col(j)
            mean_ = statistics.mean(col)
            n = len(col)
            variance = sum((v - mean_) ** 2 for v in col) / (n - ddof)
            stds.append(math.sqrt(variance))
        return stds

    def column_vars(self, ddof: int = 0) -> List[float]:
        """Per-column variances."""
        vars_ = []
        for j in range(self._ncols):
            col = self.col(j)
            mean_ = statistics.mean(col)
            n = len(col)
            vars_.append(sum((v - mean_) ** 2 for v in col) / (n - ddof))
        return vars_

    def mean_center(self) -> "DataMatrix":
        """
        Mean-center each column (subtract column mean).
        Returns a new DataMatrix.
        """
        means = self.column_means()
        result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
        for i in range(self._nrows):
            for j in range(self._ncols):
                result._set(i, j, self._get(i, j) - means[j])
        return result

    def normalize(self, ddof: int = 0) -> "DataMatrix":
        """
        Z-score normalize each column: (x - mean) / std.
        Columns with zero std are left as-is (all zeros after centering).
        Returns a new DataMatrix.
        """
        means = self.column_means()
        stds = self.column_stds(ddof=ddof)
        result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
        for i in range(self._nrows):
            for j in range(self._ncols):
                if stds[j] < 1e-12:
                    result._set(i, j, 0.0)
                else:
                    result._set(i, j, (self._get(i, j) - means[j]) / stds[j])
        return result

    def min_max_scale(self, feature_range: Tuple[float, float] = (0.0, 1.0)) -> "DataMatrix":
        """
        Scale each column to [lo, hi] range.
        Columns with zero range are set to lo.
        """
        lo, hi = feature_range
        result = DataMatrix(nrows=self._nrows, ncols=self._ncols)
        for j in range(self._ncols):
            col = self.col(j)
            cmin, cmax = min(col), max(col)
            rng = cmax - cmin
            for i in range(self._nrows):
                if rng < 1e-12:
                    result._set(i, j, lo)
                else:
                    result._set(i, j, lo + (self._get(i, j) - cmin) / rng * (hi - lo))
        return result

    def covariance_matrix(self, ddof: int = 1) -> "DataMatrix":
        """
        Compute the (p×p) covariance matrix of the n×p DataMatrix.

        cov[i,j] = (1/(n-ddof)) * Σ (x_i - μ_i)(x_j - μ_j)

        Steps:
          1. Mean-center the data
          2. C = X_centered^T @ X_centered / (n - ddof)
        """
        n, p = self._nrows, self._ncols
        if n <= ddof:
            raise ValueError(f"Need at least {ddof+1} samples; got {n}.")
        X = self.mean_center()
        # C = X^T @ X / (n - ddof)
        cov = X.T().dot(X)
        cov = cov / (n - ddof)
        return cov

    def correlation_matrix(self) -> "DataMatrix":
        """
        Pearson correlation matrix from the covariance matrix.
        corr[i,j] = cov[i,j] / (std_i * std_j)
        """
        cov = self.covariance_matrix()
        stds = [math.sqrt(cov._get(i, i)) for i in range(cov._nrows)]
        result = DataMatrix(nrows=cov._nrows, ncols=cov._ncols)
        for i in range(cov._nrows):
            for j in range(cov._ncols):
                denom = stds[i] * stds[j]
                if denom < 1e-12:
                    result._set(i, j, 0.0)
                else:
                    result._set(i, j, cov._get(i, j) / denom)
        return result

    def row_percentile(self, q: float) -> List[float]:
        """
        Compute the q-th percentile (0-100) of each column.
        Uses linear interpolation between adjacent values.
        """
        result = []
        for j in range(self._ncols):
            col = sorted(self.col(j))
            n = len(col)
            pos = (q / 100.0) * (n - 1)
            lo_idx = int(pos)
            hi_idx = min(lo_idx + 1, n - 1)
            frac = pos - lo_idx
            result.append(col[lo_idx] * (1.0 - frac) + col[hi_idx] * frac)
        return result

    # ── 2f. I/O helpers ───────────────────────────────────────────────────────

    def to_csv_lines(self, header: Optional[List[str]] = None) -> List[str]:
        """Render matrix to CSV text lines (for file writing)."""
        lines = []
        if header:
            lines.append(",".join(header))
        for i in range(self._nrows):
            lines.append(",".join(str(self._get(i, j)) for j in range(self._ncols)))
        return lines

    @classmethod
    def from_csv_lines(
        cls,
        lines: List[str],
        has_header: bool = False,
        delimiter: str = ",",
    ) -> "DataMatrix":
        """Parse CSV lines into a DataMatrix."""
        start = 1 if has_header else 0
        rows = []
        for line in lines[start:]:
            line = line.strip()
            if not line:
                continue
            parts = line.split(delimiter)
            try:
                row = [float(p.strip().strip('"')) for p in parts]
                rows.append(row)
            except ValueError:
                continue  # skip non-numeric rows
        return cls(rows)


# ─────────────────────────────────────────────────────────────────────────────
# 3. VECTOR OPS
# ─────────────────────────────────────────────────────────────────────────────

class VectorOps:
    """
    Utility class for operations on plain Python float lists (1-D vectors).
    Complements DataMatrix for cases where overhead of a full matrix is undesired.
    """

    @staticmethod
    def dot(a: List[float], b: List[float]) -> float:
        if len(a) != len(b):
            raise DimensionError(f"dot: length mismatch {len(a)} vs {len(b)}.")
        return sum(x * y for x, y in zip(a, b))

    @staticmethod
    def norm(v: List[float], p: float = 2.0) -> float:
        """Lp norm of vector v. Default L2 (Euclidean)."""
        if p == 2.0:
            return math.sqrt(sum(x * x for x in v))
        if p == 1.0:
            return sum(abs(x) for x in v)
        if p == float("inf"):
            return max(abs(x) for x in v)
        return sum(abs(x) ** p for x in v) ** (1.0 / p)

    @staticmethod
    def normalize(v: List[float]) -> List[float]:
        """Unit vector (L2)."""
        n = VectorOps.norm(v)
        if n < 1e-12:
            return [0.0] * len(v)
        return [x / n for x in v]

    @staticmethod
    def add(a: List[float], b: List[float]) -> List[float]:
        return [x + y for x, y in zip(a, b)]

    @staticmethod
    def sub(a: List[float], b: List[float]) -> List[float]:
        return [x - y for x, y in zip(a, b)]

    @staticmethod
    def scale(v: List[float], s: float) -> List[float]:
        return [x * s for x in v]

    @staticmethod
    def outer(a: List[float], b: List[float]) -> DataMatrix:
        """Outer product: returns DataMatrix (len(a) × len(b))."""
        result = DataMatrix(nrows=len(a), ncols=len(b))
        for i, ai in enumerate(a):
            for j, bj in enumerate(b):
                result._set(i, j, ai * bj)
        return result

    @staticmethod
    def cosine_similarity(a: List[float], b: List[float]) -> float:
        dot = VectorOps.dot(a, b)
        denom = VectorOps.norm(a) * VectorOps.norm(b)
        if denom < 1e-12:
            return 0.0
        return dot / denom

    @staticmethod
    def project(v: List[float], onto: List[float]) -> List[float]:
        """Project vector v onto vector 'onto'."""
        scale = VectorOps.dot(v, onto) / (VectorOps.dot(onto, onto) + 1e-12)
        return VectorOps.scale(onto, scale)


# ─────────────────────────────────────────────────────────────────────────────
# 4. STAT ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class StatEngine:
    """
    Descriptive and inferential statistics using only Python builtins.
    """

    @staticmethod
    def mean(data: List[float]) -> float:
        if not data:
            raise ValueError("Cannot compute mean of empty list.")
        return sum(data) / len(data)

    @staticmethod
    def median(data: List[float]) -> float:
        if not data:
            raise ValueError("Cannot compute median of empty list.")
        s = sorted(data)
        n = len(s)
        mid = n // 2
        return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2.0

    @staticmethod
    def mode(data: List[float]) -> float:
        """Return the most frequent value (first if tie)."""
        freq: dict = {}
        for v in data:
            freq[v] = freq.get(v, 0) + 1
        return max(freq, key=freq.get)

    @staticmethod
    def variance(data: List[float], ddof: int = 1) -> float:
        n = len(data)
        if n <= ddof:
            raise ValueError(f"Need > {ddof} data points.")
        m = StatEngine.mean(data)
        return sum((v - m) ** 2 for v in data) / (n - ddof)

    @staticmethod
    def std(data: List[float], ddof: int = 1) -> float:
        return math.sqrt(StatEngine.variance(data, ddof))

    @staticmethod
    def skewness(data: List[float]) -> float:
        """
        Pearson's moment coefficient of skewness (sample).
        γ₁ = E[(X-μ)³] / σ³
        """
        n = len(data)
        if n < 3:
            raise ValueError("Skewness requires at least 3 data points.")
        m = StatEngine.mean(data)
        s = StatEngine.std(data)
        if s < 1e-12:
            return 0.0
        return (sum((v - m) ** 3 for v in data) / n) / (s ** 3)

    @staticmethod
    def kurtosis(data: List[float]) -> float:
        """Excess kurtosis (Fisher's definition, kurtosis - 3)."""
        n = len(data)
        if n < 4:
            raise ValueError("Kurtosis requires at least 4 data points.")
        m = StatEngine.mean(data)
        s = StatEngine.std(data)
        if s < 1e-12:
            return 0.0
        return (sum((v - m) ** 4 for v in data) / n) / (s ** 4) - 3.0

    @staticmethod
    def percentile(data: List[float], q: float) -> float:
        """
        Compute the q-th percentile (0-100) using linear interpolation.
        """
        s = sorted(data)
        n = len(s)
        if n == 0:
            raise ValueError("Empty data.")
        pos = (q / 100.0) * (n - 1)
        lo = int(pos)
        hi = min(lo + 1, n - 1)
        frac = pos - lo
        return s[lo] * (1.0 - frac) + s[hi] * frac

    @staticmethod
    def iqr(data: List[float]) -> float:
        """Interquartile range."""
        return StatEngine.percentile(data, 75) - StatEngine.percentile(data, 25)

    @staticmethod
    def pearson_r(x: List[float], y: List[float]) -> float:
        """
        Pearson correlation coefficient.
        r = Σ(xi-x̄)(yi-ȳ) / sqrt(Σ(xi-x̄)² · Σ(yi-ȳ)²)
        """
        n = len(x)
        if n != len(y):
            raise DimensionError("x and y must have the same length.")
        mx, my = StatEngine.mean(x), StatEngine.mean(y)
        num = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y))
        den = math.sqrt(
            sum((xi - mx) ** 2 for xi in x) * sum((yi - my) ** 2 for yi in y)
        )
        return 0.0 if den < 1e-12 else num / den

    @staticmethod
    def spearman_r(x: List[float], y: List[float]) -> float:
        """
        Spearman rank correlation.
        Converts values to ranks then computes Pearson on ranks.
        """
        def rank(data: List[float]) -> List[float]:
            sorted_with_idx = sorted(enumerate(data), key=lambda t: t[1])
            ranks = [0.0] * len(data)
            i = 0
            while i < len(sorted_with_idx):
                j = i
                while j + 1 < len(sorted_with_idx) and \
                      sorted_with_idx[j + 1][1] == sorted_with_idx[i][1]:
                    j += 1
                avg_rank = (i + j) / 2.0 + 1.0
                for k in range(i, j + 1):
                    ranks[sorted_with_idx[k][0]] = avg_rank
                i = j + 1
            return ranks
        return StatEngine.pearson_r(rank(x), rank(y))

    @staticmethod
    def linear_regression(
        x: List[float], y: List[float]
    ) -> Tuple[float, float, float]:
        """
        OLS simple linear regression: y = slope*x + intercept
        Returns (slope, intercept, r²).
        """
        n = len(x)
        mx, my = StatEngine.mean(x), StatEngine.mean(y)
        ss_xx = sum((xi - mx) ** 2 for xi in x)
        ss_xy = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y))
        if abs(ss_xx) < 1e-12:
            raise ValueError("x has zero variance; regression undefined.")
        slope = ss_xy / ss_xx
        intercept = my - slope * mx
        y_pred = [slope * xi + intercept for xi in x]
        ss_res = sum((yi - yp) ** 2 for yi, yp in zip(y, y_pred))
        ss_tot = sum((yi - my) ** 2 for yi in y)
        r2 = 1.0 - ss_res / ss_tot if ss_tot > 1e-12 else 0.0
        return slope, intercept, r2

    @staticmethod
    def moving_average(data: List[float], window: int) -> List[float]:
        """Simple moving average with the given window size."""
        if window < 1:
            raise ValueError("Window must be ≥ 1.")
        result = []
        for i in range(len(data)):
            start = max(0, i - window + 1)
            result.append(sum(data[start:i + 1]) / (i - start + 1))
        return result

    @staticmethod
    def exponential_moving_average(
        data: List[float], alpha: float = 0.3
    ) -> List[float]:
        """EMA with smoothing factor α ∈ (0, 1]."""
        if not (0 < alpha <= 1):
            raise ValueError("alpha must be in (0, 1].")
        ema = [data[0]]
        for v in data[1:]:
            ema.append(alpha * v + (1.0 - alpha) * ema[-1])
        return ema

    @staticmethod
    def z_scores(data: List[float]) -> List[float]:
        """Compute z-score for each element."""
        m = StatEngine.mean(data)
        s = StatEngine.std(data)
        if s < 1e-12:
            return [0.0] * len(data)
        return [(v - m) / s for v in data]

    @staticmethod
    def outlier_iqr(data: List[float], k: float = 1.5) -> List[int]:
        """Return indices of outliers using IQR method."""
        q1 = StatEngine.percentile(data, 25)
        q3 = StatEngine.percentile(data, 75)
        iqr = q3 - q1
        lo, hi = q1 - k * iqr, q3 + k * iqr
        return [i for i, v in enumerate(data) if v < lo or v > hi]

    @staticmethod
    def histogram(
        data: List[float], bins: int = 10
    ) -> Tuple[List[float], List[int]]:
        """
        Compute histogram bin edges and counts.
        Returns (edges, counts) where len(edges) = bins+1, len(counts) = bins.
        """
        lo, hi = min(data), max(data)
        if abs(hi - lo) < 1e-12:
            return [lo, hi], [len(data)]
        width = (hi - lo) / bins
        edges = [lo + i * width for i in range(bins + 1)]
        counts = [0] * bins
        for v in data:
            idx = int((v - lo) / width)
            idx = min(idx, bins - 1)
            counts[idx] += 1
        return edges, counts

    @staticmethod
    def bootstrap_ci(
        data: List[float],
        statistic: Callable[[List[float]], float],
        n_bootstrap: int = 1000,
        confidence: float = 0.95,
        seed: int = 42,
    ) -> Tuple[float, float]:
        """
        Bootstrap confidence interval for any statistic.
        Returns (lower_bound, upper_bound).
        """
        rng = random.Random(seed)
        n = len(data)
        boot_stats = []
        for _ in range(n_bootstrap):
            sample = [data[rng.randint(0, n - 1)] for _ in range(n)]
            boot_stats.append(statistic(sample))
        boot_stats.sort()
        alpha = 1.0 - confidence
        lo_idx = int(alpha / 2 * n_bootstrap)
        hi_idx = int((1 - alpha / 2) * n_bootstrap)
        return boot_stats[lo_idx], boot_stats[hi_idx]


# ─────────────────────────────────────────────────────────────────────────────
# 5. MATH UTILS
# ─────────────────────────────────────────────────────────────────────────────

class MathUtils:
    """
    General mathematical utilities: interpolation, smoothing, series, etc.
    """

    @staticmethod
    def lerp(a: float, b: float, t: float) -> float:
        """Linear interpolation: a + t*(b-a)."""
        return a + t * (b - a)

    @staticmethod
    def clamp(v: float, lo: float, hi: float) -> float:
        return max(lo, min(hi, v))

    @staticmethod
    def log_progress(n: int, k: float = 1.0, x0: float = 0.0) -> List[float]:
        """
        Generate a logarithmic growth curve for `n` time steps.
        Models strength progression: f(t) = k * log(1 + t - x0)
        """
        return [k * math.log(1 + max(0.0, t - x0)) for t in range(n)]

    @staticmethod
    def sigmoid(x: float) -> float:
        """Numerically stable sigmoid: 1/(1+exp(-x))."""
        if x >= 0:
            z = math.exp(-x)
            return 1.0 / (1.0 + z)
        else:
            z = math.exp(x)
            return z / (1.0 + z)

    @staticmethod
    def softmax(v: List[float]) -> List[float]:
        """Numerically stable softmax."""
        max_v = max(v)
        exps = [math.exp(x - max_v) for x in v]
        total = sum(exps)
        return [e / total for e in exps]

    @staticmethod
    def relu(x: float) -> float:
        return max(0.0, x)

    @staticmethod
    def tanh(x: float) -> float:
        return math.tanh(x)

    @staticmethod
    def linear_interpolate(
        xs: List[float], ys: List[float], x_new: float
    ) -> float:
        """
        Piecewise linear interpolation.
        xs must be sorted ascending.
        """
        if x_new <= xs[0]:
            return ys[0]
        if x_new >= xs[-1]:
            return ys[-1]
        for i in range(len(xs) - 1):
            if xs[i] <= x_new <= xs[i + 1]:
                t = (x_new - xs[i]) / (xs[i + 1] - xs[i])
                return MathUtils.lerp(ys[i], ys[i + 1], t)
        return ys[-1]

    @staticmethod
    def epley_1rm(weight: float, reps: int) -> float:
        """
        Epley formula for estimated 1-Rep Max.
        1RM = weight * (1 + reps / 30)
        """
        if reps == 1:
            return float(weight)
        return weight * (1.0 + reps / 30.0)

    @staticmethod
    def brzycki_1rm(weight: float, reps: int) -> float:
        """
        Brzycki formula: 1RM = weight * 36 / (37 - reps)
        """
        if reps >= 37:
            return float(weight)  # undefined, cap it
        return weight * 36.0 / (37.0 - reps)

    @staticmethod
    def wilks_score(weight_lifted: float, bodyweight: float, sex: str = "M") -> float:
        """
        Wilks coefficient for powerlifting strength comparison.
        Coefficients from Wilks 1998 formula.
        sex: 'M' (male) or 'F' (female)
        """
        bw = bodyweight
        if sex.upper() == "M":
            a, b, c, d, e, f = -216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8
        else:
            a, b, c, d, e, f = 594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8

        coeff_denom = a + b*bw + c*bw**2 + d*bw**3 + e*bw**4 + f*bw**5
        if abs(coeff_denom) < 1e-6:
            return 0.0
        coeff = 500.0 / coeff_denom
        return weight_lifted * coeff

    @staticmethod
    def volume_load(sets: List[Tuple[float, int]]) -> float:
        """
        Total volume load = Σ (weight × reps) over all sets.
        sets: list of (weight_kg, reps) tuples.
        """
        return sum(w * r for w, r in sets)

    @staticmethod
    def relative_intensity(weight: float, one_rm: float) -> float:
        """Relative intensity = weight / 1RM (as fraction)."""
        if one_rm < 1e-6:
            return 0.0
        return weight / one_rm

    @staticmethod
    def fatigue_index(
        first_set_reps: int,
        last_set_reps: int,
        target_reps: int
    ) -> float:
        """
        Fatigue index: how much performance dropped across sets.
        FI = (first - last) / target  ∈ [0, 1]  (higher = more fatigued)
        """
        if target_reps == 0:
            return 0.0
        return max(0.0, (first_set_reps - last_set_reps) / target_reps)

    @staticmethod
    def inol(weight_lifted: float, one_rm: float, total_reps: int) -> float:
        """
        Intensity Number of Lifts (INOL).
        INOL = reps / (100 - intensity%)
        where intensity% = (weight / 1RM) * 100
        """
        intensity_pct = (weight_lifted / (one_rm + 1e-9)) * 100.0
        denom = 100.0 - intensity_pct
        if denom <= 0:
            return float("inf")
        return total_reps / denom


# ─────────────────────────────────────────────────────────────────────────────
# 6. DISTANCE METRICS
# ─────────────────────────────────────────────────────────────────────────────

class DistanceMetrics:
    """
    Distance and similarity functions for clustering and nearest-neighbour ops.
    All operate on plain Python float lists.
    """

    @staticmethod
    def euclidean(a: List[float], b: List[float]) -> float:
        return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

    @staticmethod
    def squared_euclidean(a: List[float], b: List[float]) -> float:
        return sum((x - y) ** 2 for x, y in zip(a, b))

    @staticmethod
    def manhattan(a: List[float], b: List[float]) -> float:
        return sum(abs(x - y) for x, y in zip(a, b))

    @staticmethod
    def chebyshev(a: List[float], b: List[float]) -> float:
        return max(abs(x - y) for x, y in zip(a, b))

    @staticmethod
    def cosine_distance(a: List[float], b: List[float]) -> float:
        return 1.0 - VectorOps.cosine_similarity(a, b)

    @staticmethod
    def pairwise_euclidean(X: DataMatrix) -> DataMatrix:
        """
        Compute n×n pairwise Euclidean distance matrix from an n×p DataMatrix.
        D[i,j] = ||X[i] - X[j]||₂
        """
        n = X.nrows
        D = DataMatrix(nrows=n, ncols=n)
        for i in range(n):
            ri = X.row(i)
            for j in range(i, n):
                rj = X.row(j)
                d = DistanceMetrics.euclidean(ri, rj)
                D._set(i, j, d)
                D._set(j, i, d)
        return D

    @staticmethod
    def nearest_neighbor(
        query: List[float], candidates: List[List[float]]
    ) -> Tuple[int, float]:
        """
        Return (index, distance) of nearest neighbour in candidates.
        Uses Euclidean distance.
        """
        best_idx, best_dist = 0, float("inf")
        for i, c in enumerate(candidates):
            d = DistanceMetrics.euclidean(query, c)
            if d < best_dist:
                best_dist = d
                best_idx = i
        return best_idx, best_dist


# ─────────────────────────────────────────────────────────────────────────────
# 7. LINEAR ALGEBRA
# ─────────────────────────────────────────────────────────────────────────────

class LinearAlgebra:
    """
    Higher-level linear algebra routines.
    Builds on DataMatrix and VectorOps.
    """

    @staticmethod
    def gram_schmidt(vectors: List[List[float]]) -> List[List[float]]:
        """
        Classical Gram-Schmidt orthonormalization.
        Input: list of k vectors of equal dimension.
        Output: list of orthonormal vectors spanning the same subspace.
        """
        orthonormal = []
        for v in vectors:
            u = v[:]
            for q in orthonormal:
                proj = VectorOps.project(u, q)
                u = VectorOps.sub(u, proj)
            norm = VectorOps.norm(u)
            if norm > 1e-10:
                orthonormal.append(VectorOps.normalize(u))
        return orthonormal

    @staticmethod
    def power_iteration(
        A: DataMatrix,
        n_iter: int = 1000,
        tol: float = 1e-8,
        seed: int = 42,
    ) -> Tuple[float, List[float]]:
        """
        Power Iteration to find the dominant eigenpair (λ_max, v_max).

        Algorithm:
          1. Start with random unit vector b₀
          2. Repeat: b_{k+1} = A·b_k / ||A·b_k||
          3. Rayleigh quotient: λ = b^T A b

        Returns: (eigenvalue, eigenvector as list)
        """
        n = A.nrows
        rng = random.Random(seed)
        b = VectorOps.normalize([rng.gauss(0, 1) for _ in range(n)])

        prev_lambda = None
        for iteration in range(n_iter):
            # Matrix-vector product
            Ab = DataMatrix(b).T()            # 1×n
            Ab = A.dot(DataMatrix(b))          # n×1 matrix
            Ab_list = [Ab._get(i, 0) for i in range(n)]

            # Rayleigh quotient
            lambda_ = VectorOps.dot(b, Ab_list)

            # Normalize
            norm_ = VectorOps.norm(Ab_list)
            if norm_ < 1e-12:
                raise ConvergenceError("Power iteration: zero vector encountered.")
            b = [v / norm_ for v in Ab_list]

            # Convergence check
            if prev_lambda is not None and abs(lambda_ - prev_lambda) < tol:
                break
            prev_lambda = lambda_

        return float(lambda_), b

    @staticmethod
    def deflate(A: DataMatrix, eigenvalue: float, eigenvector: List[float]) -> DataMatrix:
        """
        Deflate matrix A by removing the contribution of an eigenpair.
        A_deflated = A - λ * v * v^T
        """
        outer = VectorOps.outer(eigenvector, eigenvector)
        return A - outer * eigenvalue

    @staticmethod
    def top_k_eigenpairs(
        A: DataMatrix, k: int, n_iter: int = 1000, tol: float = 1e-8, seed: int = 42
    ) -> List[Tuple[float, List[float]]]:
        """
        Extract top-k eigenpairs via repeated power iteration + deflation.

        Returns list of (eigenvalue, eigenvector) sorted by descending eigenvalue.
        """
        eigenpairs = []
        A_curr = A.copy()
        for i in range(k):
            try:
                lam, vec = LinearAlgebra.power_iteration(
                    A_curr, n_iter=n_iter, tol=tol, seed=seed + i
                )
                eigenpairs.append((lam, vec))
                A_curr = LinearAlgebra.deflate(A_curr, lam, vec)
            except ConvergenceError:
                break
        eigenpairs.sort(key=lambda x: x[0], reverse=True)
        return eigenpairs

    @staticmethod
    def qr_decomposition(A: DataMatrix) -> Tuple[DataMatrix, DataMatrix]:
        """
        QR decomposition via Gram-Schmidt.
        A (m×n) → Q (m×n orthogonal), R (n×n upper-triangular).
        """
        m, n = A.shape
        cols = [A.col(j) for j in range(n)]
        Q_cols = LinearAlgebra.gram_schmidt(cols)

        # Build Q and R
        Q = DataMatrix.from_columns(Q_cols)
        R = Q.T().dot(A)
        return Q, R

    @staticmethod
    def pseudo_inverse(A: DataMatrix) -> DataMatrix:
        """
        Moore-Penrose pseudoinverse via normal equations: A⁺ = (A^T A)^{-1} A^T
        Works when A has full column rank.
        """
        At = A.T()
        AtA = At.dot(A)
        try:
            AtA_inv = AtA.inverse()
        except SingularMatrixError:
            # Regularise with small ridge
            n = AtA.nrows
            reg = DataMatrix.identity(n) * 1e-8
            AtA_inv = (AtA + reg).inverse()
        return AtA_inv.dot(At)

    @staticmethod
    def least_squares(X: DataMatrix, y: DataMatrix) -> DataMatrix:
        """
        OLS: β = (X^T X)^{-1} X^T y
        Returns coefficient vector (ncols×1).
        """
        Xt = X.T()
        XtX = Xt.dot(X)
        Xty = Xt.dot(y)
        try:
            return XtX.inverse().dot(Xty)
        except SingularMatrixError:
            return LinearAlgebra.pseudo_inverse(X).dot(y)


# ─────────────────────────────────────────────────────────────────────────────
# 8. ACTIVATION FUNCTIONS (for optional NN layer, used by GBDT leaf values)
# ─────────────────────────────────────────────────────────────────────────────

class Activations:
    """Scalar and vector activation functions."""

    @staticmethod
    def sigmoid(x: float) -> float:
        return MathUtils.sigmoid(x)

    @staticmethod
    def sigmoid_prime(x: float) -> float:
        s = MathUtils.sigmoid(x)
        return s * (1.0 - s)

    @staticmethod
    def relu(x: float) -> float:
        return max(0.0, x)

    @staticmethod
    def relu_prime(x: float) -> float:
        return 1.0 if x > 0 else 0.0

    @staticmethod
    def leaky_relu(x: float, alpha: float = 0.01) -> float:
        return x if x > 0 else alpha * x

    @staticmethod
    def tanh_prime(x: float) -> float:
        t = math.tanh(x)
        return 1.0 - t * t

    @staticmethod
    def linear(x: float) -> float:
        return x

    @staticmethod
    def softmax(v: List[float]) -> List[float]:
        return MathUtils.softmax(v)


# ─────────────────────────────────────────────────────────────────────────────
# SELF-TEST (runs only when executed as __main__)
# ─────────────────────────────────────────────────────────────────────────────

def _run_self_tests():
    """Verify core DataMatrix and math operations are correct."""
    print("=" * 60)
    print("HPI Engine — Self-Test Suite")
    print("=" * 60)
    passed = 0
    failed = 0

    def check(name: str, condition: bool):
        nonlocal passed, failed
        if condition:
            print(f"  ✅ {name}")
            passed += 1
        else:
            print(f"  ❌ FAIL: {name}")
            failed += 1

    # --- DataMatrix construction ---
    m = DataMatrix([[1, 2, 3], [4, 5, 6]])
    check("shape (2,3)", m.shape == (2, 3))
    check("element [0,1]==2", m[0, 1] == 2.0)
    check("element [1,2]==6", m[1, 2] == 6.0)

    # --- Slicing ---
    col0 = m[:, 0]
    check("col slice shape (2,1)", col0.shape == (2, 1))
    check("col slice values", col0[0, 0] == 1.0 and col0[1, 0] == 4.0)

    row1 = m[1, :]
    check("row slice shape (1,3)", row1.shape == (1, 3))

    # --- Arithmetic ---
    a = DataMatrix([[1, 2], [3, 4]])
    b = DataMatrix([[5, 6], [7, 8]])
    check("add", (a + b)[1, 1] == 12.0)
    check("sub", (b - a)[0, 0] == 4.0)
    check("scalar mul", (a * 3.0)[1, 0] == 9.0)
    check("hadamard", (a * b)[0, 0] == 5.0)
    check("neg", (-a)[0, 1] == -2.0)

    # --- Transpose ---
    at = a.T()
    check("transpose shape", at.shape == (2, 2))
    check("transpose[0,1]", at[0, 1] == 3.0)

    # --- Dot product ---
    c = a.dot(b)
    check("dot shape", c.shape == (2, 2))
    check("dot [0,0] = 1*5+2*7=19", abs(c[0, 0] - 19.0) < 1e-9)
    check("dot [1,1] = 3*6+4*8=50", abs(c[1, 1] - 50.0) < 1e-9)

    # --- Inverse ---
    inv_a = a.inverse()
    I_approx = a.dot(inv_a)
    check("inverse A@A^-1 ≈ I[0,0]", abs(I_approx[0, 0] - 1.0) < 1e-8)
    check("inverse A@A^-1 ≈ I[1,1]", abs(I_approx[1, 1] - 1.0) < 1e-8)
    check("inverse A@A^-1 ≈ I[0,1]≈0", abs(I_approx[0, 1]) < 1e-8)

    # --- Determinant ---
    det = a.determinant()
    check("det([[1,2],[3,4]])=-2", abs(det - (-2.0)) < 1e-9)

    # --- Statistical ops ---
    data_m = DataMatrix([[1, 10], [2, 20], [3, 30], [4, 40]])
    means = data_m.column_means()
    check("col_means[0]=2.5", abs(means[0] - 2.5) < 1e-9)
    check("col_means[1]=25.0", abs(means[1] - 25.0) < 1e-9)

    centered = data_m.mean_center()
    check("mean_center col0 sum ≈ 0", abs(sum(centered.col(0))) < 1e-9)

    norm_m = data_m.normalize()
    check("normalize col0 mean ≈ 0", abs(StatEngine.mean(norm_m.col(0))) < 1e-9)
    check("normalize col0 std ≈ 1", abs(StatEngine.std(norm_m.col(0), ddof=0) - 1.0) < 1e-6)

    # --- Covariance matrix ---
    cov = data_m.covariance_matrix()
    check("cov shape (2,2)", cov.shape == (2, 2))
    check("cov symmetric", abs(cov[0, 1] - cov[1, 0]) < 1e-9)

    # --- StatEngine ---
    vals = [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]
    check("mean=5.0", abs(StatEngine.mean(vals) - 5.0) < 1e-9)
    check("std≈2.0", abs(StatEngine.std(vals, ddof=0) - 2.0) < 1e-9)
    check("pearson_r=1.0 (y=2x)", abs(StatEngine.pearson_r([1,2,3],[2,4,6]) - 1.0) < 1e-9)

    slope, intercept, r2 = StatEngine.linear_regression([1,2,3,4,5],[2,4,6,8,10])
    check("linreg slope=2.0", abs(slope - 2.0) < 1e-9)
    check("linreg intercept=0.0", abs(intercept) < 1e-9)
    check("linreg r2=1.0", abs(r2 - 1.0) < 1e-9)

    # --- Power iteration ---
    # Known: [[4,1],[2,3]] has eigenvalues 5 and 2
    M = DataMatrix([[4, 1], [2, 3]])
    lam, vec = LinearAlgebra.power_iteration(M, n_iter=500)
    check("power iter dominant λ≈5", abs(lam - 5.0) < 0.01)

    # --- MathUtils ---
    check("epley 1RM(100kg, 5reps)", abs(MathUtils.epley_1rm(100, 5) - 116.666) < 0.01)
    check("sigmoid(0)=0.5", abs(MathUtils.sigmoid(0) - 0.5) < 1e-9)
    check("relu(-1)=0", MathUtils.relu(-1) == 0.0)
    check("lerp(0,10,0.5)=5", abs(MathUtils.lerp(0, 10, 0.5) - 5.0) < 1e-9)

    # --- VectorOps ---
    v1 = [3.0, 4.0]
    check("norm L2=5", abs(VectorOps.norm(v1) - 5.0) < 1e-9)
    check("normalize len=1", abs(VectorOps.norm(VectorOps.normalize(v1)) - 1.0) < 1e-9)

    print("-" * 60)
    print(f"  Results: {passed} passed, {failed} failed out of {passed+failed} tests")
    print("=" * 60)
    if failed > 0:
        raise AssertionError(f"{failed} test(s) FAILED.")
    return True


if __name__ == "__main__":
    _run_self_tests()
