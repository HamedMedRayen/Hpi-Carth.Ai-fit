<div align="center">

<br />

<img src="./frontend/public/logo/hpi-logo-white-bg.png" alt="HPI Logo" height="180" />

<p><strong>Intelligent Cross-Platform Fitness Tracking, AI-Powered Coaching & Advanced Recovery Analytics</strong></p>

<p>
  <a href="https://github.com/HamedMedRayen/Hpi/stargazers">
    <img src="https://img.shields.io/github/stars/HamedMedRayen/Hpi?style=flat-square&color=00BCD4" alt="Stars" />
  </a>
  <a href="https://github.com/HamedMedRayen/Hpi/issues">
    <img src="https://img.shields.io/github/issues/HamedMedRayen/Hpi?style=flat-square&color=00BCD4" alt="Issues" />
  </a>
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=flat-square" alt="Python" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square" alt="React" />
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?style=flat-square" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Android-3DDC84?style=flat-square" alt="Android" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=flat-square" alt="PostgreSQL" />
</p>

<p>
  <a href="#features">Features</a> &nbsp;•&nbsp;
  <a href="#technology-stack">Stack</a> &nbsp;•&nbsp;
  <a href="#project-structure">Structure</a> &nbsp;•&nbsp;
  <a href="#getting-started">Getting Started</a> &nbsp;•&nbsp;
  <a href="#future-perspectives">Future Perspectives</a> &nbsp;•&nbsp;
  <a href="#contributing">Contributing</a>
</p>

<br />

</div>

---

**Hpi** is a premium, cross-platform fitness application (Web and Android, with iOS on the roadmap) built for athletes, coaches, and data-driven training enthusiasts. It goes far beyond standard workout logging — combining AI-generated training plans, progressive overload analytics, interactive anatomical visualizations, physical injury mapping, smart nutrition tracking with AI-powered meal scanning, sleep-to-volume correlation, progress photo galleries, subjective fatigue scoring, seasonal challenges, and a dedicated coach-to-athlete portal into a single, beautiful glassmorphism-styled platform.

The web application is built with **Create React App**, and the same React codebase is wrapped with **Capacitor** to ship as a native **Android** app — there is no React Native involved anywhere in the stack.

---

## Features

### 1. Command Center — Dashboard & Custom Widgets
A glassmorphism-styled analytics hub providing a complete view of your training lifecycle:
- **Volume Progression Curve**: Dynamic Recharts chart tracking total training load tonnage over time.
- **Weekly Volume & Intensity**: Side-by-side bar charts evaluating current macrocycles vs. previous weeks.
- **Training Split Distribution**: Interactive donut charts rendering muscle group volume concentration.
- **Activity Heatmap**: GitHub-style grid visualization tracking consecutive training consistency across a 12-week macrocycle.
- **Streak Tracker & Quick Stats**: Gamified streak counter tracking current and all-time consecutive training days, alongside animated stat rings.
- **Customizable Dashboard Layout**: Modular widget system allowing users to pin, unpin, and reorder widgets dynamically (`AddWidgetModal`, `WidgetCard`).
- **Dynamic Canvas Theme Engine**: Interactive visual background particle themes including Fire, Growth, Sky, Night, Flower, Leaf, and Monochrome (`OrbThemeSwitcher`).

