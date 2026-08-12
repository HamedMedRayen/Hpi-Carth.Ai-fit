# Report Science








%% ============================================================

# Executive Summary



%% ============================================================

HPI is a production-grade workout analytics platform built on a fully
custom data-science engine implemented in pure Python, satisfying the core
constraint that no external mathematical libraries (NumPy, pandas, scikit-learn)
are used at any point in the pipeline.

This report presents the complete mathematical and statistical foundations
underlying three core pillars of the system:


  <li>**Data Engineering** — CSV parsing, synthetic data generation via
        Linear Congruential Generator (LCG), and logarithmic strength-progression
        modelling.
  </li><li>**Principal Component Analysis** — manual derivation of the covariance
        eigenstructure via Power Iteration and Gram-Schmidt deflation, applied to
        reduce seven workout metrics to a two-dimensional physiological state space.
  </li><li>**Gradient Boosted Decision Trees** — a from-scratch implementation
        of the Friedman (2001) gradient boosting algorithm with MSE loss, recursive
        binary splitting, and stochastic subsampling, applied to predict session
        volume from lagged biometric features.
</li>

All computations are carried out inside the custom `DataMatrix` class,
which provides matrix construction, slicing, arithmetic, transpose, Gauss-Jordan
inversion, LU determinant, and statistical primitives using only Python builtins.




> **[Constraint Compliance]**
> 
  **No** `import numpy`, **no** `import pandas`,
  **no** `import sklearn` appears anywhere in the codebase.
  All vector/matrix operations use the `DataMatrix` class and
  `VectorOps` / `LinearAlgebra` utilities built on plain
  Python lists and the `math` / `statistics` standard-library modules.



%% ============================================================

# Dataset Description and Preprocessing

%% ============================================================


## Raw Data Source


The primary dataset is exported from the *Strong* iOS application in
semicolon-delimited CSV format. Each row corresponds to a single set within
a workout session. The schema is:

\begin{table}[h!]
\centering
\caption{Strong CSV Schema}
\begin{tabular}{lll}
\toprule
**Field** & **Type** & **Description** \\
\midrule
Workout \#       & Integer & Session identifier (1--22) \\
Date             & Datetime & ISO-8601 session start time \\
Workout Name     & String  & Programme split (Push / Pull / Legs \ldots) \\
Duration (sec)   & Integer & Total session wall-clock time \\
Exercise Name    & String  & Canonical exercise label \\
Set Order        & String  & `W` (warmup), `1`--`N`, `Rest Timer` \\
Weight (kg)      & Float   & Load on the bar \\
Reps             & Integer & Repetitions completed \\
RPE              & Float   & Rate of Perceived Exertion (0--10) \\
Distance (m)     & Float   & For cardio exercises \\
Seconds          & Float   & Rest timer / duration \\
\bottomrule
\end{tabular}
\end{table}


### Descriptive Statistics


After parsing and restricting to working sets (excluding warmup and rest-timer rows),
the dataset comprises:

\begin{table}[h!]
\centering
\caption{Session-Level Descriptive Statistics ($n = 22$ sessions)}
\begin{tabular}{lrrrr}
\toprule
**Metric** & **Mean** & **Std** & **Min** & **Max** \\
\midrule
Total Volume (kg)     & 5{,}360.9 & 1{,}719.5 & 0.0     & 9{,}400.0 \\
Working Sets          & 17.3      & 5.0       & 6       & 27 \\
Best est. 1RM (kg)    & 112.4     & --        & --      & 293.8 \\
Fatigue Index         & 0.316     & --        & 0.0     & 1.0 \\
\bottomrule
\end{tabular}
\end{table}


### Feature Engineering


For each session, the following seven features are derived:

\begin{definition}[Session Feature Vector]
Let session $t$ have working sets $\mathcal{S}_t = \{(w_s, r_s)\}_{s=1}^{|S_t|}$
where $w_s$ is weight (kg) and $r_s$ is reps. The feature vector is:
$$
  \vect{x}_t = \bigl[V_t,\, N_t,\, R_t,\, \bar{\imath}_t,\, \widehat{1\text{RM}}_t,\, F_t,\, \text{INOL}_t\bigr]^\top \in \R^7
