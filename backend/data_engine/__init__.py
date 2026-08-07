"""
HPI Data Engine
====================
Pure-Python math and data science primitives.
No numpy, pandas, or external math libraries.
"""

from .engine import (
    DataMatrix,
    VectorOps,
    StatEngine,
    MathUtils,
    DistanceMetrics,
    LinearAlgebra,
    Activations,
    DimensionError,
    SingularMatrixError,
    ConvergenceError,
)

__all__ = [
    "DataMatrix",
    "VectorOps",
    "StatEngine",
    "MathUtils",
    "DistanceMetrics",
    "LinearAlgebra",
    "Activations",
    "DimensionError",
    "SingularMatrixError",
    "ConvergenceError",
]