### 2. Multi-Modal AI Coach — "Hpi"
An agentic, conversational AI fitness coach accessible on every view:
- **Natural Language Queries**: Powered by Groq (`openai/gpt-oss-120b`) for intelligent training advice, form tips, and customized guidance.
- **Double-RAG Recommendation System**: A two-stage retrieval pipeline combining structured SQL-based filtering with semantic retrieval. The first stage filters relevant athlete data based on fitness goals, experience, demographics, and training context. The second stage uses BGE-M3 embeddings followed by a cross-encoder reranker to surface the most relevant recommendations before passing context to the LLM.
- **Voice Dictation Mode**: Hands-free voice input integrated via the Web Speech API and native Capacitor speech recognition (`HpiChat.jsx`).
- **Vapi Live Voice Calling**: Interactive real-time voice call modal (`VapiCallModal`) for conversational AI phone-style coaching sessions.
- **Medical & Laboratory Report Analysis**: Upload a medical report, blood test, or laboratory panel (PDF or Image) directly in Hpi Chat for instant biomarker interpretation and athletic programming adjustments.
  - 📄 **PDF Reader Engine**:
    - **Library / Engine**: `pypdf` (v6.16.1) (`pypdf.PdfReader`)
    - **Mechanism**: Directly parses the internal PDF Document Object Model (DOM) and extracts text streams, font encodings, and multi-page layout structures.
    - **Benefit**: Because it reads the native digital text layer, extraction is 100% deterministic and lossless (zero OCR noise or misread numbers on digital PDFs). If a PDF is purely scanned (an image container with no embedded text layer), it automatically routes through the OCR engine.
  - 🔬 **OCR Engine & Deep Learning Models (For Images & Scans)**:
    - **Framework**: `EasyOCR` (v1.7.2) powered by PyTorch with GPU/CUDA hardware acceleration (CPU fallback).
    - **Underlying Neural Network Models**:
      1. **Text Detection Model — CRAFT (*Character Region Awareness for Text Detection*)**:
         - *Architecture*: Deep CNN with a VGG-16 feature backbone and U-Net-style skip connections.
         - *Role*: Accurately detects arbitrary text boxes, tabular columns, and word boundaries across dense laboratory and medical report layouts.
      2. **Text Recognition Model — CRNN (*Convolutional Recurrent Neural Network*)**:
         - *Architecture*: ResNet (feature extraction) + Bidirectional LSTM (BiLSTM) (sequence modeling) + CTC (*Connectionist Temporal Classification*) (decoder).
         - *Role*: Transcribes detected text into alphanumeric characters, medical abbreviations, laboratory units (e.g., `mg/dL`, `ng/mL`, `µmol/L`, `U/L`), and clinical reference ranges.
  - 🧠 **Medical Analysis & Reasoning**:
    - **Model**: Groq LLM (`openai/gpt-oss-120b`)
    - **Role**: Takes the extracted text payload and runs clinical sports medicine reasoning, cross-referencing biomarkers against standard physiological ranges, athletic recovery needs, and nutrition/training programming.
- **Agentic Auto-Tracking**:
  > [!TIP]
  > Tell Hpi what you trained, ate, or drank in plain language (e.g., *"I did 3 sets of bench press at 80kg for 8 reps"* or *"I ate a chicken bowl with 600 kcal and drank 500ml water"*), and Hpi generates hidden action payload blocks. The backend intercepts and parses these blocks via regular expressions to **automatically log exercises, sets, foods, or hydration into the database on your behalf**!

### 3. Smart Nutrition Hub & AI Vision Scanner
Fuel your performance with a next-generation calorie and macronutrient manager:
- **Macro Targets & Circular Progress**: Real-time tracking of Calories, Protein, Carbs, Fats, and Water Hydration against customizable target rings (`MacroRing`).
- **Qwen Vision Meal Scanner**: Capture or upload meal photos directly from your camera or gallery (`MealScanModal`). The AI vision engine, served via Groq (`qwen/qwen3.6-27b`), analyzes the image, identifies food items, estimates portion sizes, calculates macros/calories, and logs the meal instantly.
- **Fuzzy & Full-Text Food Search**: High-speed hybrid PostgreSQL `pg_trgm` fuzzy matching over thousands of food items with recency ranking (`FoodSearchModal`).
- **Scientific BMR/TDEE Calculator**: Calculates precise macro goals based on age, height, weight, activity levels, and training goals (Bulk, Cut, or Maintain) (`NutritionCalculator`).
- **Speed Log Utilities**: Quick Add calories/macros, Custom Recipe Builder, Custom Food Registry, and 1-click "Copy Meals from Yesterday".