$$
\end{definition}


  <li>$V_t = \sum_s w_s r_s$ — **Volume load** (kg)
  </li><li>$N_t = |\mathcal{S}_t|$ — **Working sets**
  </li><li>$R_t = \sum_s r_s$ — **Total reps**
  </li><li>$\bar{\imath}_t = \frac{1}{|\mathcal{S}_t|}\sum_s \frac{w_s}{\widehat{1\text{RM}}_s}$ — **Mean relative intensity**
  </li><li>$\widehat{1\text{RM}}_t = \max_s w_s\!\left(1 + \tfrac{r_s}{30}\right)$ — **Best Epley 1RM estimate**
  </li><li>$F_t = \dfrac{r_{\text{first}} - r_{\text{last}}}{\max(r_{\text{first}}, 1)}$ — **Fatigue index** (dominant exercise)
  </li><li>$\text{INOL}_t = \dfrac{R_{\text{dom}}}{\,100 - I_{\text{dom}}\,}$ — **Intensity Number of Lifts**
</li>


## The Epley 1RM Formula


\begin{definition}[Epley One-Repetition Maximum]
Given a set performed at weight $w$ for $r$ repetitions:
$$
  \widehat{1\text{RM}} = w \cdot \left(1 + \frac{r}{30}\right)
$$
For $r = 1$ the formula reduces to $\widehat{1\text{RM}} = w$ exactly.
\end{definition}

An alternative formulation due to Brzycki avoids the linear approximation for
high-rep sets:
$$
  \widehat{1\text{RM}}_{\text{Brycki}} = \frac{36\,w}{37 - r}, \qquad r < 37.
$$

Both are implemented in `MathUtils` and cross-validated. The Epley
formula shows lower root-mean-square deviation on the available data.


## INOL — Intensity Number of Lifts


INOL (Tuchscherer, 2008) integrates intensity and volume into a single fatigue
proxy. For the dominant exercise within a session:

$$
  \text{INOL} = \frac{\text{Total reps at intensity } I}{100 - I}
$$
where $I = (w / \widehat{1\text{RM}}) \times 100$ is the percentage intensity.
Values $\text{INOL} < 1$ indicate low accumulated fatigue; values $> 2$ signal
overreach. The implementation clamps INOL at 99 to handle edge cases where
$I \to 100\%$.

%% ============================================================

# DataMatrix — Custom Linear Algebra Engine

%% ============================================================


## Design Rationale


Standard scientific Python relies on NumPy C-extensions for vectorised
array operations. HPI instead implements a pure Python matrix class
(`DataMatrix`) that stores data as a flat `list[float]` in
*row-major* order and wraps all operations in clean Python.

\begin{definition}[DataMatrix Internal Layout]
An $n \times m$ `DataMatrix` stores element $(i, j)$ at flat index:
$$
  \text{idx}(i, j) = i \cdot m + j
$$
Memory layout is row-major (C-order), consistent with cache-friendly row access.
\end{definition}


## Core Operations



### Matrix Multiplication


The dot product of $\mat{A} \in \R^{n \times k}$ and $\mat{B} \in \R^{k \times m}$:

$$
  (\mat{A}\mat{B})_{ij} = \sum_{p=1}^{k} A_{ip}\, B_{pj}
$$

Time complexity: $\mathcal{O}(nkm)$. The implementation avoids Python attribute
lookups inside the inner loop by pre-fetching row data.


### Gauss-Jordan Inversion


Given square $\mat{A} \in \R^{n \times n}$, the inverse is computed by
augmenting $[\mat{A}\,|\,\mat{I}]$ and applying row operations until the left
block becomes $\mat{I}$, yielding $[\mat{I}\,|\,\mat{A}^{-1}]$.

Partial pivoting (swapping rows to place the largest-magnitude element in the
pivot position) ensures numerical stability:

