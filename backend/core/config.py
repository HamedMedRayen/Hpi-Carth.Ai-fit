"""HPI — Application Configuration (Supabase)"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend folder and project root
_BACKEND_DIR = Path(__file__).parent.parent
_ROOT = _BACKEND_DIR.parent
load_dotenv(_ROOT / ".env")
load_dotenv(_BACKEND_DIR / ".env", override=True)

class Settings:
    APP_NAME: str    = "HPI API"
    VERSION: str     = "2.0.0"
    DESCRIPTION: str = "Production-grade workout analytics API"

    # ── Supabase ────────────────────────────────────────────
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")   # service_role key
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres.dxgdgdunflxzilhschab:ex453667hamed@aws-0-eu-west-1.pooler.supabase.com:6543/postgres")


    # ── Data paths ──────────────────────────────────────────
    DATA_DIR: str = str(_ROOT / "data")
    CSV_PATH: str = os.getenv("CSV_PATH", str(_ROOT / "data" / "strong_raw.csv"))

    API_PREFIX: str  = "/api"
    _frontend_url = os.getenv("FRONTEND_URL", "")
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://10.0.2.2:8000",
        "http://10.0.2.2:3000",
        "http://10.0.2.2",
        "capacitor://localhost",
        "http://localhost"
    ]
    if _frontend_url:
        CORS_ORIGINS.append(_frontend_url)

    # ── Auth ────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", "hpi-secret-change-in-production-2026")
    ALGORITHM:  str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── Google OAuth ────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # ── Email (OTP) ────────────────────────────────────────
    SMTP_SERVER: str   = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int     = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str     = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str    = os.getenv("EMAIL_FROM", "HPI <noreply@hpi.app>")

    # ── ExerciseDB API ──────────────────────────────────────
    EXERCISEDB_API_KEY: str = os.getenv("EXERCISEDB_API_KEY", "")

    # ── ML ──────────────────────────────────────────────────
    PCA_COMPONENTS: int          = 2
    GBDT_N_ESTIMATORS: int       = 50
    GBDT_MAX_DEPTH: int          = 3
    GBDT_LEARNING_RATE: float    = 0.1

settings = Settings()