### 4. Advanced Workout Engine & Templates
A zero-friction, feature-rich logging environment:
- **Smart Sets**: Log Warm-up, Working, Drop, Superset, and Failure iterations with full rep and weight metadata (`LogWorkout`).
- **Live Rest Timers**: Rest period countdown timers with visual progress, audio alerts, and native haptic feedback.
- **In-Session PR Detection**: Real-time calculation of 1-Rep Max (1RM) using the Epley formula with celebratory PR animations when breaking personal records.
- **Progressive Overload Prompts**: Real-time comparison with historical performance, prompting rep/weight increments when appropriate (`ProgressiveOverloadSuggestion`).
- **Workout Templates**: Save favorite routines as templates for rapid 1-click workout initiation (`TemplateModal`).
- **Exercise Notes**: Per-exercise notes persistence for form cues, equipment settings, and fatigue notes.

### 5. Canonical Exercise Reference Library & Custom Builder
An embedded reference library built for precision:
- **1,300+ Canonical Exercises**: Filterable by muscular target (Lats, Quads, Chest, etc.), equipment constraints (Barbell, Dumbbell, Cable, Machine, Bodyweight), and movement patterns (`Exercises`).
- **Anatomical Visuals & Execution GIFs**: High-resolution muscle highlight SVGs and animated demonstration GIFs for every exercise (`ExerciseDetailSheet`).
- **Custom Exercise Creator**: Add user-defined custom exercises into your personal library (`CustomExerciseModal`).

### 6. Interactive Body Silhouette & Injury Log
Track physical safety and well-being with anatomical precision:
- **Interactive Body Silhouette SVGs**: Interactive front and back anatomical body maps (`BodySilhouette`, `BodyMap`, `InjuryLog`).
- **Pain Severity Grading**: Rate pain zones from 1 (mild discomfort) to 10 (severe pain) with anatomical region tagging.
- **Color-Coded Pain Heatmaps**: Active injury zones glow with dynamic color gradients (red/orange overlays) on the body map.
- **Injury Lifecycle Tracking**: Monitor active injuries, log recovery notes, and mark injuries as healed.

### 7. Sizing, Body Measurements & Progress Photos
Monitor your physical transformation through objective data and visual evidence:
- **11 Sizing Verticals**: Log measurements for Neck, Shoulders, Chest, Waist, Hips, Left/Right Arms, Left/Right Thighs, and Left/Right Calves (`Measurements`).
- **Bodyweight Tracker**: Dedicated bodyweight logger with historical progression charts (`BodyWeightForm`).
- **Growth & Trend Indicators**: Instant visual cues (Green for Decreased, Cyan for Constant, Red for Increased) comparing latest entries against previous logs.
- **Progress Photos Gallery**: Upload front, side, and back transformation photos with date stamping, filtering, and side-by-side comparative overlays (`ProgressPhotos`).

### 8. Sleep & Recovery Tracker
Monitor recovery quality to optimize muscle growth and performance:
- **Sleep Logging**: Record sleep duration (hours) and categorical quality ratings (Terrible, Poor, Fair, Good, Excellent) (`SleepTracker`).
- **Sleep-to-Volume Correlation Plot**:
  > [!NOTE]
  > Interactive Recharts visualizer overlaying sleep metrics directly onto weekly training volume to highlight recovery correlation and prevent overtraining (`SleepWidget`).

### 9. Subjective Fatigue & Readiness Engine
Evaluate central nervous system readiness before hitting the gym:
- **Borg RPE & Fatigue Assessment Quiz**: Interactive questionnaire evaluating central nervous system fatigue, muscle soreness, sleep quality, and mental readiness (`FatigueCheck`, `FatigueQuiz`, `FatigueResult`).
- **Readiness Scoring**: Calculates dynamic readiness scores used to adjust recommended workout volume and intensity.

### 10. Coaching Zone — Athlete & Trainer Ecosystem
A comprehensive two-way management portal connecting trainers with athletes:
- **Dual Roles**: Sign up or switch between Athlete and Coach profiles (`CoachDashboard`).
- **Coach Roster & Athlete Inspection**: Trainers can generate invite codes, manage client rosters, inspect daily workout logs, check fatigue scores, review active injuries, and track measurement trends.
- **AI Progress Reports**: Groq-generated client progress summaries built from training history, fatigue, and injury data (`coach_ai_report.py`).
- **Live Video Consultations**: WebRTC video calls between coach and athlete powered by Stream.io (`VideoCallModal`).
- **Community Events & Masterclasses**: Coaches host workshops and community events with registration tracking.
- **Workout Suggestion Engine**: Build custom workout splits and suggest routines directly into athletes' logging queues (`SuggestWorkoutModal`).
- **Direct Coach Chat**: Real-time direct messaging between coaches and athletes with unread message badges (`CoachChatModal`).
- **Program Builder**: Design multi-week custom workout plans (`PlanPickerModal`).
- **Report a Client**: Trainers can flag a problematic or abusive client directly from the roster, submitting a report for platform moderation review.

