"""
Hpi — FastAPI Application v2
====================================
Run: uvicorn main:app --reload --port 8000
"""
import sys, os, time, psycopg2, psycopg2.extras, logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).parent))

from core.config import settings
from database import init_db, _raw_connection, get_connection, release_connection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("hpi")


# ── Lifespan ───────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Hpi API v2 — Starting up")

    # 1. Schema
    init_db()

    # Seeding and initialization
    def get_fresh_conn(existing_conn):
        if existing_conn is None or existing_conn.closed != 0:
            return _raw_connection()
        return existing_conn

    conn = None
    try:
        # 2. Seed body parts + canonical exercises
        try:
            conn = get_fresh_conn(conn)
            from services.exercise_service import seed_body_parts, seed_exercises
            seed_body_parts(conn)
            n_ex = seed_exercises(conn)
            log.info(f"[SEED] {n_ex} canonical exercises ready")
            conn.commit()
        except Exception as e:
            log.warning(f"[SEED] Exercise seeding warning: {str(e)[:100]}")

        # 3. Seed recommendation rules
        try:
            conn = get_fresh_conn(conn)
            from services.recommendation_service import seed_recommendation_rules
            n_rules = seed_recommendation_rules(conn)
            log.info(f"[SEED] {n_rules} recommendation rules ready")
            conn.commit()
        except Exception as e:
            log.warning(f"[SEED] Recommendation rules warning: {str(e)[:100]}")
            
        # 4. Seed food items
        try:
            conn = get_fresh_conn(conn)
            from services.food_service import seed_food_items
            seed_food_items(conn)
            log.info("[SEED] Food items seeding complete")
            conn.commit()
        except Exception as e:
            log.warning(f"[SEED] Food items seeding warning: {str(e)[:100]}")

        # 4. Seed dataset exercises
        try:
            conn = get_fresh_conn(conn)
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT COUNT(*) as cnt FROM exercises WHERE external_id IS NOT NULL")
                dataset_count = cur.fetchone()["cnt"]
            if dataset_count == 0:
                from scripts.seed_exercises import seed
                log.info("[SEED] Seeding 1324 exercises from local dataset...")
                n = seed(conn)
                log.info(f"[SEED] Dataset seeding complete — {n} exercises")
                conn.commit()
            else:
                log.info(f"[SEED] {dataset_count} dataset exercises already in DB")
        except Exception as e:
            log.warning(f"[SEED] Dataset exercise seeding warning: {str(e)[:100]}")

        # 6. Ensure a legacy default user for CSV import
        try:
            conn = get_fresh_conn(conn)
            user_id = _ensure_default_user(conn)
            conn.commit()
        except Exception as e:
            log.warning(f"[SEED] Default user warning: {str(e)[:100]}")
            user_id = 1

        # 6b. Seed synthetic events & registrations
        try:
            conn = get_fresh_conn(conn)
            from database import seed_synthetic_events
            seed_synthetic_events(conn)
            conn.commit()
            log.info("[SEED] Coach synthetic events seeding verified.")
        except Exception as e:
            log.warning(f"[SEED] Synthetic events warning: {str(e)[:100]}")

        # 7. Auto-ingest CSV
        try:
            conn = get_fresh_conn(conn)
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT COUNT(*) as cnt FROM workouts WHERE user_id=%s", (user_id,))
                cnt = cur.fetchone()["cnt"]
            if cnt == 0:
                csv_path = settings.CSV_PATH
                if os.path.exists(csv_path):
                    log.info(f"[SEED] Ingesting CSV: {csv_path}")
                    from services.ingestion_service import ingest_csv
                    import threading
                    
                    result_holder = {}
                    exception_holder = {}
                    
                    # We need a dedicated connection for the thread because psycopg2 
                    # connections are not necessarily thread-safe for simultaneous use
                    thread_conn = _raw_connection()
                    def ingest_with_timeout():
                        try:
                            t0 = time.time()
                            result_holder['result'] = ingest_csv(csv_path, thread_conn, user_id)
                            thread_conn.commit()
                            result_holder['elapsed'] = time.time() - t0
                        except Exception as e:
                            exception_holder['error'] = e
                        finally:
                            thread_conn.close()
                    
                    thread = threading.Thread(target=ingest_with_timeout, daemon=True)
                    thread.start()
                    thread.join(timeout=30)  # Wait max 30 seconds
                    
                    if thread.is_alive():
                        log.warning(f"[SEED] CSV ingestion timeout (>30s). Continuing with partial data.")
                    elif 'error' in exception_holder:
                        log.warning(f"[SEED] CSV ingestion error: {str(exception_holder['error'])[:100]}")
                    elif 'result' in result_holder:
                        result = result_holder['result']
                        elapsed = result_holder.get('elapsed', 0)
                        log.info(f"[SEED] Done in {elapsed:.2f}s — "
                                 f"{result.get('workouts_created',0)} workouts, "
                                 f"{result.get('sets_inserted',0)} sets")
                else:
                    log.warning(f"[SEED] CSV not found at {csv_path}")
        except Exception as e:
            log.warning(f"[SEED] CSV ingestion warning: {str(e)[:100]}")

    except Exception as e:
        log.error(f"[SEED] Unexpected error: {e}", exc_info=True)
    finally:
        if conn:
            conn.close()


    log.info("Ready — http://localhost:8000  |  Docs: http://localhost:8000/docs")
    yield
    log.info("Hpi shutdown.")


