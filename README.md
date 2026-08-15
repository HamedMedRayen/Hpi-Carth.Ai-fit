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
  <a href="#contributing">Contributing</a>
</p>

<br />

</div>

---

<<<<<<< HEAD
**Hpi** is a premium, cross-platform fitness application (Web, Android, and iOS) built for athletes, coaches, and data-driven training enthusiasts. It goes far beyond standard workout logging — combining AI-generated training plans, progressive overload analytics, interactive anatomical visualizations, physical injury mapping, smart nutrition tracking with Qwen 3.6B Vision AI meal scanning, sleep-to-volume correlation, progress photo galleries, subjective fatigue scoring, seasonal challenges, and a dedicated coach-to-athlete portal into a single, beautiful glassmorphism-styled platform accessible on any device.

=======
**Hpi** is a premium, cross-platform fitness application (Web, Android, and iOS) built for athletes, coaches, and data-driven training enthusiasts. It goes far beyond standard workout logging — combining AI-generated training plans, progressive overload analytics, interactive anatomical visualizations, physical injury mapping, smart nutrition tracking with Gemini Vision AI meal scanning, sleep-to-volume correlation, progress photo galleries, subjective fatigue scoring, seasonal challenges, and a dedicated coach-to-athlete portal into a single, beautiful glassmorphism-styled platform accessible on any device.
 
>>>>>>> origin/main
---
 
## Features
 
### 1. Command Center — Dashboard & Custom Widgets
A glassmorphism-styled analytics hub providing a complete view of your training lifecycle:
* **Volume Progression Curve**: Dynamic Recharts chart tracking total training load tonnage over time.
* **Weekly Volume & Intensity**: Side-by-side bar charts evaluating current macrocycles vs. previous weeks.
* **Training Split Distribution**: Interactive donut charts rendering muscle group volume concentration.
* **Activity Heatmap**: GitHub-style grid visualization tracking consecutive training consistency across a 12-week macrocycle.
* **Streak Tracker & Quick Stats**: Gamified streak counter tracking current and all-time consecutive training days, alongside animated stat rings.
* **Customizable Dashboard Layout**: Modular widget system allowing users to pin, unpin, and reorder widgets dynamically (`AddWidgetModal`, `WidgetCard`).
* **Dynamic Canvas Theme Engine**: Interactive visual background particle themes including Fire, Growth, Sky, Night, Flower, Leaf, and Monochrome (`OrbThemeSwitcher`).
---
 
### 2. Multi-Modal AI Coach — "Hpi"
An agentic, conversational AI fitness coach accessible on every view:
<<<<<<< HEAD
* **Natural Language Queries**: Powered by Groq (`openai/gpt-oss-120b`) for intelligent training advice, form tips, and customized guidance.
=======
* **Natural Language Queries**: Powered by Groq (Llama-3.3-70b-versatile) for intelligent training advice, form tips, and customized guidance.
* **Double-RAG Recommendation System**: Uses a two-stage retrieval pipeline combining structured SQL-based filtering with semantic retrieval. The first RAG stage filters relevant athlete data based on factors such as fitness goals, experience, demographics, and training context. The second RAG stage uses BGE-M3 embeddings followed by a cross-encoder reranker to identify the most relevant recommendations before passing the context to the LLM.
>>>>>>> origin/main
* **Voice Dictation Mode**: Hands-free voice input integrated via Web Speech API and native Capacitor speech recognition (`HpiChat.jsx`).
* **Vapi Live Voice Calling**: Interactive real-time voice call modal (`VapiCallModal`) for conversational AI phone-style coaching sessions.
* **Agentic Auto-Tracking**: 
  > [!TIP]
  > Tell Hpi what you trained, ate, or drank in plain language (e.g., *"I did 3 sets of bench press at 80kg for 8 reps"* or *"I ate a chicken bowl with 600 kcal and drank 500ml water"*), and Hpi generates hidden action payload blocks. The backend intercepts and parses these blocks via regular expressions to **automatically log exercises, sets, foods, or hydration into the database on your behalf**!
 