### 11. RAG-Powered Insights Engine
A hybrid retrieval-augmented generation pipeline grounding AI answers in real member data:
- **Multi-Stage Retrieval**: Classifies a question with Groq, generates a read-only DuckDB SQL query against a schema-aware dataset, then narrows further with Qdrant vector search and cross-encoder reranking (`bge-large-en-v1.5` / `bge-reranker-v2-m3`).
- **Grounded Recommendations**: Answers to open-ended questions (e.g., training/diet guidance for specific health profiles) are backed by retrieved, ranked member context rather than the LLM alone.

### 12. Gamified Seasonal Fitness Challenges
Push your limits with structured community challenges:
- **Seasonal Challenge Boards**: Browse cardio, strength, hypertrophy, nutrition, and habit challenges (`Challenges`).
- **Difficulty Tiers**: Filter challenges by Beginner, Intermediate, Advanced, and Elite levels.
- **Interactive Challenge Analytics**: Track overall completion progress %, days remaining, and check-in checkmark grids.

### 13. AI Gym Recommendation System
Hyper-personalized routine and split recommendations, powered by two complementary engines:
- **Double-RAG Recommendation Engine**: The same two-stage architecture used by the Hpi AI Coach — structured SQL-based retrieval filters relevant athlete profiles by fitness goals, experience level, demographics, and training context, then BGE-M3 semantic retrieval plus a cross-encoder reranker surface the most relevant training patterns before a temperature-tuned LLM generates the final routine.
- **In-House Math Engine**: A zero-dependency Python engine (`data_engine/`) implementing Gradient Boosted Decision Trees (GBDT), manual Principal Component Analysis (PCA) via power iteration, and synthetic data interpolation, used to complement the RAG pipeline with statistically grounded program generation (`ai_recommend.py`).

### 14. In-App Notification Center
Stay up to date across the platform:
- **Alert & Notification Hub**: Manages invitations, suggested workouts from coaches, direct chat messages, and challenge milestones with unread counters (`NotificationCenter`).

