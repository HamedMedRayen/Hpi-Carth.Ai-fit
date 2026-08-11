# Project Overview — HPI (Hybrid Workout Analytics & Coaching Platform)

## 1. Overview
**HPI** (Hamed Med Rayen / Aura-Fit) is a production-grade, AI-powered hybrid fitness, workout analytics, and personal coaching platform. Designed for athletes, lifters, and personal trainers, HPI bridges the gap between training logs, biometric tracking (sleep, fatigue, body measurements), nutrition, injury management, and AI-driven coaching recommendations.

The application serves three core audiences:
1. **Athletes & Lifters**: Users seeking deep data analytics on workout volume, 1RM progression, fatigue indices, automated macro targets, AI meal scanning, and real-time AI training partner interactions.
2. **Personal Coaches**: Fitness professionals managing client rosters, reviewing AI progress reports, assigning custom training plans and nutrition targets, hosting community masterclasses, conducting video consultations, and maintaining 1-on-1 direct chat.
3. **Fitness Communities**: Members participating in multi-day fitness challenges, community workshops, local gym locator services, and interactive leaderboard tracking.

---

## 2. Tech Stack

### Backend
- **Python 3.10+ / FastAPI**: Modern, high-performance web framework for the API layer with async lifespan hooks, automatic OpenAPI/Swagger documentation, and Pydantic validation.
- **Uvicorn (v0.30+)**: Lightning-fast ASGI server implementation for running FastAPI in development and production.
- **Psycopg2-binary**: PostgreSQL database adapter for Python, connecting FastAPI to Supabase hosted PostgreSQL. Uses `RealDictCursor` for dict-like row parsing and `ThreadedConnectionPool` for connection pooling.
- **Supabase (PostgreSQL 15+)**: Cloud relational database hosting application state, user profiles, workouts, sets, metrics, food items, chat logs, coach relationships, and community events.
- **Groq SDK (v0.9+)**: High-speed AI inference provider powering the HPI AI Agent (Llama 3.3 70B Versatile), unified AI workout generator, SQL generator for RAG, and question classification (Llama 3.1 8B Instant).
- **Qdrant Client (v1.10+)**: Vector database client powering vector similarity search across indexed gym recommendation datasets.
- **Sentence-Transformers / PyTorch / Transformers**: Local embedding generation (`BAAI/bge-large-en-v1.5`), cross-encoder reranking (`BAAI/bge-reranker-v2-m3`), and local ASR speech-to-text (`TuniSpeech-AI/whisper-tunisian-dialect`).
- **DuckDB (v1.0+)**: Embedded analytical SQL database engine used to run fast, in-memory SQL filtering over Pandas DataFrames loaded from Excel/CSV files during RAG query execution.
- **Pandas & OpenPyXL**: Data parsing and Excel processing libraries for ingestion and RAG dataset inspection.
- **Passlib & Python-Jose**: Security and authentication utilities for PBKDF2-SHA256 password hashing and JWT token generation/validation.
- **SlowAPI**: Rate limiting middleware for protecting sensitive endpoints (e.g., authentication routes).
- **Librosa & SoundFile**: Audio signal processing utilities for handling uploaded audio files during voice interactions.

### Frontend & Mobile
- **React (v18.2.0)**: Single Page Application framework powering the web interface.
- **React Router DOM (v6.21.0)**: Client-side routing for seamless navigation across athlete dashboards, loggers, analytics, and coach portals.
- **Capacitor (v8.3.4)**: Native cross-platform runtime wrapping the React app for Android and mobile platforms. Provides native camera access (`@capacitor/camera`), speech recognition (`@capacitor-community/speech-recognition`), haptics (`@capacitor/haptics`), and status bar control (`@capacitor/status-bar`).
- **Recharts (v2.10.3)**: Composable charting library for rendering volume trends, 1RM progression curves, PCA scatter plots, and macro distribution charts.
- **Lucide React (v1.8.0)**: Modern icon library.
- **React Body Highlighter (v2.0.5)**: Interactive SVG human body model for visualizing targeted muscle groups and active injury zones.
- **@stream-io/video-react-sdk (v1.40.1)**: Real-time WebRTC video call SDK for live coach-athlete video consultations.
- **@vapi-ai/web (v2.6.1)**: Voice AI web client enabling real-time conversational voice calls with the HPI AI Assistant.
- **@react-oauth/google (v0.13.5)**: Google OAuth 2.0 integration for seamless single sign-on.

---

## 3. Project Structure