### 3. Smart Nutrition Hub & AI Vision Scanner
Fuel your performance with a next-generation calorie and macronutrient manager:
* **Macro Targets & Circular Progress**: Real-time tracking of Calories, Protein, Carbs, Fats, and Water Hydration against customizable target rings (`MacroRing`).
<<<<<<< HEAD
* **Qwen 3.6B Vision & Groq AI Meal Scanner**: Capture or upload meal photos directly from your camera or gallery (`MealScanModal`). The AI vision engine analyzes the image, identifies food items, estimates portion sizes, calculates macros/calories via `openai/gpt-oss-120b`, and logs the meal instantly.
=======
* **qwen3.6-27b Vision & Groq AI Meal Scanner**: Capture or upload meal photos directly from your camera or gallery (`MealScanModal`). The AI vision engine analyzes the image, identifies food items, estimates portion sizes, calculates macros/calories, and logs the meal instantly.
>>>>>>> origin/main
* **Fuzzy & Full-Text Food Search**: High-speed hybrid PostgreSQL `pg_trgm` fuzzy matching over thousands of food items with recency ranking (`FoodSearchModal`).
* **Scientific BMR/TDEE Calculator**: Calculates precise macro goals based on age, height, weight, activity levels, and training goals (Bulk, Cut, or Maintain) (`NutritionCalculator`).
* **Speed Log Utilities**: Quick Add calories/macros, Custom Recipe Builder, Custom Food Registry, and 1-click "Copy Meals from Yesterday".
---
 
### 4. Advanced Workout Engine & Templates
A zero-friction, feature-rich logging environment:
* **Smart Sets**: Log Warm-up, Working, Drop, Superset, and Failure iterations with full rep and weight metadata (`LogWorkout`).
* **Live Rest Timers**: Rest period countdown timers with visual progress, audio alerts, and native haptic feedback.
* **In-Session PR Detection**: Real-time calculation of 1-Rep Max (1RM) using the Epley formula with celebratory PR animations when breaking personal records.
* **Progressive Overload Prompts**: Real-time comparison with historical performance, prompting rep/weight increments when appropriate (`ProgressiveOverloadSuggestion`).
* **Workout Templates**: Save favorite routines as templates for rapid 1-click workout initiation (`TemplateModal`).
* **Exercise Notes**: Per-exercise notes persistence for form cues, equipment settings, and fatigue notes.
---
 
### 5. Canonical Exercise Reference Library & Custom Builder
An embedded reference library built for precision:
* **1,300+ Canonical Exercises**: Filterable by muscular target (Lats, Quads, Chest, etc.), equipment constraints (Barbell, Dumbbell, Cable, Machine, Bodyweight), and movement patterns (`Exercises`).
* **Anatomical Visuals & Execution GIFs**: High-resolution muscle highlight SVGs and animated demonstration GIFs for every exercise (`ExerciseDetailSheet`).
* **Custom Exercise Creator**: Add user-defined custom exercises into your personal library (`CustomExerciseModal`).
---
 
### 6. Interactive Body Silhouette & Injury Log
Track physical safety and well-being with anatomical precision:
* **Interactive Body Silhouette SVGs**: Interactive front and back anatomical body maps (`BodySilhouette`, `BodyMap`, `InjuryLog`).
* **Pain Severity Grading**: Rate pain zones from 1 (mild discomfort) to 10 (severe pain) with anatomical region tagging.
* **Color-Coded Pain Heatmaps**: Active injury zones glow with dynamic color gradients (red/orange overlays) on the body map.
* **Injury Lifecycle Tracking**: Monitor active injuries, log recovery notes, and mark injuries as healed.
---
 