### 15. Native Mobile Experience (Android)
Hpi provides a full native mobile application built with Capacitor:
- **Dedicated Mobile Architecture**: Powers a 5-tab bottom navigation shell (`MobileAppShell`, `BottomNav`) with custom mobile views (`MobileDashboard`, `MobileWorkouts`, `MobileNutrition`, `MobileCoachingZone`, `MobileInjuryLog`, `MobileSleep`, `MobileProgress`, `MobileProfile`, `MobileBodyHub`, `MobileTrainHub`, `MobileExercises`, `MobileChallenges`, `MobileChat`).
- **Hardware & Plugin Integration**: Integrated `@capacitor/preferences`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`, `@capacitor/camera`, and `@capacitor-community/speech-recognition`.
- **Live Reload & Production Workflows**: Supports Fast Refresh emulator development (`npm run dev:android`) and static APK production builds (`npm run build:android`).

> [!NOTE]
> An iOS build is not yet available. The Capacitor wrapper is Android-only for the time being — see [Future Perspectives](#future-perspectives) for the roadmap.

---

## Technology Stack

### Frontend

| Technology | Role |
|---|---|
| Create React App (React 18) | Functional components, Hooks, and code splitting |
| React Router v6 | Client-side routing, session guards, and mobile navigation |
| Recharts | SVG-based interactive charts, progression curves, and recovery plots |
| Lucide React | Visual iconography system |
| Vanilla CSS | Modern glassmorphism design system, dynamic background themes, and CSS custom properties |

### Backend

| Technology | Role |
|---|---|
| Python 3.10+ | Core application language |
| FastAPI | High-performance ASGI web framework with Pydantic typing, async lifespan hooks, and auto-generated Swagger/ReDoc docs |
| Uvicorn | High-speed ASGI server |
| Groq SDK | `openai/gpt-oss-120b` for the Hpi AI Agent, unified workout generator, macro calculation refinement, and RAG SQL generation; `llama-3.1-8b-instant` for fast question classification |
| Qwen Vision (via Groq) | `qwen/qwen3.6-27b` multi-modal perception API for photo-based meal scanning |
| pypdf (v6.16.1) | Deterministic, lossless text extraction from digital PDFs' native text layer for lab/medical report uploads; falls back to OCR for scanned PDFs with no embedded text |
| EasyOCR (v1.7.2) | PyTorch-based OCR (GPU/CUDA with CPU fallback) for scanned/image lab reports — CRAFT (CNN + VGG-16 backbone) for text detection, CRNN (ResNet + BiLSTM + CTC) for text recognition |
| Qdrant Client | Vector database powering similarity search over indexed member/recommendation datasets |
| Sentence-Transformers / PyTorch / Transformers | Local embedding generation (`bge-large-en-v1.5`), cross-encoder reranking (`bge-reranker-v2-m3`), and local ASR speech-to-text |
| DuckDB | Embedded analytical SQL engine for fast in-memory filtering during RAG query execution |
| Psycopg2 | PostgreSQL querying, `ThreadedConnectionPool` connection pooling, and hybrid text search |
| Pandas & OpenPyXL | Data parsing and Excel/CSV ingestion for RAG datasets |
| Passlib & Python-Jose | PBKDF2-SHA256 password hashing and JWT token generation/validation |
| SlowAPI | Rate limiting middleware for sensitive endpoints |
| Librosa & SoundFile | Audio signal processing for voice interaction uploads |

### Mobile App (Android)

| Technology | Role |
|---|---|
| Capacitor | Cross-platform bridge wrapping the Create React App frontend into a native Android shell |
| React 18 & Router v6 | Dedicated mobile screens (`src/mobile/`) with 5-tab navigation |
| Vanilla CSS | Mobile theme system (`mobile.css`) with bottom-sheet animations |
| Recharts | Responsive sparklines, macro rings, and volume mini-charts |
| Native Plugins | `@capacitor/preferences`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`, `@capacitor/camera`, and `@capacitor-community/speech-recognition` |

### Real-Time & Integrations

| Technology | Role |
|---|---|
| @stream-io/video-react-sdk | WebRTC video call SDK for live coach-athlete video consultations |
| @vapi-ai/web | Voice AI web client for real-time conversational voice calls with the Hpi AI Assistant |
| @react-oauth/google | Google OAuth 2.0 single sign-on |
| React Body Highlighter | Interactive SVG human body model for muscle group and injury visualization |

### Database & Custom ML Engine

| Technology | Role |
|---|---|
| PostgreSQL (Supabase) | Primary relational database using `DATE_TRUNC`, similarity operators, and Full-Text Search (`pg_trgm`) |
| Custom Math Engine | Zero-dependency Python ML pipeline (`data_engine/`) implementing GBDT, manual PCA via power iteration, matrix operations, and Epley/Brzycki/Wilks formulas |
| Hybrid RAG Pipeline | Multi-stage retrieval (`pipeline/`): schema-aware SQL generation over DuckDB, then Qdrant vector search with cross-encoder reranking, for grounded AI insights |

---

## Project Structure