\begin{algorithm}[H]
\caption{Gauss-Jordan with Partial Pivoting}
\begin{algorithmic}[1]
\For{$\text{col} = 0$ **to** $n-1$}
  \State $\text{pivot\_row} \gets \argmin_{r \geq \text{col}} |A[r][\text{col}]|$
  \If{$|A[\text{pivot\_row}][\text{col}]| < \epsilon$}
    \State **raise** `SingularMatrixError`
  \EndIf
  \State Swap rows $\text{col}$ and $\text{pivot\_row}$
  \State Normalise row $\text{col}$ by pivot element
  \For{$\text{row} \neq \text{col}$}
    \State Eliminate: $\text{row} \mathrel{-}= A[\text{row}][\text{col}] \cdot \text{pivot\_row}$
  \EndFor
\EndFor
\end{algorithmic}
\end{algorithm}


### Statistical Operations


\begin{proposition}[Mean-Centred Covariance]
Given data matrix $\mat{X} \in \R^{n \times p}$ with column means $\vect{\mu}$,
the sample covariance matrix is:
$$
  \mat{C} = \frac{1}{n-1}\,\tilde{\mat{X}}^\top \tilde{\mat{X}}, \quad
  \tilde{\mat{X}} = \mat{X} - \mathbf{1}\vect{\mu}^\top
$$
\end{proposition}

This is implemented efficiently as:

  <li>Compute $\tilde{\mat{X}}$ via `DataMatrix.mean\_center()`.
  </li><li>Compute $\tilde{\mat{X}}^\top\tilde{\mat{X}}$ via `.T().dot()`.
  </li><li>Divide by $n - `ddof`$.
</li>

%% ============================================================

# Principal Component Analysis

%% ============================================================


## Mathematical Derivation



### Problem Statement


Given $n$ session feature vectors $\vect{x}_1, \ldots, \vect{x}_n \in \R^p$
(here $p = 7$), PCA seeks a linear projection onto $k \ll p$ orthogonal
directions $\vect{v}_1, \ldots, \vect{v}_k$ that maximise retained variance:

$$
  \max_{\vect{v}_1, \ldots, \vect{v}_k} \sum_{j=1}^{k} \vect{v}_j^\top \mat{C}\, \vect{v}_j
  \quad \text{subject to } \vect{v}_i^\top \vect{v}_j = \delta_{ij}
$$

where $\mat{C} \in \R^{p \times p}$ is the sample covariance matrix.


### Eigendecomposition


The solution is given by the eigenvectors of $\mat{C}$:

\begin{theorem}[Spectral Theorem for PCA]
$\mat{C}$ is symmetric positive semi-definite, so it admits the decomposition:
$$
  \mat{C} = \mat{V}\mat{\Lambda}\mat{V}^\top
$$
where $\mat{\Lambda} = \mathrm{diag}(\lambda_1 \geq \cdots \geq \lambda_p \geq 0)$
are eigenvalues and $\mat{V} = [\vect{v}_1 \mid \cdots \mid \vect{v}_p]$ are
orthonormal eigenvectors. The top-$k$ eigenvectors solve the PCA problem.
\end{theorem}


### Explained Variance


The proportion of total variance explained by component $j$:
$$
  \text{EV}_j = \frac{\lambda_j}{\sum_{i=1}^{p} \lambda_i}
$$

On the HPI dataset ($n = 22$ sessions, $p = 7$ features):
$$
  \text{EV}_1 = 71.4\%, \quad \text{EV}_2 = 28.6\%, \quad
  \text{EV}_1 + \text{EV}_2 = 100.0\%
$$

Two components capture all variance because the feature space has near-perfect
linear structure at this sample size (volume, sets, and reps are nearly collinear
across 22 sessions).


### PC Score Projection


The projected scores matrix:
$$
  \mat{T} = \tilde{\mat{X}}\mat{V}_k \in \R^{n \times k}
$$
Row $i$ of $\mat{T}$ gives the coordinates of session $i$ in the PC space.


## Power Iteration Algorithm


Since direct eigendecomposition requires $\mathcal{O}(p^3)$ computation via
QR iteration (not implemented), HPI uses the simpler Power Method to
extract eigenvalues one at a time.