```
Hpi/
├── .env                           # Root environment variables
├── requirements.txt               # Backend Python dependencies
├── PROJECT_OVERVIEW.md            # Complete application documentation
├── GETTING_STARTED.md             # Quick-start setup guide
├── backend/                       # FastAPI application root
│   ├── main.py                    # FastAPI factory, CORS, static mounts, lifespan seeding
│   ├── database.py                # PostgreSQL schema SQL, connection pool, seed migrations
│   ├── rag_config.py              # Singleton Qdrant/Groq clients and vector constants
│   ├── create_coaches.py          # Script for seeding synthetic coach accounts & avatars
│   ├── aura_fit.db                # Legacy SQLite database file
│   ├── core/                      # Core configuration
│   │   └── config.py              # Settings model reading environment variables
│   ├── models/                    # Pydantic schemas for request/response validation
│   │   ├── user.py                # User profile & stats schemas
│   │   ├── workout.py             # Workout, Set, Exercise & PR schemas
│   │   ├── metric.py              # Dashboard summary, PCA, GBDT & analytics schemas
│   │   ├── chat.py                # Direct messaging schemas
│   │   └── measurements.py        # Body measurement schemas
│   ├── repositories/              # Database repository access layer (Data Mapper pattern)
│   │   ├── base.py                # Abstract base repository with raw SQL helpers
│   │   ├── user_repo.py           # User CRUD & streak/stats queries
│   │   ├── workout_repo.py        # Workout, set, exercise & PR persistence
│   │   ├── metric_repo.py         # Session metrics & PCA matrix queries
│   │   └── chat_repository.py     # 1-on-1 direct message & conversation queries
│   ├── routes/                    # API Endpoints (27 router modules)
│   │   ├── ai_recommend.py        # /api/ai-recommend (Unified Groq AI workout planner)
│   │   ├── analytics.py           # /api/analytics (Dashboard summary & HPI Insights)
│   │   ├── auth.py                # /api/auth (Register, login, OTP, Google OAuth, /me)
│   │   ├── bodyweight.py          # /api/bodyweight (Weight log CRUD & history)
│   │   ├── challenges.py          # /api/challenges (Fitness challenge tracking)
│   │   ├── chat.py                # /api/chat (HPI AI Agent, action blocks, Whisper ASR)
│   │   ├── coach.py               # /api/coach (Coach portal, hiring, reviews, check-ins)
│   │   ├── coach_ai_report.py     # /api/coach-ai-report (AI client progress summary)
│   │   ├── coach_chat.py          # /api/coach-chat (Coach direct messaging)
│   │   ├── coach_schedule.py      # /api/coach-schedule (Calendar sessions & blocks)
│   │   ├── events.py              # /api/events (Community workshops & registrations)
│   │   ├── exercise_notes.py      # /api/exercise-notes (Per-exercise athlete notes)
│   │   ├── exercises.py           # /api/exercises (Exercise library, custom ex, media)
│   │   ├── fatigue.py             # /api/fatigue (Borg RPE & fatigue questionnaire)
│   │   ├── injuries.py            # /api/injuries (Injury log CRUD & body parts)
│   │   ├── measurements.py        # /api/measurements (Tape measure body stats)
│   │   ├── metrics.py             # /api/metrics (Calculated workout metrics)
│   │   ├── notifications.py       # /api/notifications (User notification inbox)
│   │   ├── nutrition.py           # /api/nutrition (Food library, meal logs, AI scanner)
│   │   ├── onboarding.py          # /api/onboarding (27-step athlete questionnaire)
│   │   ├── progress.py            # /api/progress (Progress charts & volume trends)
│   │   ├── progress_photos.py     # /api/progress-photos (Front/back photo timeline)
│   │   ├── recommendations.py     # /api/recommendations (Rule-based program matcher)
│   │   ├── sleep.py               # /api/sleep (Sleep duration & quality log)
│   │   ├── users.py               # /api/users (User profile CRUD & CV upload)
│   │   ├── video_call.py          # /api/video-call (Stream.io WebRTC tokens)
│   │   └── workouts.py            # /api/workouts (Workout logging, sets, PRs)
│   ├── services/                  # Business logic layer
│   │   ├── analytics_service.py   # Volume moving averages & dashboard summary calculations
│   │   ├── auth_service.py        # Password hashing, JWT tokens, OTP verification
│   │   ├── challenge_service.py   # Challenge loader & lookup
│   │   ├── email_service.py       # SMTP email sender for OTP authentication
│   │   ├── exercise_service.py    # Canonical exercise seeding & fuzzy media lookup
│   │   ├── food_service.py        # Food library CSV seeding & bulk upserts
│   │   ├── ingestion_service.py   # Strong CSV parser & session aggregation
│   │   ├── nutrition_service.py   # BMR, TDEE, macro distribution algorithms
│   │   ├── recommendation_engine.py # Plan selection & health condition modifiers
│   │   └── recommendation_service.py # Program catalog & BMI classifier
│   ├── pipeline/                  # Hybrid RAG Pipeline for AI Context Enhancement
│   │   ├── schema_retriever.py    # Stage 1A: Loads SQL schema YAML docs
│   │   ├── question_classifier.py # Stage 1B: Classifies questions using Groq
│   │   ├── sql_generator.py       # Stage 1C: Generates read-only DuckDB SQL queries
│   │   ├── sql_executor.py        # Stage 1D: Executes SQL against DuckDB DataFrame
│   │   ├── text_rag.py            # Stage 2: Qdrant filtered vector search + BGE rerank
│   │   ├── context_builder.py     # Stage 3: Formats retrieved member profiles into prompt context
│   │   └── retrieval_pipeline.py  # Orchestrator running Stages 1A -> 3
│   ├── data_engine/               # Zero-Dependency Data Science Engine
│   │   ├── engine.py              # DataMatrix, StatEngine, LinearAlgebra, MathUtils (1679 lines)
│   │   └── synthetic_gen.py       # Knuth LCG random generator & Log Strength Progression model
│   ├── scripts/                   # Data seeding & maintenance scripts
│   │   ├── patch_food_macros.py   # In-place patcher for food macro contents
│   │   └── seed_exercises.py      # Seeder for 1,324 dataset exercises with GIFs/images
│   └── data/                      # JSON & CSV static datasets
│       ├── strong_raw.csv         # Strong workout export dataset
│       ├── workout_plans.json     # Predefined workout plans catalog
│       └── food/                  # Food nutrition CSV files
├── RAG/                           # RAG Indexing & Backfill Tools
│   ├── gym_recommendation.xlsx    # 2,000-member synthetic gym recommendation dataset
│   ├── embed_gym_bge.py           # Embeds Excel rows using BAAI/bge-large-en-v1.5
│   └── backfill_qdrant.py         # Backfills missing vectors into Qdrant cloud
├── vectors/                       # Local cached embedding files
│   ├── embeddings.npy             # NumPy vector array (1024-dim)
│   ├── ids.npy                    # NumPy point ID array
│   └── metadata.csv               # Raw row metadata + embedded text
├── exercises-dataset-main/        # Static Exercise Media Dataset
│   ├── data/exercises.json        # 1,324 exercise definitions with instruction steps
│   ├── images/                    # High-res exercise starting position images
│   └── videos/                    # Demonstration MP4/GIF animations
└── frontend/                      # React Single Page Application & Capacitor Native wrapper
    ├── package.json               # Frontend dependencies & Capacitor build scripts
    └── src/
        ├── App.js                 # Top-level React router & theme provider
        ├── index.css              # Global design system, glassmorphism & dark mode tokens
        ├── pages/                 # React page components (Dashboard, LogWorkout, Coach, etc.)
        └── components/            # Reusable UI components, modals, HpiChat, VapiCallModal
```

