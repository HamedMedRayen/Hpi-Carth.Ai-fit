# Hpi — Getting Started Guide

> **Your personal workout analytics platform, powered by custom ML, recovery correlations, and AI-driven coaching.**

---

## What You Have

The `Hpi` repository is a complete, production-grade full-stack cross-platform application (Web, Android & iOS) designed for comprehensive workout tracking, physiological recovery analysis, smart nutrition logging, and personalized coaching.

### Key Modules:
- **Backend (FastAPI)**: Serves a highly optimized REST API connected to a PostgreSQL database (designed for Supabase). It automatically manages its database schema and seeds body metrics, food items, and exercise catalogs instantly on startup.
- **Frontend (React)**: A visually dense, glassmorphism-themed UI utilizing `Recharts` for interactive analytics, featuring rich modules like interactive Borg RPE fatigue tracking, calorie logging with Gemini Vision AI meal scanning, body sizing maps, visual progress comparison, and fitness challenges.
- **Local Asset Library**: The `exercises-dataset-main` folder holds over 1,300 detailed canonical exercises, fully offline, complete with descriptive JSON, anatomical SVGs, and execution GIFs.
- **Data Engine**: A standalone mathematical computation package supporting Principal Component Analysis (PCA) power iterations, synthetic generators, and custom GBDT models.

---

## Prerequisites

Before starting, ensure you have the following installed:

| Tool | Version | Check with |
|------|---------|-----------|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| PostgreSQL | - | Local instance or [Supabase](https://supabase.com/) |
| Groq API Key | - | Get it free from the [Groq Console](https://console.groq.com/) |
| Gemini API Key | - | Get it from [Google AI Studio](https://aistudio.google.com/) |

---

## Step 1 — Database & LLM Configuration

Hpi relies on **PostgreSQL** for relational storage, **Groq** for conversational AI execution, and **Gemini 2.5 Vision** for AI photo meal scanning:
1. Set up a PostgreSQL database (we recommend creating a free project on Supabase).
2. Grab your connection URI (e.g., `postgresql://user:password@host:port/dbname`).
3. Create your Groq and Gemini API Keys.
4. In the `backend/` directory, create a `.env` file:

```env
DATABASE_URL=postgresql://your_user:your_password@your_host:6543/postgres
GROQ_API_KEY=gsk_your_actual_groq_api_key_goes_here
GEMINI_API_KEY=your_actual_gemini_api_key_goes_here
```

---

## Step 2 — Start the Backend (Python API)

Open a terminal in the `backend` folder and run:

```bash
# Strongly recommended to use a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

You should see an output indicating the application has successfully booted.
**What just happened automatically on startup:**
1. The FastAPI `lifespan` hook connects to your PostgreSQL database.
2. Built all necessary SQL schema tables (`users`, `workouts`, `sets`, `measurements`, `challenges`, `nutrition_logs`, `injuries`, etc.) with proper constraints.
3. Seeded the local `exercises-dataset-main` containing 1,300+ canonical exercises directly into the database.
4. Seeded default workout recommendation rules and global nutrition food tables.
5. Spun up static routes (`/exercises-dataset/images`, `/exercises-dataset/videos`) to serve high-resolution anatomical SVGs and instructional GIFs offline.

You can verify the backend is active by visiting the interactive swagger documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Step 3 — Start the Frontend (React App)

Open a **second terminal** in the `frontend` folder and run:

```bash
# Install all Node packages
npm install

# Start the app
npm start
```

Your browser will automatically open to [http://localhost:3000](http://localhost:3000).

1. You will be greeted by the **Authentication Page**. Create a new account.
2. Upon login, you will land on the **Command Center Dashboard**.
3. Explore the navigation sidebar: customize your themes, take your first **Fatigue Check**, log a session in the **Workout Engine**, or engage the floating **Hpi Assistant** bubble in the bottom right corner!

---

## Step 4 — Run the Mobile App (Android)

Since Hpi uses Capacitor to bridge the React app to native mobile, you can run it directly on an Android device or emulator.

**Prerequisite:** [Android Studio](https://developer.android.com/studio) installed.

### Option A — Development (Live Reload) ⚡
```bash
cd frontend
npm start               # Terminal 1: React dev server
npm run dev:android     # Terminal 2: Launches Android Studio with live reload URL
```

### Option B — Production Build 📦
```bash
cd frontend
npm run build:android
npx cap open android
```

---

## Core Workflows to Explore

### 1. Hpi AI Fitness Assistant & Vapi Voice Calling
Click the Brain icon floating in the bottom-right corner to open the assistant panel:
- Talk to Hpi about hypertrophy, recovery, or custom schedules.
- **Voice Dictation**: Tap the Mic button and dictate your query hands-free.
- **Agentic Logging**: Try sending: *"Hey Hpi, log that I just did 3 sets of squats at 100kg for 6 reps"* or *"I drank a 500ml water glass"*. Hpi will confirm and **silently update your workout/nutrition records in the database on the fly!**

### 2. Smart Nutrition Hub & Gemini Vision AI Scanner
Navigate to the `Nutrition Hub` tab:
- **AI Camera / Photo Scanning**: Take a picture or upload a photo of your meal. The Gemini 2.5 Vision engine analyzes the food items, calculates calorie and macro breakdowns, and saves it directly to your nutrition log.
- **Natural Language Text Scanning**: Type what you ate in natural language (e.g. *"three eggs, a slice of avocado toast, and a protein shake"*) and submit.
- **Calculator**: Open the settings panel to calculate TDEE & BMR parameters and save custom macro targets (Protein, Carbs, Fat, Water) for Bulk, Cut, or Maintenance programs.

### 3. Interactive Injury Silhouette Map
Navigate to `Injury Log`:
- Check out the anatomical vector map. Click any muscle zone to specify pain levels (1-10 slider), describe the pain, and click **Save Injury Log** to record it.
- Pain zones highlight in red/orange on the silhouette.
- Check active pain records in the history panel and mark them as healed as recovery progresses.

### 4. Sleep & Volume Analytics Correlation
Navigate to `Sleep & Recovery`:
- Log your sleeping hours and subjective rest quality (Terrible, Poor, Fair, Good, Excellent).
- The system renders a Recharts visualization overlaying sleep graphs against daily workout lifting tonnage to detect physical burnout trends.

### 5. Growth Trends, Sizing & Progress Photos
Navigate to `Measurements` or `Progress Photos`:
- Input body metrics (Waist, Arm, Chest, etc.) or upload front, side, and back transformation photos.
- The visual anatomical map displays comparative flags (Green = Decreased, Red = Increased, Cyan = Stable) charting progress trends over time.

### 6. Coach & Client Portal
Navigate to `Coach Zone`:
- Invite athletes to your roster using their email or username to monitor their training volume, fatigue history, and injury alerts.
- Build custom workout splits and suggest routines directly to athletes.
- Chat in real-time inside the coach messaging window.

---

## Troubleshooting

**`psycopg2` Installation Errors**
→ Ensure you have a C compiler installed, or simply use `pip install psycopg2-binary` (which is standard in `requirements.txt`).

**`groq` / `google-genai` Package Missing Errors**
→ Make sure you have activated your virtual environment before running the server, or execute `pip install -r requirements.txt`.

**The app loads but shows no data or 401 Unauthorized**
→ Ensure your backend FastAPI port is active at `http://localhost:8000`. If you changed ports, update the baseline client URL in `frontend/src/utils/api.js`.

**Missing Images or GIFs in the Exercise Picker**
→ Make sure the `exercises-dataset-main` folder exists at the root of the project parallel to `backend`. The FastAPI application mounts this directory using relative pathing on startup.