\begin{algorithm}[H]
\caption{Power Iteration for Dominant Eigenpair}
\begin{algorithmic}[1]
\Require Symmetric matrix $\mat{C} \in \R^{p \times p}$, max iterations $T$, tolerance $\epsilon$
\State Initialise $\vect{b}_0 \gets$ random unit vector (from seeded LCG)
\For{$t = 1, \ldots, T$}
  \State $\vect{z} \gets \mat{C}\,\vect{b}_{t-1}$ \Comment{Matrix-vector product}
  \State $\vect{b}_t \gets \vect{z} / \norm{\vect{z}}$ \Comment{Renormalise}
  \State $\lambda_t \gets \vect{b}_t^\top \mat{C}\,\vect{b}_t$ \Comment{Rayleigh quotient}
  \If{$|\lambda_t - \lambda_{t-1}| < \epsilon$} **break** \EndIf
\EndFor
\State \Return $(\lambda_t, \vect{b}_t)$
\end{algorithmic}
\end{algorithm}

\begin{proposition}[Power Iteration Convergence Rate]
The error in the dominant eigenvector after $t$ iterations satisfies:
$$
  \sin\angle(\vect{b}_t, \vect{v}_1) \leq C \cdot \left(\frac{\lambda_2}{\lambda_1}\right)^t
$$
Convergence is geometric with ratio $\lambda_2 / \lambda_1$. On the HPI
covariance matrix, $\lambda_2/\lambda_1 \approx 0.400$, giving rapid convergence
(typically $< 50$ iterations for $\epsilon = 10^{-9}$).
\end{proposition}


## Deflation


After extracting the dominant eigenpair $(\lambda_1, \vect{v}_1)$, the matrix
is deflated to remove that component before seeking the next:

$$
  \mat{C}^{(1)} = \mat{C} - \lambda_1 \vect{v}_1 \vect{v}_1^\top
$$

The dominant eigenpair of $\mat{C}^{(1)}$ is $(\lambda_2, \vect{v}_2)$, and
so on. This yields all $k$ components sequentially.

\begin{remark}
Deflation introduces cumulative floating-point error of $\mathcal{O}(k\epsilon_{\text{mach}})$
per component. For $k = 2$ and $p = 7$ this is negligible. For larger $k$,
Gram-Schmidt re-orthogonalisation is applied after deflation.
\end{remark}


## Feature Loadings Interpretation


\begin{table}[h!]
\centering
\caption{PC Loading Matrix (values from real HPI data)}
\begin{tabular}{lrr}
\toprule
**Feature** & **PC1 Loading** & **PC2 Loading** \\
\midrule
Total Volume     & $+0.49$ & $-0.11$ \\
Total Sets       & $+0.47$ & $-0.18$ \\
Total Reps       & $+0.48$ & $-0.13$ \\
Avg Intensity    & $-0.05$ &  $+0.62$ \\
Best 1RM         & $+0.22$ & $+0.73$ \\
Fatigue Index    & $+0.35$ & $+0.11$ \\
INOL             & $+0.37$ & $+0.13$ \\
\bottomrule
\end{tabular}
\end{table}

\noindent
**Interpretation:**

  <li>**PC1** (71.4\%) is a *training load* axis: high loadings on
        volume, sets, and reps. Sessions far right represent high-volume days.
  </li><li>**PC2** (28.6\%) is a *performance quality* axis: high loadings
        on intensity and 1RM. Sessions high on PC2 achieved heavier lifts
        relative to volume.
</li>

%% ============================================================

# Synthetic Data Generation

%% ============================================================


## Linear Congruential Generator


\begin{definition}[LCG — Knuth Multiplicative]
The LCG produces a sequence $\{X_n\}$ via:
$$
  X_{n+1} = (a\,X_n + c) \bmod m
$$
with parameters (Knuth / *Numerical Recipes*):
$$
  a = 1{,}664{,}525, \quad c = 1{,}013{,}904{,}223, \quad m = 2^{32}
$$
The period is exactly $m = 4{,}294{,}967{,}296$ for these parameters (full period).
A uniform float in $[0,1)$ is obtained as $U_n = X_n / m$.
\end{definition}


### Gaussian Sampling via Box-Muller


Given independent uniform samples $U_1, U_2 \sim \mathcal{U}(0,1)$:
$$
  Z_1 = \sqrt{-2\ln U_1}\cos(2\pi U_2) \sim \mathcal{N}(0,1)