def _ensure_default_user(conn: psycopg2.extensions.connection) -> int:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id FROM users WHERE auth_id IS NULL LIMIT 1")
        row = cur.fetchone()
    if row:
        return row["id"]
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "INSERT INTO users (name, email, bodyweight, sex) VALUES (%s,%s,%s,%s) RETURNING id",
            ("Athlete", "athlete@hpi.app", 80.0, "M")
        )
        user_id = cur.fetchone()["id"]
    log.info(f"[SEED] Created default user id={user_id}")
    return user_id


# ── App factory ────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.VERSION,
        description=settings.DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS — allow configured origins with credentials and mobile scheme regex
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=r"https?://.*|capacitor://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        t0 = time.time()
        response = await call_next(request)
        ms = round((time.time() - t0) * 1000, 1)
        log.debug(f"{request.method} {request.url.path} → {response.status_code} ({ms}ms)")
        response.headers["X-Process-Time-Ms"] = str(ms)
        return response

    # Global error handler — returns JSON with detail
    @app.exception_handler(Exception)
    async def global_exc(request: Request, exc: Exception):
        log.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "detail": str(exc)},
        )

    # ── Routers ────────────────────────────────────────────────
    from routes.auth            import router as auth_router
    from routes.users           import router as users_router
    from routes.workouts        import router as workouts_router
    from routes.metrics         import router as metrics_router
    from routes.analytics       import router as analytics_router
    from routes.exercises       import router as exercises_router
    from routes.recommendations import router as reco_router
    from routes.bodyweight      import router as bodyweight_router
    from routes.progress        import router as progress_router
    from routes.fatigue         import router as fatigue_router
    from routes.measurements    import router as measurements_router
    from routes.exercise_notes  import router as notes_router
    from routes.chat            import router as chat_router
    from routes.progress_photos import router as photos_router
    from routes.nutrition       import router as nutrition_router
    from routes.sleep           import router as sleep_router
    from routes.injuries        import router as injuries_router
    from routes.coach           import router as coach_router
    from routes.ai_recommend import router as ai_reco_router
    from routes.challenges      import router as challenges_router
    from routes.notifications   import router as notifications_router
    from routes.coach_chat     import router as coach_chat_router
    from routes.coach_schedule import router as coach_schedule_router
    from routes.coach_ai_report import router as coach_ai_report_router
    from routes.events          import router as events_router
    from routes.onboarding     import router as onboarding_router
    from routes.video_call      import router as video_call_router

    API = settings.API_PREFIX
    app.include_router(auth_router,         prefix=API)
    app.include_router(onboarding_router,   prefix=API)
    app.include_router(video_call_router)

    app.include_router(users_router,        prefix=API)
    app.include_router(workouts_router,     prefix=API)
    app.include_router(metrics_router,      prefix=API)
    app.include_router(analytics_router,    prefix=API)
    app.include_router(exercises_router,    prefix=API)
    app.include_router(reco_router,         prefix=API)
    app.include_router(ai_reco_router,      prefix=API)
    app.include_router(bodyweight_router,   prefix=API)
    app.include_router(progress_router,     prefix=f"{API}/progress")
    app.include_router(fatigue_router,      prefix=f"{API}/fatigue")
    app.include_router(measurements_router, prefix=f"{API}/measurements")
    app.include_router(notes_router,        prefix=f"{API}/exercise-notes")
    app.include_router(chat_router,         prefix=API)
    app.include_router(photos_router,       prefix=f"{API}/progress-photos")
    app.include_router(nutrition_router,    prefix=f"{API}/nutrition")
    app.include_router(sleep_router,        prefix=f"{API}/sleep")
    app.include_router(injuries_router,     prefix=f"{API}/injuries")
    app.include_router(coach_router,        prefix=f"{API}/coach")
    app.include_router(events_router,       prefix=f"{API}/events")
    app.include_router(challenges_router,   prefix=API)
    app.include_router(notifications_router, prefix=API)
    app.include_router(coach_chat_router,     prefix=API)
    app.include_router(coach_schedule_router, prefix=API)
    app.include_router(coach_ai_report_router, prefix=API)

    # ── Static files — Exercise dataset images + videos ─────
    DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "exercises-dataset-main")
    images_dir = os.path.join(DATASET_PATH, "images")
    videos_dir = os.path.join(DATASET_PATH, "videos")
    if os.path.isdir(images_dir):
        app.mount(
            "/exercises-dataset/images",
            StaticFiles(directory=images_dir),
            name="exercise-images"
        )
        log.info(f"[STATIC] Mounted exercise images from {images_dir}")
    if os.path.isdir(videos_dir):
        app.mount(
            "/exercises-dataset/videos",
            StaticFiles(directory=videos_dir),
            name="exercise-videos"
        )
        log.info(f"[STATIC] Mounted exercise videos from {videos_dir}")

    # ── Static files — User Uploads ─────
    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")
    log.info(f"[STATIC] Mounted user uploads from {uploads_dir}")

    # ── System endpoints ───────────────────────────────────────
    @app.get("/health", tags=["System"])
    def health():
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT COUNT(*) as cnt FROM workouts")
                workouts_count = cur.fetchone()["cnt"]
                cur.execute("SELECT COUNT(*) as cnt FROM sets")
                sets_count = cur.fetchone()["cnt"]
                cur.execute("SELECT COUNT(*) as cnt FROM exercises")
                exercises_count = cur.fetchone()["cnt"]
                cur.execute("SELECT COUNT(*) as cnt FROM auth_users")
                users_count = cur.fetchone()["cnt"]
                cur.execute("SELECT COUNT(*) as cnt FROM recommendation_rules")
                rules_count = cur.fetchone()["cnt"]
            stats = {
                "workouts":     workouts_count,
                "sets":         sets_count,
                "exercises":    exercises_count,
                "users":        users_count,
                "rules":        rules_count,
            }
        finally:
            release_connection(conn)
        return {"status": "healthy", "version": settings.VERSION, **stats}

    @app.get("/", tags=["System"])
    def root():
        return {"app": settings.APP_NAME, "version": settings.VERSION, "docs": "/docs"}

    @app.post("/admin/ingest", tags=["Admin"])
    def manual_ingest(user_id: int = 1, csv_path: str = settings.CSV_PATH):
        if not os.path.exists(csv_path):
            return JSONResponse(status_code=404, content={"error": f"Not found: {csv_path}"})
        conn = get_connection()
        try:
            from services.ingestion_service import ingest_csv
            result = ingest_csv(csv_path, conn, user_id)
            conn.commit()
            return {"status": "ok", **result}
        finally:
            release_connection(conn)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