### 7. Sizing, Body Measurements & Progress Photos
Monitor your physical transformation through objective data and visual evidence:
* **11 Sizing Verticals**: Log measurements for Neck, Shoulders, Chest, Waist, Hips, Left/Right Arms, Left/Right Thighs, and Left/Right Calves (`Measurements`).
* **Bodyweight Tracker**: Dedicated bodyweight logger with historical progression charts (`BodyWeightForm`).
* **Growth & Trend Indicators**: Instant visual cues (Green for Decreased, Cyan for Constant, Red for Increased) comparing latest entries against previous logs.
* **Progress Photos Gallery**: Upload front, side, and back transformation photos with date stamping, filtering, and side-by-side comparative overlays (`ProgressPhotos`).
---
 
### 8. Sleep & Recovery Tracker
Monitor recovery quality to optimize muscle growth and performance:
* **Sleep Logging**: Record sleep duration (hours) and categorical quality ratings (Terrible, Poor, Fair, Good, Excellent) (`SleepTracker`).
* **Sleep-to-Volume Correlation Plot**:
  > [!NOTE]
  > Interactive Recharts visualizer overlaying sleep metrics directly onto weekly training volume to highlight recovery correlation and prevent overtraining (`SleepWidget`).
---
 
### 9. Subjective Fatigue & Readiness Engine
Evaluate central nervous system readiness before hitting the gym:
* **Borg RPE & Fatigue Assessment Quiz**: Interactive questionnaire evaluating central nervous system fatigue, muscle soreness, sleep quality, and mental readiness (`FatigueCheck`, `FatigueQuiz`, `FatigueResult`).
* **Readiness Scoring**: Calculates dynamic readiness scores used to adjust recommended workout volume and intensity.
---
 
### 10. Coaching Zone — Athlete & Trainer Ecosystem
A comprehensive two-way management portal connecting trainers with athletes:
* **Dual Roles**: Sign up or switch between Athlete and Coach profiles (`CoachDashboard`).
* **Coach Roster & Athlete Inspection**: Trainers can generate invite codes, manage client rosters, inspect daily workout logs, check fatigue scores, review active injuries, and track measurement trends.
* **AI Progress Reports**: Groq-generated client progress summaries built from training history, fatigue, and injury data (`coach_ai_report.py`).
* **Live Video Consultations**: WebRTC video calls between coach and athlete powered by Stream.io (`VideoCallModal`).
* **Community Events & Masterclasses**: Coaches host workshops and community events with registration tracking.
* **Workout Suggestion Engine**: Build custom workout splits and suggest routines directly into athletes' logging queues (`SuggestWorkoutModal`).
* **Direct Coach Chat**: Real-time direct messaging between coaches and athletes with unread message badges (`CoachChatModal`).
* **Program Builder**: Design multi-week custom workout plans (`PlanPickerModal`).
---
<<<<<<< HEAD

=======
 
>>>>>>> origin/main
### 11. RAG-Powered Insights Engine
A hybrid retrieval-augmented generation pipeline grounding AI answers in real member data:
* **Multi-Stage Retrieval**: Classifies a question with Groq, generates a read-only DuckDB SQL query against a schema-aware dataset, then narrows further with Qdrant vector search and cross-encoder reranking (`bge-large-en-v1.5` / `bge-reranker-v2-m3`).
* **Grounded Recommendations**: Answers to open-ended questions (e.g., training/diet guidance for specific health profiles) are backed by retrieved, ranked member context rather than the LLM alone.
<<<<<<< HEAD

---

=======
---
 
>>>>>>> origin/main
### 12. Gamified Seasonal Fitness Challenges
Push your limits with structured community challenges:
* **Seasonal Challenge Boards**: Browse cardio, strength, hypertrophy, nutrition, and habit challenges (`Challenges`).
* **Difficulty Tiers**: Filter challenges by Beginner, Intermediate, Advanced, and Elite levels.
* **Interactive Challenge Analytics**: Track overall completion progress %, days remaining, and check-in checkmark grids.
---
 
### 13. AI Gym Recommendation System

