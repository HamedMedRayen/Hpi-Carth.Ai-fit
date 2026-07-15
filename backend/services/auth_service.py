"""HPI — Authentication Service (bcrypt-safe)"""
import psycopg2
import psycopg2.extras
import hashlib, hmac, secrets, os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
import random
import string

from jose import JWTError, jwt

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import settings


def hash_password(plain: str) -> str:
    """PBKDF2-SHA256 hash with random salt — no external libs needed."""
    salt = secrets.token_hex(16)
    dk   = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 260000)
    return f"pbkdf2:{salt}:{dk.hex()}"


def verify_password(plain: str, stored: str) -> bool:
    if not stored.startswith("pbkdf2:"):
        return False
    _, salt, stored_hex = stored.split(":", 2)
    dk = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 260000)
    return hmac.compare_digest(dk.hex(), stored_hex)


def create_access_token(data: Dict[str, Any]) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def register_user(conn: psycopg2.extensions.connection, nickname: str, password: str, email: Optional[str] = None, role: str = "athlete") -> Dict[str, Any]:
    nickname = nickname.strip()
    if not nickname or not password:
        raise ValueError("Nickname and password are required.")
    if len(nickname) < 3:
        raise ValueError("Nickname must be at least 3 characters.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    if role not in ("athlete", "coach"):
        role = "athlete"
    
    email = email or f"{nickname}@hpi.local"
    
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id FROM auth_users WHERE nickname = %s OR email = %s", (nickname, email))
        existing = cur.fetchone()
    if existing:
        raise ValueError(f"Nickname or Email already taken.")
        
    pw_hash = hash_password(password)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "INSERT INTO auth_users (nickname, email, password_hash, provider) VALUES (%s, %s, %s, 'local') RETURNING id",
            (nickname, email, pw_hash)
        )
        auth_id = cur.fetchone()["id"]
        cur.execute(
            "INSERT INTO users (auth_id, name, email, role) VALUES (%s,%s,%s,%s)",
            (auth_id, nickname, email, role)
        )
        cur.execute("SELECT * FROM auth_users WHERE id=%s", (auth_id,))
        return dict(cur.fetchone())

# ── NEW: Social & OTP Logic ──────────────────────────────────

def get_or_create_user_social(conn: psycopg2.extensions.connection, email: str, name: str, provider: str) -> Dict[str, Any]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM auth_users WHERE email = %s", (email,))
        row = cur.fetchone()
        
        if row:
            # Update provider if it was something else? Usually we just return.
            return dict(row)
        
        # Create new user
        nickname = email.split('@')[0]
        cur.execute(
            "INSERT INTO auth_users (email, nickname, provider) VALUES (%s, %s, %s) RETURNING id",
            (email, nickname, provider)
        )
        auth_id = cur.fetchone()["id"]
        cur.execute(
            "INSERT INTO users (auth_id, name, email) VALUES (%s, %s, %s)",
            (auth_id, name or nickname, email)
        )
        cur.execute("SELECT * FROM auth_users WHERE id=%s", (auth_id,))
        return dict(cur.fetchone())

def generate_email_otp(conn: psycopg2.extensions.connection, email: str) -> str:
    otp = "".join(random.choices(string.digits, k=6))
    exp = datetime.utcnow() + timedelta(minutes=10)
    
    with conn.cursor() as cur:
        # Check if user exists, if not create a stub
        cur.execute("SELECT id FROM auth_users WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row:
            nickname = email.split('@')[0]
            cur.execute(
                "INSERT INTO auth_users (email, nickname, provider) VALUES (%s, %s, 'email-code') RETURNING id",
                (email, nickname)
            )
            auth_id = cur.fetchone()["id"]
            cur.execute("INSERT INTO users (auth_id, name, email) VALUES (%s, %s, %s)", (auth_id, nickname, email))
        
        cur.execute(
            "UPDATE auth_users SET email_otp = %s, email_otp_exp = %s WHERE email = %s",
            (otp, exp, email)
        )
    return otp

def verify_email_otp(conn: psycopg2.extensions.connection, email: str, otp: str) -> Optional[Dict[str, Any]]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM auth_users WHERE email = %s AND email_otp = %s AND email_otp_exp > %s",
            (email, otp, datetime.utcnow())
        )
        row = cur.fetchone()
        if not row:
            return None
            
        # Clear OTP after successful use
        cur.execute("UPDATE auth_users SET email_otp = NULL, email_otp_exp = NULL WHERE id = %s", (row["id"],))
        return dict(row)

def verify_google_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies Google ID token. Requires google-auth library."""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), settings.GOOGLE_CLIENT_ID)
        return {
            "email": idinfo['email'],
            "name": idinfo.get('name'),
            "picture": idinfo.get('picture')
        }
    except Exception as e:
        print(f"[GOOGLE AUTH ERROR] {e}")
        return None


def login_user(conn: psycopg2.extensions.connection, nickname: str, password: str) -> Optional[Dict[str, Any]]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM auth_users WHERE nickname=%s", (nickname.strip(),)
        )
        row = cur.fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        return None
    return dict(row)


def get_user_id_for_auth(conn: psycopg2.extensions.connection, auth_id: int) -> Optional[int]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id FROM users WHERE auth_id=%s", (auth_id,))
        row = cur.fetchone()
    return row["id"] if row else None