```
Hpi/
├── .env                            # Root environment variables
├── requirements.txt                # Backend Python dependencies
├── PROJECT_OVERVIEW.md             # Complete application documentation
├── GETTING_STARTED.md              # Quick-start setup guide
├── backend/                        # FastAPI application root
│   ├── main.py                     # App factory, CORS, static mounts, lifespan seeding
│   ├── database.py                 # PostgreSQL schema SQL, connection pool, seed migrations
│   ├── rag_config.py               # Singleton Qdrant/Groq clients and vector constants
│   ├── core/                       # Settings model reading environment variables
│   ├── models/                     # Pydantic request/response schemas
│   ├── repositories/               # Data Mapper-pattern DB access layer
│   ├── routes/                     # 27 API router modules (auth, workouts, nutrition, coach, chat, …)
│   ├── services/                   # Business logic layer (auth, nutrition, exercises, ingestion, …)
│   ├── pipeline/                   # Hybrid RAG pipeline (schema → SQL → DuckDB → Qdrant → rerank)
│   ├── data_engine/                # Zero-dependency math/stats/ML engine + synthetic data generator
│   ├── scripts/                    # Data seeding & maintenance scripts
│   └── data/                       # Static JSON/CSV datasets (workout plans, food, Strong export)
├── RAG/                            # RAG indexing & backfill tools (Qdrant embedding scripts)
├── vectors/                        # Cached local embedding files (NumPy vectors, IDs, metadata)
├── exercises-dataset-main/         # Static exercise media dataset (1,300+ entries, images, videos)
└── frontend/                       # Create React App SPA & Capacitor native (Android) wrapper
    ├── package.json                # Frontend dependencies & Capacitor build scripts
    └── src/
        ├── App.js                  # Top-level router & theme provider
        ├── index.css               # Global design system & glassmorphism tokens
        ├── pages/                  # Page components (Dashboard, LogWorkout, Coach, etc.)
        ├── components/             # Reusable UI components, modals, HpiChat, VapiCallModal
        └── mobile/                 # Dedicated mobile screens & 5-tab navigation shell
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A PostgreSQL instance ([Supabase free tier](https://supabase.com/) recommended)
- A Groq API Key (for the Hpi AI Assistant, Vision Meal Scanner, and RAG inference)

### 1. Clone the Repository
```bash
git clone https://github.com/HamedMedRayen/Hpi.git
cd Hpi
```

### 2. Configure Environment Variables
Create a `.env` file inside the `backend/` directory:
```env
DATABASE_URL=postgresql://user:password@host:port/dbname
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_CHAT_MODEL=openai/gpt-oss-120b
GROQ_VISION_MODEL=qwen/qwen3.6-27b
```

### 3. Set Up the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
> [!NOTE]
> The application includes a `lifespan` hook that automatically initializes the full SQL schema, seeds local exercises (1,300+ entries), food databases, and default recommendation rules on its first boot.

### 4. Set Up the Frontend
Open a new terminal in the root directory:
```bash
cd frontend
npm install
npm start
```
The application will open automatically at `http://localhost:3000` (Create React App's dev server).

### 5. Run the Mobile App (Android)

#### Option A — Development (Live Reload) ⚡
Get instant **Fast Refresh** inside the emulator:

1. **Start the React dev server:**
   ```bash
   cd frontend
   npm start
   ```
2. **Sync & launch Android Studio:**
   ```bash
   npm run dev:android
   ```
3. **Run on the emulator** in Android Studio (click the Play button).

> [!TIP]
> `dev:android` sets `CAPACITOR_LIVE_RELOAD=true` so the Capacitor config points to the dev server URL.

#### Option B — Production Build
Build, bundle, and sync static assets for a release-ready APK:

1. **Build and Sync:**
   ```bash
   cd frontend
   npm run build:android
   ```
2. **Open Android Studio:**
   ```bash
   npx cap open android
   ```
3. **Build APK / Run on Device:** Select target device/emulator and click **Run**.

---

## Future Perspectives

Planned directions for the platform:

- **Smartwatch & Wearable Integration**: Native connectivity with smartwatches and fitness bands (e.g. Wear OS, Apple Watch, Garmin) to pull heart rate, HRV, VO2 max, step count, and sleep-stage data directly into Hpi's Sleep & Recovery and Fatigue engines — replacing manual sleep/readiness entry with automatic, continuous sensor data and enabling live heart-rate zones during logged workouts.
- **iOS Release**: Extending the existing Capacitor wrapper to ship a native iOS build alongside the current Android app, using the same Create React App codebase.
- **Deeper Wearable-Aware AI Coaching**: Feeding wearable biometric streams into the RAG and Double-RAG pipelines so the AI Coach can factor real-time recovery and strain data into training and nutrition recommendations.

---

## Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## Hosting

Hpi is hosted by **Be Carth.AI Consulting**.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/HamedMedRayen">Hamed Med Rayen</a></sub>
</div>
