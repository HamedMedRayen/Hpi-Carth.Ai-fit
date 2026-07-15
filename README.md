<div align="center">

<br />

<img src="./HPI_Logo_Pack/hpi-logo-white-bg.png" alt="HPI Logo" height="180" />

<p><strong>Intelligent Cross-Platform Fitness Tracking, AI-Powered Coaching & Advanced Recovery Analytics</strong></p>

<p>
  <a href="https://github.com/HamedMedRayen/Hpi/stargazers">
    <img src="https://img.shields.io/github/stars/HamedMedRayen/Hpi?style=flat-square&color=00BCD4" alt="Stars" />
  </a>
  <a href="https://github.com/HamedMedRayen/Hpi/issues">
    <img src="https://img.shields.io/github/issues/HamedMedRayen/Hpi?style=flat-square&color=00BCD4" alt="Issues" />
  </a>
  <a href="https://github.com/HamedMedRayen/Hpi/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/HamedMedRayen/Hpi?style=flat-square&color=00BCD4" alt="License" />
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
  <a href="#getting-started">Getting Started</a> &nbsp;•&nbsp;
  <a href="#contributing">Contributing</a>
</p>

<br />

</div>

---

Hpi is a premium, cross-platform fitness application (Web, Android, and iOS) built for athletes and data-driven training enthusiasts. It goes far beyond standard workout logging — combining AI-generated training plans, progressive overload analytics, interactive anatomical visualizations, physical injury mapping, smart nutrition logging with AI meal scanning, sleep-to-volume correlation, seasonal challenges, and a dedicated coach-to-athlete portal into a single, beautiful glassmorphism-styled platform accessible on any device.

---

## Features

### 1. Command Center — Dashboard
A gorgeous glassmorphism-styled analytics hub providing a complete view of your training lifecycle:
* **Volume Progression Curve**: Dynamic Recharts chart tracking total training load tonnage over time.
* **Weekly Volume Comparison**: Side-by-side bar charts evaluating current macrocycles vs. previous weeks.
* **Training Split Distribution**: Interactive donut charts rendering muscle group volume concentration.
* **Activity Heatmap**: GitHub-style grid visualization tracking consecutive consistency across a 12-week macrocycle.
* **Streak Tracker**: Gamified indicator counting current and all-time consecutive training day streaks.

---

### 2. Floating AI Assistant — "Hpi"
An agentic, conversational AI fitness coach accessible on every view:
* **Natural Language Queries**: Ask Hpi about training techniques, workout structures, recovery advice, or exercise form.
* **Voice Dictation Mode**: Direct integration with the browser's `SpeechRecognition` API allows you to dictate messages and commands hands-free.
* **Agentic Auto-Tracking**: 
  > [!TIP]
  > Tell Hpi what you did, what you ate, or what you drank (e.g., *"I did 3 sets of bench press at 80kg for 8 reps"* or *"I ate a 600 kcal chicken rice bowl"*), and Hpi will generate a hidden action block. The backend dynamically intercepts and parses this block via regular expressions to **automatically log the workouts, meals, or water in the database on your behalf**!

---

### 3. Smart Nutrition Hub & AI Scanner
Fuel your performance with a next-generation calorie and macronutrient manager:
* **Macro Targets & Circular Progress**: Real-time tracking of Calories, Protein, Carbs, Fats, and fluid Hydration (Water) against customized goals.
* **Full-Text search (FTS) & Similarity**: High-speed, hybrid food search matching global popular ingredients and personal recency ranking utilizing PostgreSQL pg_trgm indices.
* **AI Meal Scanner**: Powered by Groq and Llama-3.3-70b-versatile, describe a cooked meal in natural language (e.g., *"A handful of almonds and a beef steak with mashed potatoes"*) and the AI will extract precise nutrition info and log it instantly.
* **Personalized Nutrition Calculator**: Scientific BMR/TDEE calculator calculating macro targets based on age, height, weight, activity levels, and training styles (Bulk, Cut, or Maintain).
* **Speed Log Utilities**: Quick Add calories, Custom Recipe builder, Custom Food registry, and one-click "copy meals from yesterday".