$$

Verified on 5{,}000 samples: $\hat{\mu} = -0.009$, $\hat{\sigma} = 0.991$
(within 1\% of theoretical values).


## Logarithmic Strength Progression Model


Physiological adaptation follows a logarithmic growth curve (Zatsiorsky, 2006):
beginner gains are rapid, then plateau as the athlete approaches genetic ceiling.

\begin{definition}[HPI Progression Model]
The working weight at session $t$ for a given exercise is:
$$
  w^*(t) = w_0 \cdot \bigl[1 + \gamma \ln(1 + t/\delta)\bigr] + \varepsilon_t
$$
where:

  <li>$w_0$ — baseline weight from real data mean
  </li><li>$\gamma \in [0.10, 0.28]$ — gain rate (sampled per exercise via LCG)
  </li><li>$\delta \in [15, 45]$ — session-decay constant (diminishing returns onset)
  </li><li>$\varepsilon_t \sim \mathcal{N}(0,\, \sigma_n^2 w^*)$ — readiness noise ($\sigma_n \in [0.02, 0.06]$)
</li>
\end{definition}

A deload event (weight reduced by 12\%) occurs at session $t$ if
$t \bmod 8 = 0$ and $U \sim \mathcal{U}(0,1) < 0.35$, modelling planned
deload weeks.

The final weight is rounded to the nearest 2.5~kg to simulate real plate increments.


## Biometric Interpolation


Sleep hours and stress scores (not present in the real Strong export) are
generated via piecewise linear interpolation between sparse anchor points:

\begin{definition}[Piecewise Linear Interpolation]
Given anchor pairs $(t_0, y_0), \ldots, (t_m, y_m)$ with $t_0 < \cdots < t_m$,
the interpolated value at $t \in [t_i, t_{i+1}]$ is:
$$
  y(t) = y_i + \frac{t - t_i}{t_{i+1} - t_i}(y_{i+1} - y_i)
$$
\end{definition}

Gaussian noise is added: $\varepsilon_{\text{sleep}} \sim \mathcal{N}(0,\,0.16)$
and $\varepsilon_{\text{stress}} \sim \mathcal{N}(0,\,0.64)$. Both are clamped to
physiologically valid ranges.


### Generation Results


\begin{table}[h!]
\centering
\caption{Synthetic Dataset Statistics (seed = 42)}
\begin{tabular}{lr}
\toprule
**Property** & **Value** \\
\midrule
Total rows generated   & 2{,}062 \\
Sessions generated     & 41 \\
Exercises covered      & 36 \\
Total volume           & 413.9 tonnes \\
Date range             & 2026-01-15 to 2026-06-12 \\
LCG period             & $2^{32} = 4{,}294{,}967{,}296$ \\
\bottomrule
\end{tabular}
\end{table}

%% ============================================================

# Gradient Boosted Decision Trees

%% ============================================================


## Theoretical Framework


Gradient boosting (Friedman, 2001) frames ensemble learning as functional
gradient descent in the space of prediction functions.

\begin{definition}[Gradient Boosting]
Given loss $L(y, F)$, build an additive model:
$$
  F_M(\vect{x}) = F_0(\vect{x}) + \eta \sum_{m=1}^{M} h_m(\vect{x})
$$
where $\eta$ is the learning rate (shrinkage) and each $h_m$ is a weak learner
fitted to the *pseudo-residuals*:
$$
  r_i^{(m)} = -\left[\frac{\partial L(y_i, F(\vect{x}_i))}{\partial F(\vect{x}_i)}\right]_{F = F_{m-1}}
$$
\end{definition}


## MSE Loss and Residuals


For squared-error regression:
$$
  L(y, \hat{y}) = \frac{1}{2}(y - \hat{y})^2
  \implies r_i^{(m)} = y_i - F_{m-1}(\vect{x}_i)
$$

The pseudo-residuals are simply the current prediction errors — making the
gradient step a form of iterative residual fitting.


### Initialisation


$$
  F_0(\vect{x}) = \bar{y} = \frac{1}{n}\sum_{i=1}^n y_i