<<<<<<< HEAD
### 13. Custom ML Recommendation & Math Engine
Hyper-personalized routine and split recommendations:
* **In-House Machine Learning Engine**: Python math engine (`data_engine/`) implementing Gradient Boosted Decision Trees (GBDT), manual Principal Component Analysis (PCA) via power iteration, and synthetic data interpolation for custom training program generation (`ai_recommend.py`).

---

=======
Hyper-personalized gym routine and split recommendations:

- **Double-RAG Recommendation Engine**: The AI gym recommendation system follows the same two-stage RAG architecture used by Hpi. It first applies **structured SQL-based retrieval** to filter relevant athlete profiles based on factors such as fitness goals, experience level, demographics, and training context. The filtered results are then processed through **BGE-M3 semantic retrieval** and a **cross-encoder reranker** to identify the most relevant training patterns and recommendations.
- **Controlled LLM Generation**: The final recommendations are generated using a carefully tuned LLM temperature to balance **consistency, relevance, and creativity**, allowing the system to produce personalized training routines while remaining grounded in the retrieved data.
 
>>>>>>> origin/main
### 14. In-App Notification Center
Stay up to date across the platform:
* **Alert & Notification Hub**: Manages invitations, suggested workouts from coaches, direct chat messages, and challenge milestones with unread counters (`NotificationCenter`).
---
<<<<<<< HEAD

=======
 
>>>>>>> origin/main
### 15. Native Mobile Experience (Android & iOS)
Hpi provides a full native mobile application built with Capacitor:
* **Dedicated Mobile Architecture**: Powers a 5-tab bottom navigation shell (`MobileAppShell`, `BottomNav`) with custom mobile views (`MobileDashboard`, `MobileWorkouts`, `MobileNutrition`, `MobileCoachingZone`, `MobileInjuryLog`, `MobileSleep`, `MobileProgress`, `MobileProfile`, `MobileBodyHub`, `MobileTrainHub`, `MobileExercises`, `MobileChallenges`, `MobileChat`).
* **Hardware & Plugin Integration**: Integrated `@capacitor/preferences`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`, and `@capacitor-community/speech-recognition`.
* **Live Reload & Production Workflows**: Supports Fast Refresh emulator development (`npm run dev:android`) and static APK production builds (`npm run build:android`).
---
 
## Technology Stack
 
### Frontend
 
| Technology | Role |
|---|---|
| React 18 | Functional components, Hooks, and Code splitting |
| React Router v6 | Client-side routing, Session guards, and Mobile navigation |
| Recharts | SVG-based interactive charts, progression curves, and recovery plots |
| Lucide React | Visual iconography system |
| Vanilla CSS | Modern glassmorphism design system, dynamic background themes, and CSS custom properties |
 
### Backend
 
| Technology | Role |
|---|---|
| Python 3.10+ | Core application language |
| FastAPI | High-performance ASGI web framework with Pydantic typing, async lifespan hooks, and auto-generated Swagger/ReDoc docs |
| Uvicorn | High-speed ASGI server |
<<<<<<< HEAD
| Groq SDK | `openai/gpt-oss-120b` for the Hpi AI Agent, unified workout generator, macro calculation refinement, and RAG SQL generation; `llama-3.1-8b-instant` for fast question classification |
| Qwen 3.6B Vision | Multi-modal perception API via Groq (`qwen/qwen3.6-27b`) for photo-based meal scanning |
=======
| Groq SDK | Llama-3.3-70b-versatile for the Hpi AI Agent, unified workout generator, and RAG SQL generation; Llama-3.1-8b-instant for fast question classification |
| Gemini 2.5 Vision | AI Vision multi-modal API for photo-based meal scanner |
>>>>>>> origin/main
| Qdrant Client | Vector database powering similarity search over indexed member/recommendation datasets |
| Sentence-Transformers / PyTorch / Transformers | Local embedding generation (`bge-large-en-v1.5`), cross-encoder reranking (`bge-reranker-v2-m3`), and local ASR speech-to-text |
| DuckDB | Embedded analytical SQL engine for fast in-memory filtering during RAG query execution |
| Psycopg2 | PostgreSQL querying, `ThreadedConnectionPool` connection pooling, and hybrid text search |
| Pandas & OpenPyXL | Data parsing and Excel/CSV ingestion for RAG datasets |
| Passlib & Python-Jose | PBKDF2-SHA256 password hashing and JWT token generation/validation |
| SlowAPI | Rate limiting middleware for sensitive endpoints |
| Librosa & SoundFile | Audio signal processing for voice interaction uploads |
<<<<<<< HEAD

=======
 
>>>>>>> origin/main
### Mobile App (Android & iOS)
 
| Technology | Role |
|---|---|
| Capacitor | Cross-platform bridge wrapping the React frontend into native Android/iOS shells |
| React 18 & Router v6 | Dedicated mobile screens (`src/mobile/`) with 5-tab navigation |
| Vanilla CSS | Mobile theme system (`mobile.css`) with bottom-sheet animations |
| Recharts | Responsive sparklines, macro rings, and volume mini-charts |
| Native Plugins | `@capacitor/preferences`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`, `@capacitor/camera`, and `@capacitor-community/speech-recognition` |
<<<<<<< HEAD