---

### 4. Interactive Injury Map & Log
Track your physical safety and well-being with precision:
* **Body Silhouette SVGs**: A fully interactive, clickable anatomical body silhouette map displaying active pain locations.
* **Pain Severity Grading**: Rate pain zones from 1 (discomfort) to 10 (severe pain) with details and log dates.
* **Color-Coded Heatmaps**: Active injury zones glow red/orange on the silhouette.
* **Integrated Sizing View**: Connects with measurements history and lets you easily transition injury logs to healed states.

---

### 5. Sizing & Body Measurements Tracker
Watch your physical transformation through objective measurements:
* **11 Sizing Verticals**: Log measurements for Neck, Shoulders, Chest, Waist, Hips, Left/Right Arm, Left/Right Thigh, and Left/Right Calf.
* **Growth Indicators**: Instant visual cues (Green for Decreased, Cyan for No Change, Red for Increased) comparing the current measurement with the last one.
* **History Trend Lines**: Beautiful multi-series charting displaying dimensional metrics over time.

---

### 6. Sleep & Recovery Tracker
Sleep is the cornerstone of hypertrophy and performance. Monitor it closely:
* **Sleep Logs**: Log sleep duration (hours) and categorical quality (Terrible, Poor, Fair, Good, Excellent).
* **Sleep-to-Volume Correlation**: 
  > [!NOTE]
  > Renders an interactive Recharts chart overlaying sleep duration/quality trends directly over weekly lifting volume to visualize recovery correlations and prevent nervous system overtraining.

---

### 7. Coaching Zone (Athlete/Coach Portal)
A comprehensive two-way management portal connecting trainers with athletes:
* **Dual Roles**: Sign up or switch between Athlete and Coach profiles.
* **Athlete Roster & Analytics**: Coaches can invite athletes, see active athletes, inspect their daily workout history, check their latest Borg fatigue ratings, and review active injuries.
* **Workout Suggestion Engine**: Build custom workout splits and suggest routines directly to athletes' logging queues.
* **Coach Chat Modals**: Send instant direct messages between athletes and coaches for feedback.

---

### 8. Seasonal Fitness Challenges
Gamify your progress and push your limits:
* **Seasonal Challenge Boards**: Browse cardio, strength, nutrition, or mixed seasonal challenges.
* **Difficulty Tiers**: Filters from Easy/Beginner up to Elite/Advanced.
* **Challenge Analytics**: Track overall progress %, days completed vs. days left, and consecutive check-in checkmark grids.

---

### 9. Workout Engine
A zero-friction, feature-rich logging environment:
* **Smart Sets**: Log Warm-up, Normal, or Superset iterations with full metadata.
* **Live Timers & Rest Periods**: Track session duration and enforce rest periods between sets.
* **In-Session PRs**: Automatically detects when your Epley 1-Rep Max exceeds historical thresholds and triggers a PR celebration.
* **Progressive Overload Prompts**: Compares active sets to historical logs and nudges you to increase weight or reps when appropriate.

---

### 10. Exercise Reference Library
An embedded canonical reference library built for precision:
* Over 1,300 exercises filterable by muscular target (e.g., Lats, Rhomboids, Quads) and equipment constraints.
* Instructional GIFs and high-resolution anatomical highlights for every exercise.

---

### 11. Native Mobile Experience
Hpi is also available as a functional native mobile application, bringing the platform directly to the gym floor:
* **Hardware Integration**: Full access to native device capabilities using Capacitor plugins for Speech Recognition, Camera, Haptics, and the mobile keyboard.
* **Seamless Sync**: Build, track, and log workouts in real-time on Android (and iOS), connecting effortlessly with the main platform backend.

---

## Technology Stack