---

## 4. Features

### 4.1 Ambient AI Agent "Hpi" & Action Parsing
- **Description**: Floating conversational AI assistant available on all screens. Accepts natural language or voice inputs to log workouts, track meals, record water intake, and answer training queries with scientific rationale.
- **User-Facing Behavior**: Lifter can type/speak *"I did 3 sets of bench press at 100kg for 8 reps"*. Hpi responds with coaching feedback and automatically logs the workout into the database without opening a form. If asked *"Show me how to do incline dumbbell fly"*, Hpi renders a GIF demonstration directly in the chat modal.
- **Implementation File(s)**: [chat.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/chat.py), [exercise_service.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/services/exercise_service.py), [retrieval_pipeline.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/pipeline/retrieval_pipeline.py).
- **Key Functions/Classes**:
  - [chat()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/chat.py#L114-L287) in `backend/routes/chat.py`
  - [get_exercise_by_id_or_name()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/services/exercise_service.py#L256-L322) in `backend/services/exercise_service.py`
  - [get_context_for_question()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/pipeline/retrieval_pipeline.py#L15-L118) in `backend/pipeline/retrieval_pipeline.py`

### 4.2 Unified AI Workout Recommender ("Coach Rurik")
- **Description**: Multi-factor AI workout plan generator that reads athlete training history, active injuries, fatigue levels, medical conditions (hypertension/diabetes), and user goals to build customized multi-day workout splits.
- **User-Facing Behavior**: Athlete selects goal, experience, and training days. Coach Rurik evaluates recent volume trends, fatigue scores, and safety constraints, returning a JSON split with exercise selections, sets/reps, rest intervals, and a personalized safety note.
- **Implementation File(s)**: [ai_recommend.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/ai_recommend.py).
- **Key Functions/Classes**:
  - [ai_recommend()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/ai_recommend.py#L278-L413) in `backend/routes/ai_recommend.py`
  - [fetch_user_context()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/ai_recommend.py#L113-L190) in `backend/routes/ai_recommend.py`
  - [build_prompt()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/ai_recommend.py#L193-L275) in `backend/routes/ai_recommend.py`

### 4.3 Analytics & Mathematical Data Engine
- **Description**: Zero-dependency pure-Python analytics engine executing matrix transformations, OLS linear regression, moving averages, Epley/Brzycki 1RM estimates, INOL calculation, Wilks score, and PCA/GBDT modeling.
- **User-Facing Behavior**: Dashboard displays weekly volume trends, predicted volume slopes, estimated 1RM PR records, fatigue indices, and active muscle group distribution pie charts.
- **Implementation File(s)**: [engine.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/data_engine/engine.py), [analytics_service.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/services/analytics_service.py), [analytics.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/analytics.py).
- **Key Functions/Classes**:
  - [DataMatrix](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/data_engine/engine.py#L62-L840) in `backend/data_engine/engine.py`
  - [StatEngine](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/data_engine/engine.py#L916-L1146) in `backend/data_engine/engine.py`
  - [MathUtils](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/data_engine/engine.py#L1153-L1298) in `backend/data_engine/engine.py`
  - [compute_dashboard_summary()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/services/analytics_service.py#L60-L161) in `backend/services/analytics_service.py`

### 4.4 Nutrition & AI Meal Scanning
- **Description**: BMR/TDEE nutrition target calculator, food library manager, recipe builder, and Groq-powered natural language meal scanner.
- **User-Facing Behavior**: Athlete enters weight, height, activity level, and goal (fat loss / muscle gain). System calculates Mifflin-St Jeor BMR and target macros. Athlete can log individual food items or type *"Scramble 3 eggs with avocado and whole wheat toast"*, which AI parses into calories, protein, carbs, fat, and fiber.
- **Implementation File(s)**: [nutrition.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/nutrition.py), [nutrition_service.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/services/nutrition_service.py), [food_service.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/services/food_service.py).
- **Key Functions/Classes**:
  - [NutritionService.calculate_recommendation()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/services/nutrition_service.py#L67-L143) in `backend/services/nutrition_service.py`
  - [scan_meal()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/nutrition.py#L136-L188) in `backend/routes/nutrition.py`

### 4.5 Coach Portal & Client Roster Management
- **Description**: End-to-end coaching platform enabling coaches to invite/hire athletes, review client training logs, generate AI client progress reports, assign custom workout programs/nutrition targets, host community events, and hold WebRTC video calls.
- **User-Facing Behavior**: Coach opens Client Roster, views connected athlete performance metrics, requests an AI progress report summary, sends custom program assignments, or starts a live video call via Stream.io.
- **Implementation File(s)**: [coach.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/coach.py), [coach_ai_report.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/coach_ai_report.py), [video_call.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/video_call.py).
- **Key Functions/Classes**:
  - [get_roster()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/coach.py#L140-L200) in `backend/routes/coach.py`
  - [generate_coach_ai_report()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/coach_ai_report.py#L82-L210) in `backend/routes/coach_ai_report.py`
  - [get_call_token()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/video_call.py#L30-L75) in `backend/routes/video_call.py`

### 4.6 Exercise Library & Dataset (1,324 Exercises)
- **Description**: Comprehensive catalog of 1,324 exercises complete with primary/secondary muscles, body parts, equipment, instruction steps, and local image/GIF static assets.
- **User-Facing Behavior**: User searches exercises by name, body part, equipment, or muscle group. Views animated GIF execution guides and step-by-step written form cues. Users can also create custom exercises.
- **Implementation File(s)**: [exercises.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/exercises.py), [seed_exercises.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/scripts/seed_exercises.py), [exercise_service.py](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/services/exercise_service.py).
- **Key Functions/Classes**:
  - [search_exercises()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/routes/exercises.py#L40-L100) in `backend/routes/exercises.py`
  - [seed()](file:///c:/Users/rayen/Desktop/Projets/Hpi/backend/scripts/seed_exercises.py#L14-L141) in `backend/scripts/seed_exercises.py`

---

## 5. Function-Level Reference

### `backend/main.py`
- `lifespan(app: FastAPI)`
  - *Summary*: Async context manager executed on application startup and shutdown.
  - *Parameters*: `app` (`FastAPI`)
  - *Returns*: `AsyncGenerator`
  - *Side Effects*: Runs database migrations, seeds canonical exercises, recommendation rules, food items, dataset exercises, synthetic coach events, and auto-ingests `strong_raw.csv`.
- `_ensure_default_user(conn: psycopg2.extensions.connection) -> int`
  - *Summary*: Ensures a fallback unauthenticated user exists in DB for CSV ingestion.
  - *Parameters*: `conn` (`psycopg2 connection`)
  - *Returns*: `int` (User ID)
  - *Side Effects*: Inserts a new user record into `users` table if missing.
- `create_app() -> FastAPI`
  - *Summary*: Application factory initializing middleware, Limiter, exception handlers, static directory mounts, and API routers.
  - *Parameters*: None
  - *Returns*: `FastAPI` instance
  - *Side Effects*: Mounts static directories for dataset images/videos and user uploads.
- `health()`
  - *Summary*: Returns system health metrics and database record counts.
  - *Parameters*: None
  - *Returns*: `dict`
  - *Side Effects*: Executes count queries against database.
- `root()`
  - *Summary*: Root API status endpoint.
  - *Parameters*: None
  - *Returns*: `dict`
  - *Side Effects*: None.
- `manual_ingest(user_id: int = 1, csv_path: str = settings.CSV_PATH)`
  - *Summary*: Admin trigger to manually ingest a CSV export.
  - *Parameters*: `user_id` (`int`), `csv_path` (`str`)
  - *Returns*: `dict` / `JSONResponse`
  - *Side Effects*: Writes workouts, sets, metrics, and PRs to PostgreSQL database.

---

### `backend/database.py`
- `exercise_urls(row: dict) -> dict`
  - *Summary*: Converts relative image/GIF file paths into absolute HTTP backend URLs.
  - *Parameters*: `row` (`dict`)
  - *Returns*: `dict`
  - *Side Effects*: Modifies dictionary keys `image_url` and `gif_url`.
- `_raw_connection() -> psycopg2.extensions.connection`
  - *Summary*: Creates a non-pooled raw PostgreSQL connection.
  - *Parameters*: None
  - *Returns*: `psycopg2 connection`
  - *Side Effects*: Opens a network socket connection to PostgreSQL.
- `seed_synthetic_coach_reviews(conn) -> None`
  - *Summary*: Seeds synthetic athlete star ratings and review comments under all coach profiles.
  - *Parameters*: `conn` (`psycopg2 connection`)
  - *Returns*: `None`
  - *Side Effects*: Inserts rows into `coach_reviews` table.
- `seed_synthetic_fares2024(conn) -> None`
  - *Summary*: Ensures test user `fares2024` has complete onboarding data.
  - *Parameters*: `conn` (`psycopg2 connection`)
  - *Returns*: `None`
  - *Side Effects*: Updates `users` table for user `fares2024`.
- `seed_synthetic_events(conn) -> None`
  - *Summary*: Seeds synthetic community workshops and masterclasses with AI poster images.
  - *Parameters*: `conn` (`psycopg2 connection`)
  - *Returns*: `None`
  - *Side Effects*: Copies poster images to `uploads/events` and inserts rows into `events` and `event_registrations`.
- `init_db() -> None`
  - *Summary*: Idempotent database schema creation wrapper with retry logic.
  - *Parameters*: None
  - *Returns*: `None`
  - *Side Effects*: Executes DDL SQL statements on database.
- `_get_pool()`
  - *Summary*: Lazily initializes a threaded PostgreSQL connection pool (2-50 connections).
  - *Parameters*: None
  - *Returns*: `psycopg2.pool.ThreadedConnectionPool`
  - *Side Effects*: Initializes global connection pool object.
- `release_connection(conn: Optional[psycopg2.extensions.connection]) -> None`
  - *Summary*: Returns a connection back to the thread pool or closes it.
  - *Parameters*: `conn` (`psycopg2 connection`)
  - *Returns*: `None`
  - *Side Effects*: Modifies pool connection state.
- `get_connection() -> psycopg2.extensions.connection`
  - *Summary*: Acquires a connection from pool with raw connection fallback.
  - *Parameters*: None
  - *Returns*: `psycopg2 connection`
  - *Side Effects*: Borrows connection from pool.
- `get_db() -> Generator[psycopg2.extensions.connection, None, None]`
  - *Summary*: FastAPI dependency yielding a database connection with auto-commit/rollback.
  - *Parameters*: None
  - *Returns*: `Generator` yielding `psycopg2 connection`
  - *Side Effects*: Handles transaction commit on success or rollback on exception.

---

### `backend/data_engine/engine.py`
- `DataMatrix(data, nrows, ncols, fill)`
  - *Summary*: Pure-Python n-dimensional row-major matrix class.
  - *Methods*: `zeros`, `ones`, `identity`, `from_flat`, `from_columns`, `from_rows`, `dot`, `T`, `determinant`, `inverse`, `solve`, `mean_center`, `normalize`, `covariance_matrix`, `correlation_matrix`, `row_percentile`.
  - *Side Effects*: None (pure mathematical computations).
- `VectorOps`
  - *Summary*: Standalone vector operations on Python float lists.
  - *Methods*: `dot`, `norm`, `normalize`, `add`, `sub`, `scale`, `outer`, `cosine_similarity`, `project`.
  - *Side Effects*: None.
- `StatEngine`
  - *Summary*: Descriptive & inferential statistical methods.
  - *Methods*: `mean`, `median`, `mode`, `variance`, `std`, `skewness`, `kurtosis`, `percentile`, `iqr`, `pearson_r`, `spearman_r`, `linear_regression`, `moving_average`, `exponential_moving_average`, `z_scores`, `outlier_iqr`, `histogram`, `bootstrap_ci`.
  - *Side Effects*: None.
- `MathUtils`
  - *Summary*: Fitness domain formulas and interpolation helpers.
  - *Methods*: `lerp`, `clamp`, `log_progress`, `sigmoid`, `softmax`, `relu`, `linear_interpolate`, `epley_1rm`, `brzycki_1rm`, `wilks_score`, `volume_load`, `relative_intensity`, `fatigue_index`, `inol`.
  - *Side Effects*: None.
- `DistanceMetrics`
  - *Summary*: Distance metric calculations for vectors and matrices.
  - *Methods*: `euclidean`, `squared_euclidean`, `manhattan`, `chebyshev`, `cosine_distance`, `pairwise_euclidean`, `nearest_neighbor`.
  - *Side Effects*: None.
- `LinearAlgebra`
  - *Summary*: Advanced matrix decomposition and regression solvers.
  - *Methods*: `gram_schmidt`, `power_iteration`, `deflate`, `top_k_eigenpairs`, `qr_decomposition`, `pseudo_inverse`, `least_squares`.
  - *Side Effects*: None.

---

### `backend/data_engine/synthetic_gen.py`
- `LCG(seed: int)`
  - *Summary*: Knuth multiplicative Linear Congruential Generator ($X_{n+1} = (aX_n + c) \bmod m$).
  - *Methods*: `next_int`, `random`, `uniform`, `randint`, `choice`, `gauss`, `triangular`, `sample`.
- `ExerciseProfile(name: str)`
  - *Summary*: Per-exercise distribution builder from real CSV data.
  - *Methods*: `add_set`, `finalise`.
- `ProgressionModel(base_weight: float)`
  - *Summary*: Models logarithmic strength growth curve over session index $t$.
  - *Methods*: `weight_at(t, lcg)`, `reps_at(t, weight, target_reps, lcg)`.
- `generate_biometric_series(n_sessions, lcg, ...)`
  - *Summary*: Generates sleep hours and stress timeseries via piecewise linear interpolation.
- `generate_synthetic_dataset(real_csv_path, output_path, target_rows, seed, verbose)`
  - *Summary*: Main generator script building 2,000 synthetic workout rows and writing semicolon-delimited CSV.

---

### `backend/pipeline/` (Hybrid RAG Pipeline)
- `schema_retriever.get_schema_context() -> str`
  - *Summary*: Stage 1A: Loads `sql_schema_docs.yaml` and formats it into prompt context.
- `question_classifier.classify_question(question: str) -> QuestionType`
  - *Summary*: Stage 1B: Classifies user query into one of 6 categories via Groq (`llama-3.1-8b-instant`).
- `sql_generator.generate_sql(question, schema_context, question_type) -> str`
  - *Summary*: Stage 1C: Generates read-only DuckDB SQL query using Groq (`llama-3.3-70b-versatile`).
- `sql_executor.execute_sql(query: str) -> pd.DataFrame`
  - *Summary*: Stage 1D: Executes generated SQL against DuckDB DataFrame and returns matching rows.
- `sql_executor.get_candidate_ids(df: pd.DataFrame) -> List[int]`
  - *Summary*: Extracts candidate member IDs from DataFrame result.
- `text_rag.search_and_rerank(question, candidate_ids, top_k_search, top_k_final) -> List[Dict]`
  - *Summary*: Stage 2: Performs Qdrant filtered vector search (`BAAI/bge-large-en-v1.5`) and reranks with cross-encoder (`BAAI/bge-reranker-v2-m3`).
- `context_builder.build_retrieved_context(question, top_candidates) -> str`
  - *Summary*: Stage 3: Formats top member profiles into structured context string.
- `retrieval_pipeline.get_context_for_question(question: str) -> str`
  - *Summary*: Pipeline orchestrator calling Stages 1A through 3 sequentially with timing logs and failover defaults.

---

### `backend/services/`
- `analytics_service.compute_volume_progression(timeseries, window) -> dict`
  - *Summary*: Computes moving averages and linear regression slope for volume timeseries.
- `analytics_service.compute_dashboard_summary(metric_rows, pr_rows, timeseries, active_injuries_count) -> dict`
  - *Summary*: Aggregates total workouts, tonnage, best 1RMs, weekly volume, PRs, muscle splits, and AI insights.
- `auth_service.hash_password(plain: str) -> str` / `verify_password(plain, stored) -> bool`
  - *Summary*: PBKDF2-SHA256 password hashing with 16-byte random salt and 260,000 iterations.
- `auth_service.create_access_token(data: dict) -> str` / `decode_token(token: str) -> dict`
  - *Summary*: Encodes and decodes HS256 JWT access tokens.
- `exercise_service.get_exercise_by_id_or_name(conn, id_or_name) -> dict`
  - *Summary*: Looks up exercise by ID or fuzzy ILIKE match, prioritizing exercises with valid image/GIF media paths.
- `food_service.seed_food_items(conn)` / `_upsert_food_items_bulk(conn, items)`
  - *Summary*: Bulk upserts food items into `food_items` database table from CSV files.
- `ingestion_service.ingest_csv(filepath, conn, user_id) -> dict`
  - *Summary*: Parses Strong CSV export, computes derived 1RMs/volume, and persists workouts, sets, metrics, and PRs.
- `nutrition_service.NutritionService.calculate_recommendation(data: dict) -> dict`
  - *Summary*: Calculates Mifflin-St Jeor BMR, activity expenditure, calorie surplus/deficit, and macro split.
- `recommendation_engine.get_recommendation(user_id, level, goal, days_available, hypertension, diabetes, last_plan_id, db)`
  - *Summary*: Matches user profile against predefined workout plans and modifies exercises for health flags.

---

### `backend/repositories/`
- `user_repo.UserRepository`: Methods `get_by_id`, `get_by_email`, `get_all`, `create`, `update`, `delete`, `get_stats` (calculates workout count, volume, average duration, favourite exercise, days trained, and active streak).
- `workout_repo.WorkoutRepository`: Methods `get_or_create_exercise`, `list_exercises`, `get_by_id`, `get_by_user`, `create`, `delete`, `get_sets`, `insert_set`, `get_workout_detail`, `get_workout_summaries`, `get_personal_records`, `upsert_personal_record`, `get_volume_timeseries`, `get_exercise_progress`, `get_heatmap_data`.
- `metric_repo.MetricRepository`: Methods `get_by_id`, `get_by_user`, `get_by_workout`, `create`, `delete`, `update_pca`, `update_prediction`, `get_feature_matrix_rows`.
- `chat_repository.ChatRepository`: Methods `create_message`, `get_messages`, `mark_as_read`, `get_conversations`, `clear_conversation`.

---

## 6. Complex Logic Deep-Dives

### 6.1 Logarithmic Strength Progression Model (`backend/data_engine/synthetic_gen.py`)
- **Plain Language Explanation**: Real human strength adaptations follow a logarithmic curve — strength gains are rapid during early training phases and gradually slow down as an athlete approaches their genetic ceiling (diminishing returns). The `ProgressionModel` simulates realistic working weights for session index $t$ using logarithmic growth, day-to-day readiness noise, periodic deload sessions, and standard plate weight rounding.
- **Underlying Formula**:
  $$\text{ideal\_weight}(t) = \text{base\_weight} \times \min\left(1 + k \cdot \ln\left(1 + \frac{t}{\text{decay}}\right), \text{plateau}\right)$$
  $$\text{weight}(t) = \text{round}_{2.5}\left(\text{ideal\_weight}(t) + \mathcal{N}(0, \sigma^2)\right)$$
- **Edge Cases Handled**:
  - Deload sessions: Every 8 sessions, a 35% probability triggers a 12% deload reduction.
  - Weight rounding: Output is rounded to nearest 2.5 kg to reflect standard gym plate increments.
  - Minimum floor: Weight cannot fall below 50% of original base weight.
- **Example**:
  - *Input*: `base_weight = 100.0`, `gain_rate = 0.20`, `decay = 25.0`, `t = 50`
  - *Calculation*: $1 + 0.20 \times \ln(1 + 50/25) = 1 + 0.20 \times 1.0986 = 1.2197 \rightarrow 121.97\text{ kg}$
  - *Output*: `122.5 kg` (after 2.5 kg rounding).

---

### 6.2 Gaussian Elimination with Partial Pivoting Matrix Inversion (`backend/data_engine/engine.py`)
- **Plain Language Explanation**: To solve linear systems and compute matrix inverses for OLS linear regression without numpy, `DataMatrix.inverse()` creates an augmented matrix $[A \mid I]$ and applies Gauss-Jordan elimination. It scans each pivot column for the largest absolute coefficient (partial pivoting) to prevent numerical instability or division by near-zero values.
- **Underlying Algorithm**:
  1. Construct augmented matrix $[A_{n \times n} \mid I_{n \times n}]$.
  2. For column $k \in [0, n-1]$:
     - Find row $p \ge k$ where $|A_{p,k}|$ is maximized. Swap row $k$ and row $p$.
     - Divide row $k$ by pivot element $A_{k,k}$.
     - Subtract multiples of row $k$ from all other rows $i \neq k$ so that $A_{i,k} = 0$.
  3. Extract right half $[I_{n \times n} \mid A^{-1}_{n \times n}]$.
- **Edge Cases Handled**:
  - Singular matrix detection: If pivot $|A_{p,k}| < 10^{-12}$, raises `SingularMatrixError`.
- **Example**:
  - *Input*: $A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$
  - *Output*: $A^{-1} = \begin{pmatrix} -2.0 & 1.0 \\ 1.5 & -0.5 \end{pmatrix}$

---

### 6.3 Hybrid RAG Question Classification & SQL Filtering Pipeline (`backend/pipeline/`)
- **Plain Language Explanation**: When an athlete asks Hpi a natural language question (e.g. *"What diet and exercises work best for overweight males with hypertension?"*), Hpi executes a 4-stage retrieval pipeline:
  1. **Stage 1A**: Loads YAML schema docs defining table schema and example query pairs.
  2. **Stage 1B**: Uses Groq (`llama-3.1-8b-instant`) to classify the intent (`RECOMMENDATION`, `PERFORMANCE_ANALYSIS`, etc.).
  3. **Stage 1C**: Generates a read-only DuckDB SQL query (`SELECT ID FROM gym_data WHERE Sex='Male' AND Level='Overweight' AND Hypertension='Yes'`).
  4. **Stage 1D**: Executes SQL against DuckDB DataFrame, extracting candidate member IDs.
  5. **Stage 2**: Passes candidate IDs to Qdrant for vector similarity filtering (`BAAI/bge-large-en-v1.5`), then reranks top 20 candidates with cross-encoder (`BAAI/bge-reranker-v2-m3`).
  6. **Stage 3**: Formats top 5 reranked member profiles into an augmented context block injected into the LLM system prompt.
- **Edge Cases Handled**:
  - SQL injection prevention: Strict regex regex check `_is_safe()` rejects DDL/DML keywords (`DROP`, `DELETE`, `UPDATE`, `INSERT`) and multi-statement semicolons. Fallbacks to `SELECT * FROM gym_data LIMIT 50` on failure.

---

### 6.4 Epley 1RM & INOL (Intensity Number of Lifts) Calculation (`backend/data_engine/engine.py`)
- **Plain Language Explanation**:
  - **1RM Estimation**: Uses the Epley equation to estimate 1-Repetition Maximum strength from submaximal sets.
  - **INOL**: Quantifies training fatigue and systemic stress per exercise. Higher INOL scores indicate higher neurological and muscular fatigue.
- **Underlying Formulas**:
  $$\text{1RM}_{\text{Epley}} = \text{weight} \times \left(1 + \frac{\text{reps}}{30}\right)$$
  $$\text{INOL} = \frac{\text{reps}}{100 - \text{Intensity}\%}, \quad \text{where } \text{Intensity}\% = \frac{\text{weight}}{\text{1RM}} \times 100$$
- **Example**:
  - *Input*: `weight = 100 kg`, `reps = 5`
  - *1RM Calculation*: $100 \times (1 + 5/30) = 116.67\text{ kg}$
  - *Intensity%*: $(100 / 116.67) \times 100 = 85.71\%$
  - *INOL Calculation*: $5 / (100 - 85.71) = 5 / 14.29 = 0.35$

---

## 7. Data Flow / Architecture

### Architecture Pattern
HPI uses a clean **Layered Architecture** combining the **Repository Pattern (Data Mapper)** with an **Agentic AI Action Pipeline**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend Layer (React & Capacitor)              │
│  - Dashboard, LogWorkout, HpiChat, CoachPortal, VideoCallModal, Audio  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP / REST / WebRTC
┌──────────────────────────────────▼─────────────────────────────────────┐
│                           API Layer (FastAPI Routers)                  │
│  - auth, workouts, nutrition, analytics, chat, coach, ai_recommend     │
└─────────┬────────────────────────┬─────────────────────────┬───────────┘
          │                        │                         │
┌─────────▼───────────┐  ┌─────────▼───────────┐   ┌─────────▼───────────┐
│   Services Layer    │  │ RAG Pipeline Layer  │   │ Data Engine Layer   │
│ - auth_service      │  │ - schema_retriever  │   │ - DataMatrix        │
│ - ingestion_service │  │ - sql_generator     │   │ - StatEngine        │
│ - nutrition_service │  │ - DuckDB executor   │   │ - LinearAlgebra     │
│ - exercise_service  │  │ - Qdrant + BGE Rerank│  │ - MathUtils         │
└─────────┬───────────┘  └─────────┬───────────┘   └─────────────────────┘
          │                        │
┌─────────▼────────────────────────▼───────────┐
│                 Repository Layer             │
│ - UserRepository     - WorkoutRepository     │
│ - MetricRepository   - ChatRepository        │
└─────────────────────────┬────────────────────┘
                          │
┌─────────────────────────▼────────────────────┐
│         Database Layer (Supabase PostgreSQL)  │
│  auth_users, users, workouts, sets, metrics, │
│  food_items, coach_relationships, events     │
└──────────────────────────────────────────────┘
```

### Data Flow Steps (Example: Hpi Ambient Chat Workout Logging)
1. **User Request**: User sends message to `POST /api/chat`: *"Logged 4 sets of squat at 120kg for 6 reps"*.
2. **Authentication**: `get_current_user_id` dependency decodes JWT bearer token and extracts `user_id`.
3. **Context Enrichment**: `chat()` router queries `users` table for athlete profile and 27-question onboarding responses.
4. **LLM Execution**: System prompt + athlete context sent to Groq (`llama-3.3-70b-versatile`). LLM generates response text + appended hidden action block `[ACTION: {"type": "log_workout", "data": ...}]`.
5. **Action Parsing**: Router detects action block, extracts JSON, and invokes `WorkoutCreate` model.
6. **Persistence**: `WorkoutRepository.create()` inserts workout row, `WorkoutRepository.insert_set()` inserts 4 set rows, and `ingestion_service.aggregate_session()` calculates session volume, INOL, and Epley 1RM.
7. **Response**: FastAPI returns `ChatResponse(reply="Great work! I've logged 4 sets of Squat at 120kg (total volume: 2,880kg).")`.

---

## 8. Setup & Run Instructions

### Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18.0 or higher (npm v9+)
- **PostgreSQL**: Cloud Supabase database or local PostgreSQL instance

### 1. Environment Setup

#### Root `.env` Configuration
Create `.env` in project root:
```env
SUPABASE_URL=https://dxgdgdunflxzilhschab.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
DATABASE_URL=postgresql://postgres.dxgdgdunflxzilhschab:ex453667hamed@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
SECRET_KEY=hpi-secret-change-in-production-2026
GROQ_API_KEY=gsk_your_groq_api_key
CLUSTER_ENDPOINT=https://your-qdrant-cluster.cloud.qdrant.io:6333
CLUSTER_API=your_qdrant_api_key
```

#### Backend `.env` Configuration
Create `backend/.env` (or copy from root `.env`):
```env
DATABASE_URL=postgresql://postgres.dxgdgdunflxzilhschab:ex453667hamed@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
SECRET_KEY=hpi-secret-change-in-production-2026
GROQ_API_KEY=gsk_your_groq_api_key
```

---

### 2. Backend Setup & Run

#### Install Dependencies
```bash
# Navigate to project root
cd c:\Users\rayen\Desktop\Projets\Hpi

# Install Python requirements
pip install -r requirements.txt
```

#### Start FastAPI Server
```bash
cd backend
uvicorn main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

---

### 3. Frontend Setup & Run

#### Install Dependencies
```bash
cd c:\Users\rayen\Desktop\Projets\Hpi\frontend
npm install
```

#### Start React Development Server
```bash
npm start
```
- Application Web URL: `http://localhost:3000`

---

### 4. Native Android / Mobile Sync (Optional)
```bash
cd frontend
# Sync React build assets into Capacitor native Android container
npm run cap:build

# Open project in Android Studio
npm run cap:android
```

---

### 5. Running Verification & Self-Tests

#### Data Engine Self-Test
```bash
python backend/data_engine/engine.py
```
*Executes unit tests verifying matrix multiplication, determinant calculation, Gaussian elimination inverse, PCA power iteration, and Epley 1RM formulas.*

#### Synthetic Generator Self-Test
```bash
python backend/data_engine/synthetic_gen.py --test
```
*Verifies LCG Knuth pseudo-random generator reproducibility, uniform/Gaussian distributions, and logarithmic strength growth monotonicity.*