### Real-Time & Integrations

=======
 
### Real-Time & Integrations
 
>>>>>>> origin/main
| Technology | Role |
|---|---|
| @stream-io/video-react-sdk | WebRTC video call SDK for live coach-athlete video consultations |
| @vapi-ai/web | Voice AI web client for real-time conversational voice calls with the Hpi AI Assistant |
| @react-oauth/google | Google OAuth 2.0 single sign-on |
| React Body Highlighter | Interactive SVG human body model for muscle group and injury visualization |
<<<<<<< HEAD

=======
 
>>>>>>> origin/main
### Database & Custom ML Engine
 
| Technology | Role |
|---|---|
| PostgreSQL (Supabase) | Primary relational database using `DATE_TRUNC`, similarity operators, and Full-Text Search (`pg_trgm`) |
| Custom Math Engine | Zero-dependency Python ML pipeline (`data_engine/`) implementing GBDT, manual PCA via power iteration, matrix operations, and Epley/Brzycki/Wilks formulas |
| Hybrid RAG Pipeline | Multi-stage retrieval (`pipeline/`): schema-aware SQL generation over DuckDB, then Qdrant vector search with cross-encoder reranking, for grounded AI insights |
<<<<<<< HEAD

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
└── frontend/                       # React SPA & Capacitor native wrapper
    ├── package.json                # Frontend dependencies & Capacitor build scripts
    └── src/
        ├── App.js                  # Top-level router & theme provider
        ├── index.css               # Global design system & glassmorphism tokens
        ├── pages/                  # Page components (Dashboard, LogWorkout, Coach, etc.)
        ├── components/             # Reusable UI components, modals, HpiChat, VapiCallModal
        └── mobile/                 # Dedicated mobile screens & 5-tab navigation shell
```

=======
 
>>>>>>> origin/main
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
└── frontend/                       # React SPA & Capacitor native wrapper
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
* Python 3.10+
* Node.js 18+
* A PostgreSQL instance ([Supabase free tier](https://supabase.com/) recommended)
<<<<<<< HEAD
* A Groq API Key (for Hpi AI Assistant, Vision Meal Scanner, and RAG inference)

=======
* A Groq API Key (for Hpi AI Assistant)
* A Gemini API Key (for AI Vision Meal Scanner)
>>>>>>> origin/main
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
The application will open automatically at `http://localhost:3000`.
 
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
 
## Contributing
 
Contributions, issues, and feature requests are welcome!
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request
---
<<<<<<< HEAD

## Hosting

Hpi is hosted by **Be Carth.AI Consulting**.

=======
 
## Hosting
 
Hpi is hosted by **Be Carth.AI Consulting**.
 
>>>>>>> origin/main
---
 
<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/HamedMedRayen">Hamed Med Rayen</a></sub>
</div>
 