**Frontend**

| Technology | Role |
|---|---|
| React 18 | Functional components, Hooks, and Code splitting |
| React Router v6 | Client-side routing and Session guards |
| Recharts | SVG-based interactive charts and recovery correlation plots |
| Lucide React | Visual iconography system |
| Vanilla CSS | Custom variables, glassmorphism theme system, and glowing overlays |

**Backend**

| Technology | Role |
|---|---|
| Python 3.10+ | Core application language |
| FastAPI | High-performance ASGI framework with Pydantic typing |
| Groq Client | Integration with Groq Llama-3.3-70b-versatile for Hpi Coach and Meal Scanning |
| Psycopg2 | PostgreSQL querying, connection pooling, and hybrid text searches |
| Uvicorn | ASGI web server |
| JWT | Secure session persistence |

**Mobile App (Android)**

| Technology | Role |
|---|---|
| Capacitor | Shell & Bridge wrapping the React app into a native Android shell giving access to device APIs |
| React 18 & Router v6 | Powers new mobile components in `src/mobile/` handling 5-tab navigation and full-screen modals |
| Vanilla CSS | Dedicated `mobile.css` with glassmorphism, bottom sheet animations, and mobile spacing |
| Recharts | Compact sparklines and donut rings adapted for the mobile dashboard |
| Capacitor Plugins | Native API access: `@capacitor/preferences` (secure storage), `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`, and `@capacitor-community/speech-recognition` |

**Database**

| Technology | Role |
|---|---|
| PostgreSQL (Supabase) | Primary relational data layer. Leverages `DATE_TRUNC`, similarity operators, and Full-Text Search vectors for rapid lookups |

---

## Getting Started

### Prerequisites
* Python 3.10+
* Node.js 18+
* A PostgreSQL instance ([Supabase free tier](https://supabase.com/) recommended)
* A Groq API Key (for Hpi AI Assistant and Smart Meal Scanning)

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
> The application includes a `lifespan` hook that automatically initializes the full SQL schema, seeds local exercises (1,300+ entries from exercises-dataset-main), seeds food databases, and seeds default recommendation rules on its first boot.

### 4. Set Up the Frontend
Open a new terminal in the root directory:
```bash
cd frontend
npm install
npm start
```
The application will open automatically and be available at `http://localhost:3000`.

### 5. Run the Mobile App (Android)
Since Hpi uses Capacitor to bridge the React app to native mobile, you can easily run it on an Android device or emulator directly from Windows:

**Prerequisite:** Ensure you have [Android Studio](https://developer.android.com/studio) installed.

1. **Build and Sync:** Inside the `frontend` folder, build the web assets and sync them to the Android project:
   ```bash
   npm run build
   npx cap sync android
   ```
2. **Open Android Studio:**
   ```bash
   npx cap open android
   ```
3. **Run on a Physical Device (USB Debugging):**
   * On your Android phone, go to **Settings > About Phone** and tap **Build Number** 7 times to unlock Developer Options.
   * Go to **Settings > Developer Options** and turn on **USB Debugging**.
   * Connect your phone to your Windows PC via USB (allow the connection prompt on your phone).
   * In Android Studio, select your phone from the device dropdown menu in the top toolbar and click the **Run** (Play) button.
4. **Run on an Emulator (Simulator):**
   * In Android Studio, open the **Device Manager** and create a new Android Virtual Device (AVD).
   * Select your new virtual device from the target dropdown menu and click the **Run** button to launch the app in the simulator.

---

## Contributing

Contributions, issues, and feature requests are welcome.
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

**Frontend guidelines**: Adhere to the existing glassmorphism CSS conventions, respect variable color tokens, and use `lucide-react` exclusively for iconography.

---

## License

Distributed under the MIT License. See `LICENSE` for details.

---

<div align="center">
  <sub>Built by <a href="https://github.com/HamedMedRayen">Hamed Med Rayen</a></sub>
</div>
