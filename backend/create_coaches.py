import os
import shutil
import hashlib
import secrets
import psycopg2
import psycopg2.extras

# Database connection URL
DATABASE_URL = "postgresql://postgres.dxgdgdunflxzilhschab:ex453667hamed@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"

# Setup directory paths
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Path to generated artifacts
ARTIFACTS_DIR = r"C:\Users\rayen\.gemini\antigravity-ide\brain\d07149ba-2b03-40a2-a241-0e5a943f335c"

# Source avatars
AVATAR_FILES = [
    "coach_avatar_1_1784195390077.png",
    "coach_avatar_2_1784195400775.png",
    "coach_avatar_3_1784195412003.png",
    "coach_avatar_4_1784195424759.png",
    "coach_avatar_5_1784195437329.png"
]

def hash_password(plain: str) -> str:
    """PBKDF2-SHA256 hash with random salt — HPI compatible."""
    salt = secrets.token_hex(16)
    dk   = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 260000)
    return f"pbkdf2:{salt}:{dk.hex()}"

COACHES_DATA = [
    {"name": "Youssef Mansour", "email": "youssef.mansour@hpi.fit", "nickname": "coach_youssef", "sex": "M", "age": 28, "experience": "advanced", "goal": "muscle_gain"},
    {"name": "Fatima Al-Harbi", "email": "fatima.alharbi@hpi.fit", "nickname": "coach_fatima", "sex": "F", "age": 31, "experience": "intermediate", "goal": "fat_loss"},
    {"name": "Tarek Kabbani", "email": "tarek.kabbani@hpi.fit", "nickname": "coach_tarek", "sex": "M", "age": 42, "experience": "elite", "goal": "powerlifting"},
    {"name": "Layla Haddad", "email": "layla.haddad@hpi.fit", "nickname": "coach_layla", "sex": "F", "age": 27, "experience": "intermediate", "goal": "general_fitness"},
    {"name": "Karim Nour", "email": "karim.nour@hpi.fit", "nickname": "coach_karim", "sex": "M", "age": 34, "experience": "advanced", "goal": "bodybuilding"},
    {"name": "Hamza Zein", "email": "hamza.zein@hpi.fit", "nickname": "coach_hamza", "sex": "M", "age": 29, "experience": "intermediate", "goal": "athletics"},
    {"name": "Amira Fakhoury", "email": "amira.fakhoury@hpi.fit", "nickname": "coach_amira", "sex": "F", "age": 32, "experience": "advanced", "goal": "cardio_endurance"},
    {"name": "Rami Halabi", "email": "rami.halabi@hpi.fit", "nickname": "coach_rami", "sex": "M", "age": 45, "experience": "elite", "goal": "strength_training"},
    {"name": "Yasmin Shahin", "email": "yasmin.shahin@hpi.fit", "nickname": "coach_yasmin", "sex": "F", "age": 26, "experience": "beginner", "goal": "flexibility"},
    {"name": "Omar Farooq", "email": "omar.farooq@hpi.fit", "nickname": "coach_omar", "sex": "M", "age": 33, "experience": "advanced", "goal": "olympic_weightlifting"}
]

def main():
    print("[+] Connecting to Supabase database...")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        with conn.cursor() as cur:
            # First clean up the old coaches
            print("[+] Cleaning up previously inserted synthetic coaches...")
            cur.execute("DELETE FROM auth_users WHERE email LIKE '%@hpi.fit'")
            print(f"[+] Cleaned up {cur.rowcount} coaches.")
            
        for idx, data in enumerate(COACHES_DATA):
            # 1. Copy avatar image
            src_avatar_name = AVATAR_FILES[idx % len(AVATAR_FILES)]
            src_avatar_path = os.path.join(ARTIFACTS_DIR, src_avatar_name)
            
            dest_filename = f"coach_avatar_{idx + 1}.png"
            dest_filepath = os.path.join(UPLOADS_DIR, dest_filename)
            
            if os.path.exists(src_avatar_path):
                shutil.copy2(src_avatar_path, dest_filepath)
                print(f"[+] Copied {src_avatar_name} to uploads/{dest_filename}")
            else:
                print(f"[!] Warning: Source avatar {src_avatar_name} not found at path {src_avatar_path}")
                
            avatar_url = f"http://localhost:8000/api/uploads/{dest_filename}"
            
            # 2. Insert Auth User
            with conn.cursor() as cur:
                pw_hash = hash_password("password123")
                cur.execute(
                    "INSERT INTO auth_users (nickname, email, password_hash, provider) VALUES (%s, %s, %s, 'local') RETURNING id",
                    (data["nickname"], data["email"], pw_hash)
                )
                auth_id = cur.fetchone()["id"]
                
                # 3. Create User Profile with Coach role
                cur.execute(
                    """
                    INSERT INTO users (auth_id, name, email, sex, age, experience, goal, role, avatar_url, approved)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'coach', %s, TRUE)
                    """,
                    (auth_id, data["name"], data["email"], data["sex"], data["age"], data["experience"], data["goal"], avatar_url)
                )
                
            print(f"[+] Successfully registered Arabic-named coach: {data['name']} (Email: {data['email']}, Nickname: {data['nickname']})")
            
        conn.commit()
        print("[+] Finished seeding Arabic-named coaches successfully!")
    except Exception as e:
        conn.rollback()
        print(f"[x] Error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