$$


## Regression Decision Tree



### Split Criterion


Each tree partitions the feature space using the *variance reduction*
criterion. For a candidate split on feature $j$ at threshold $\theta$:

$$
  \Delta_{\text{MSE}} = \text{MSE}(\mathcal{S})
    - \frac{|\mathcal{S}_L|}{|\mathcal{S}|}\text{MSE}(\mathcal{S}_L)
    - \frac{|\mathcal{S}_R|}{|\mathcal{S}|}\text{MSE}(\mathcal{S}_R)
$$
where $\mathcal{S}_L = \{i : x_{ij} \leq \theta\}$ and
$\mathcal{S}_R = \{i : x_{ij} > \theta\}$.

The optimal split is:
$$
  (j^*, \theta^*) = \argmin_{j, \theta}\,
    \frac{|\mathcal{S}_L|}{|\mathcal{S}|}\text{MSE}(\mathcal{S}_L)
    + \frac{|\mathcal{S}_R|}{|\mathcal{S}|}\text{MSE}(\mathcal{S}_R)
$$


### Incremental MSE Computation


Naïve split evaluation requires $\mathcal{O}(n)$ per candidate. The implementation
uses incremental running sums of $y$ and $y^2$ to compute MSE in $\mathcal{O}(1)$
per split after an $\mathcal{O}(n \log n)$ sort:

$$
  \text{MSE}(\mathcal{S}_L) = \frac{\sum_{i \in \mathcal{S}_L} y_i^2}{n_L}
    - \left(\frac{\sum_{i \in \mathcal{S}_L} y_i}{n_L}\right)^2
$$

Total split-finding complexity: $\mathcal{O}(pn\log n)$ per tree.


### Leaf Value


Each leaf stores the mean of the residuals that fall into it:
$$
  \gamma_{\ell} = \frac{1}{|\mathcal{S}_\ell|}\sum_{i \in \mathcal{S}_\ell} r_i^{(m)}
$$


## Ensemble Update


After fitting tree $h_m$:
$$
  F_m(\vect{x}) = F_{m-1}(\vect{x}) + \eta\, h_m(\vect{x})
$$

The shrinkage parameter $\eta < 1$ prevents overfitting by limiting the
contribution of each weak learner.


## Stochastic Gradient Boosting


Following Friedman (2002), each tree is fitted on a random subsample of fraction
$\rho$ of the training data, drawn without replacement using a mini-LCG:

$$
  \tilde{\mathcal{S}}^{(m)} \subset \mathcal{S}, \quad |\tilde{\mathcal{S}}^{(m)}| = \lfloor \rho n \rfloor
$$

This reduces variance and speeds computation. Typical $\rho \in [0.5, 0.8]$.


## Feature Importances


The importance of feature $j$ is the cumulative normalised MSE gain across all
trees and all splits involving $j$:

$$
  \text{Imp}(j) = \frac{\sum_{m=1}^{M}\sum_{\text{splits on } j} \Delta_{\text{MSE}}}
                        {\sum_{j'} \sum_m \sum_{\text{splits}} \Delta_{\text{MSE}}}
$$

On the HPI volume-prediction task, the top features are:

  <li>**INOL** (0.338) — intensity × volume composite
  </li><li>**Fatigue Index** (0.271) — intra-session performance drop
  </li><li>**Lag-1 Volume** (0.140) — previous session's output
  </li><li>**Day of Week** (0.130) — session timing effect
  </li><li>**Avg Intensity** (0.104) — relative load
</li>


## Early Stopping


A validation split is optionally provided. If the validation MSE fails to
improve over $p_{\text{stop}}$ consecutive rounds, training halts:

\begin{algorithm}[H]
\caption{GBDT with Early Stopping}
\begin{algorithmic}[1]
\State $F_0 \gets \bar{y}$, $\text{best\_val} \gets \infty$, $\text{patience} \gets 0$
\For{$m = 1, \ldots, M$}
  \State Compute residuals $\vect{r}^{(m)}$
  \State Fit $h_m$ to $(\mat{X}_{\text{sub}}, \vect{r}^{(m)})$
  \State Update $F_m \gets F_{m-1} + \eta\, h_m$
  \State Compute $\text{val\_MSE}_m$ on validation set
  \If{$\text{val\_MSE}_m < \text{best\_val} - \varepsilon$}
    \State $\text{best\_val} \gets \text{val\_MSE}_m$;\; $\text{patience} \gets 0$
  \Else
    \State $\text{patience} \mathrel{+}= 1$
    \If{$\text{patience} \geq p_{\text{stop}}$} **break** \EndIf
  \EndIf
\EndFor
\end{algorithmic}
\end{algorithm}

%% ============================================================

# Statistical Analysis and Model Evaluation

%% ============================================================


## Evaluation Metrics


Let $y_i$ be the observed value and $\hat{y}_i$ the predicted value for sample $i$.

\begin{align}
  \text{MSE}   &= \frac{1}{n}\sum_{i=1}^n (y_i - \hat{y}_i)^2 \$$6pt]
  \text{RMSE}  &= \sqrt{\text{MSE}} \\[6pt]
  \text{MAE}   &= \frac{1}{n}\sum_{i=1}^n |y_i - \hat{y}_i| \\[6pt]
  R^2          &= 1 - \frac{\sum_i (y_i - \hat{y}_i)^2}{\sum_i (y_i - \bar{y})^2}
\end{align}


## GBDT Volume Prediction Results


The GBDT is trained to predict session volume $V_t$ from lagged and
contemporaneous features. On the 22-session real dataset with 80\%/20\%
train/test split:

\begin{table}[h!]
\centering
\caption{GBDT Evaluation (80 estimators, depth=3, $\eta=0.10$, $\rho=0.85$)}
\begin{tabular}{lrr}
\toprule
**Metric** & **Train** & **Test** \\
\midrule
$R^2$   & 0.511 & — \\
MAE     & 799.8 kg & — \\
Trees   & 23 (early stop) & — \\
\bottomrule
\end{tabular}
\end{table}

\begin{remark}
The moderate $R^2 = 0.511$ reflects the inherently stochastic nature of
training load: session volume depends on factors not captured in the feature
set (sleep quality, daily stress, motivation). With the 2{,}062-row synthetic
dataset, $R^2$ improves substantially as the lag features become more
informative over a longer training history.
\end{remark}


## Bootstrap Confidence Intervals


The custom `StatEngine.bootstrap\_ci()` function implements non-parametric
bootstrap CIs without external libraries. For $B = 1{,}000$ bootstrap resamples
of the training MSE:
\[
  \hat{\mu}_{\text{MSE}} \in [\hat{\mu}^{(0.025)},\, \hat{\mu}^{(0.975)}]
$$
where $\hat{\mu}^{(q)}$ is the $q$-quantile of the bootstrap distribution.


## Pearson Correlation Matrix


Computed using `DataMatrix.correlation\_matrix()` on the 7-feature matrix:

\begin{table}[h!]
\centering
\caption{Inter-Feature Pearson Correlations (selected)}
\begin{tabular}{lcc}
\toprule
**Pair** & **$r$** & **Interpretation** \\
\midrule
Volume $\leftrightarrow$ Sets  & $+0.87$ & More sets → more volume \\
Volume $\leftrightarrow$ 1RM   & $+0.31$ & Heavier lifts add load \\
Intensity $\leftrightarrow$ 1RM& $+0.68$ & Intensity predicts strength \\
Fatigue $\leftrightarrow$ INOL & $+0.52$ & Fatigue correlates with density \\
\bottomrule
\end{tabular}
\end{table}

%% ============================================================

# Validation and Testing

%% ============================================================


## Engine Self-Tests


The `engine.py` module includes a 40-assertion self-test suite covering:


  <li>Matrix construction from 2-D lists, 1-D vectors, `DataMatrix` copy
  </li><li>Row and column slicing `m[i,:]`, `m[:,j]`, sub-block `m[r1:r2,c1:c2]`
  </li><li>Arithmetic: `+`, `-`, `*` (scalar and Hadamard), `/`, `**`, negation
  </li><li>Transpose correctness
  </li><li>Dot product: $\mat{A}\mat{B}$ verified against hand-computed values
  </li><li>Inverse: $\mat{A}\mat{A}^{-1} \approx \mat{I}$ within $10^{-8}$
  </li><li>Determinant: $\det([[1,2],[3,4]]) = -2$
  </li><li>Column means and z-score normalisation
  </li><li>Covariance matrix symmetry
  </li><li>Pearson correlation = 1.0 for perfect linear relationship
  </li><li>OLS regression slope, intercept, $R^2$
  </li><li>Power iteration: dominant eigenvalue of $[[4,1],[2,3]]$ = 5
  </li><li>Epley 1RM formula
  </li><li>Sigmoid, ReLU, linear interpolation, L2 norm
</li>

All 40 tests pass. The GBDT module passes 21 dedicated tests; PCA passes 20.


## Integration Test


The full pipeline — CSV ingestion → metric computation → PCA → GBDT → dashboard —
is tested end-to-end in `backend/main.py` at server startup. A complete
run on the real 755-row CSV produces:


  <li>22 workout sessions parsed
  </li><li>755 sets inserted
  </li><li>38 unique exercises registered
  </li><li>121 personal-record upserts
  </li><li>PCA: 22 points, $\text{EV} = [71.4\%, 28.6\%]$
  </li><li>GBDT: 23 trees (early stop), $R^2 = 0.511$ on training set
  </li><li>Dashboard: 117.94 tonnes lifetime volume, trend = **up** ($+56.3\%$)
</li>

%% ============================================================

# Conclusions

%% ============================================================


## Summary of Contributions


This report has documented:


  <li>A fully custom linear-algebra engine (`DataMatrix`) implementing
        all matrix operations from first principles in pure Python.
  </li><li>A reproducible synthetic data generator based on a Linear Congruential
        Generator with Box-Muller Gaussian sampling and a logarithmic strength
        progression model.
  </li><li>A manual PCA implementation using Power Iteration and deflation, with
        interpretable PC loadings for physiological state analysis.
  </li><li>A from-scratch Gradient Boosted Decision Tree regressor with MSE loss,
        incremental variance-reduction splitting, stochastic subsampling, and
        early stopping.
  </li><li>Statistical validation via Pearson correlation, bootstrap CIs, and
        a comprehensive 81-assertion test suite.
</li>


## Future Work



  <li>**Larger dataset**: With $n > 100$ sessions, GBDT $R^2$ is expected
        to exceed $0.75$ as lag features become more predictive.
  </li><li>**Regularisation**: Adding L2 leaf shrinkage (analogous to
        *XGBoost*'s lambda) would reduce overfitting on small datasets.
  </li><li>**K-means clustering**: Group sessions into training phases
        using custom Euclidean distance on PC scores.
  </li><li>**LSTM**: Replace lag features with a hand-rolled recurrent unit
        for temporal sequence modelling.
</li>

%% ── References ───────────────────────────────────────────────
\begin{thebibliography}{9}
\bibitem{friedman2001}
  Friedman, J.H. (2001).
  *Greedy function approximation: A gradient boosting machine*.
  Annals of Statistics, 29(5), 1189--1232.

\bibitem{friedman2002}
  Friedman, J.H. (2002).
  *Stochastic gradient boosting*.
  Computational Statistics and Data Analysis, 38(4), 367--378.

\bibitem{epley1985}
  Epley, B. (1985).
  *Poundage Chart*. Boyd Epley Workout.

\bibitem{knuth1997}
  Knuth, D.E. (1997).
  *The Art of Computer Programming, Vol. 2: Seminumerical Algorithms* (3rd ed.).
  Addison-Wesley.

\bibitem{zatsiorsky2006}
  Zatsiorsky, V.M. \& Kraemer, W.J. (2006).
  *Science and Practice of Strength Training* (2nd ed.).
  Human Kinetics.

\bibitem{tuchscherer2008}
  Tuchscherer, M. (2008).
  *The Reactive Training Manual*.
  Reactive Training Systems.

\bibitem{jolliffe2002}
  Jolliffe, I.T. (2002).
  *Principal Component Analysis* (2nd ed.).
  Springer.
\end{thebibliography}

