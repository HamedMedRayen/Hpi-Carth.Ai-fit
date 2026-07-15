"""HPI — Application Configuration (Supabase)"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from this file)
_ROOT = Path(__file__).parent.parent.parent
load_dotenv(_ROOT / ".env")

class Settings:
    APP_NAME: str    = "HPI API"
    VERSION: str     = "2.0.0"
    DESCRIPTION: str = "Production-grade workout analytics API"

    # ── Supabase ────────────────────────────────────────────
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")   # service_role key
    DATABASE_URL: str = os.environ["DATABASE_URL"]

    # ── Data paths ──────────────────────────────────────────
    DATA_DIR: str = str(_ROOT / "data")
    CSV_PATH: str = os.getenv("CSV_PATH", str(_ROOT / "data" / "strong_raw.csv"))

    API_PREFIX: str  = "/api"
    _frontend_url = os.getenv("FRONTEND_URL", "")
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
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
