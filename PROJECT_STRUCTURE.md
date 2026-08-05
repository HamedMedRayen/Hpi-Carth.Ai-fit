# Hpi — Project Structure

```text
Hpi/
├── PROJECT_STRUCTURE.md          ← Overview of complete project directory tree
├── GETTING_STARTED.md            ← Manual installation & setup instructions
├── README.md                     ← Main codebase overview & feature catalog
│
├── backend/                      ← FastAPI Application (Python 3.10+)
│   ├── main.py                   ← App entry point, static mount, & db lifespan seeds
│   ├── database.py               ← PostgreSQL client & DDL schema definitions
│   ├── requirements.txt          ← Dependencies (FastAPI, Groq, Psycopg2-binary, etc.)
│   ├── core/
│   │   └── config.py             ← Pydantic environment configuration (DATABASE_URL, GROQ_API_KEY, GEMINI_API_KEY)
│   ├── models/                   ← Data Transfer Objects & Pydantic Validation Schemas
│   │   ├── user.py               
│   │   ├── workout.py            
│   │   ├── metric.py             
│   │   └── measurements.py       ← Body sizing DTO models
│   ├── repositories/             ← Database transaction queries & cursor managers
│   │   ├── base.py               
│   │   ├── user_repo.py          
│   │   ├── workout_repo.py       
│   │   └── metric_repo.py        
│   ├── services/                 ← Math engines & service orchestrators
│   │   ├── analytics_service.py  
│   │   ├── ml_service.py         
│   │   ├── ingestion_service.py  
│   │   ├── exercise_service.py   
│   │   ├── recommendation_service.py
│   │   ├── food_service.py       ← Food database seeders
│   │   └── nutrition_service.py  ← Target macros & BMR/TDEE math
│   └── routes/                   ← REST API Route Handlers
│       ├── auth.py               ← JWT Token login & signup authentication
│       ├── users.py              ← Profile details and user settings
│       ├── workouts.py           ← Workout logs, set entries, live timer & 1RM 
│       ├── metrics.py            ← Strength metrics and exercise progression history
│       ├── progress.py           ← Dashboard macrocycle training analytics
│       ├── analytics.py          ← Training volume, fatigue, & split distribution
│       ├── exercises.py          ← Canonical exercise catalog filtering
│       ├── exercise_notes.py     ← Per-exercise personal form notes
│       ├── bodyweight.py         ← Dedicated bodyweight log entries
│       ├── recommendations.py    ← Dynamic routine recommendation rules
│       ├── ai_recommend.py       ← GBDT & PCA ML-powered recommendation routes
│       ├── chat.py               ← Groq Llama-3.3-70b AI Coach & auto-tracker parser
│       ├── nutrition.py          ← Macro tracking, water logs, & Gemini Vision meal scanner
│       ├── sleep.py              ← Sleep duration & quality logs
│       ├── fatigue.py            ← Borg RPE quiz assessment & readiness scoring
│       ├── injuries.py           ← Injury log & body silhouette heatmap DB endpoints
│       ├── measurements.py       ← Sizing metric persistence endpoints
│       ├── progress_photos.py    ← Progress photo uploads & side-by-side comparison
│       ├── coach.py              ← Athlete roster, invite codes, & trainer dashboard
│       ├── coach_chat.py         ← Real-time direct messaging between coaches and clients
│       ├── challenges.py         ← Gamified seasonal challenge tracking
│       └── notifications.py      ← System notifications and alert management
│
├── data_engine/                  ← Custom Machine Learning Engine (Python/NumPy)
│   ├── engine.py                 ← DataMatrix class & vector math primitives
│   ├── synthetic_gen.py          ← LCG + interpolation data generator
│   ├── pca.py                    ← Manual PCA (Power Iteration method)
│   └── gbdt.py                   ← Gradient Boosted Decision Trees implementation
│
├── frontend/                     ← React Application & Native Capacitor Shell
│   ├── android/                  ← Android Studio native project output
│   ├── capacitor.config.json     ← Capacitor bridge configuration file
│   ├── package.json              ← Dependencies & mobile dev/build scripts
│   ├── tailwind.config.js        
│   ├── public/                   
│   └── src/                      
│       ├── App.js                ← Root App shell, Theme provider & React Router mapping
│       ├── index.js              
│       ├── index.css             ← Global styles, glassmorphic theme system, variables
│       ├── mobile/               ← Native Mobile Application System
│       │   ├── MobileAppShell.js ← 5-tab mobile container & header shell
│       │   ├── styles/           ← Mobile-specific layout & CSS animations
│       │   ├── components/       ← Mobile-tailored widgets & overlays
│       │   └── pages/            ← Mobile screen views
│       │       ├── MobileDashboard.js
│       │       ├── MobileWorkouts.js
│       │       ├── MobileNutrition.js
│       │       ├── MobileCoachingZone.js
│       │       ├── MobileInjuryLog.js
│       │       ├── MobileSleep.js
│       │       ├── MobileProgress.js
│       │       ├── MobileProfile.js
│       │       ├── MobileBodyHub.js
│       │       ├── MobileTrainHub.js
│       │       ├── MobileExercises.js
│       │       ├── MobileChallenges.js
│       │       └── MobileChat.js
│       ├── components/           ← Reusable Desktop & Common UI Modules
│       │   ├── layout/           ← Layout Wrappers (Sidebar, Header, BottomNav, GlassCard)
│       │   ├── charts/           ← Recharts custom chart wrappers
│       │   ├── widgets/          ← Dashboard Widgets (SleepWidget, StatRing, WidgetCard)
│       │   ├── nutrition/        ← Nutrition Hub Modals
│       │   │   ├── FoodSearchModal.js
│       │   │   ├── MealScanModal.js       ← Gemini 2.5 Vision & Groq photo scanner
│       │   │   ├── QuickAddModal.js
│       │   │   ├── RecipeBuilderModal.js
│       │   │   ├── CustomFoodModal.js
│       │   │   ├── MacroRing.js
│       │   │   └── NutritionCalculator.js
│       │   ├── HpiChat/          ← Floating AI Coach (HpiChat.jsx, speech input)
│       │   ├── VapiCallModal/    ← Interactive AI voice calling modal
│       │   ├── AddWidgetModal.js ← Customizable dashboard widget selector
│       │   ├── OrbThemeSwitcher.js ← Animated background theme switcher
│       │   ├── NotificationCenter.js ← In-app notification center
│       │   ├── BodySilhouette.js ← Anatomical SVG body map
│       │   ├── BodyMap.js        ← Body heatmaps
│       │   ├── BodyWeightForm.js ← Quick bodyweight log widget
│       │   ├── CoachChatModal.js ← Direct coach-client chat overlay
│       │   ├── CoachProfileModal.js
│       │   ├── CustomExerciseModal.js
│       │   ├── ExerciseDetailSheet.js
│       │   ├── ExercisePicker.js
│       │   ├── FatigueQuiz.js    ← Borg RPE questionnaire modal
│       │   ├── FatigueResult.js  
│       │   ├── PlanPickerModal.js← Multi-week program builder modal
│       │   ├── SuggestWorkoutModal.js ← Coach routine push modal
│       │   ├── TemplateModal.js  ← Workout routine template manager
│       │   └── Toast.js          ← Custom alert popups
│       ├── pages/                ← Main Desktop View Pages
│       │   ├── AuthPage.js       ← Login / Registration dashboard
│       │   ├── Dashboard.js      ← Command Center analytics hub
│       │   ├── Workouts.js       ← Workout library & history view
│       │   ├── LogWorkout.js     ← Workout logger, Smart sets, Rest timer, 1RM PRs
│       │   ├── Exercises.js      ← 1,300+ exercise library with muscle SVGs & GIFs
│       │   ├── Nutrition.js      ← Nutrition Hub, target macros & water logger
│       │   ├── SleepTracker.js   ← Sleep log & Sleep-to-Volume correlation
│       │   ├── FatigueCheck.js   ← Subjective fatigue & readiness check
│       │   ├── InjuryLog.js      ← Anatomical silhouette pain log & heatmap
│       │   ├── Measurements.js   ← 11 sizing verticals & bodyweight tracking
│       │   ├── ProgressPhotos.js ← Transformation photo gallery & visual comparator
│       │   ├── CoachDashboard.js ← Athlete roster, suggestions & coach chat
│       │   ├── Challenges.js     ← Seasonal fitness challenge boards
│       │   ├── Recommend.js      ← Workout splits & routine optimizer
│       │   ├── Progress.js       ← Macrocycle progression breakdown
│       │   └── Profile.js        ← User account details & theme preferences
│       ├── hooks/                
│       └── utils/                
│           ├── api.js            ← Complete Axios/Fetch API client bindings
│           ├── formatters.js     
│           ├── theme.js          
│           ├── auth.js           ← Session authentication context provider
│           ├── icons.js          
│           └── fatigueScoring.js 
│
├── exercises-dataset-main/       ← Local Static Exercise Assets
│   ├── data/
│   │   └── exercises.json        ← 1,300+ Exercise Entries
│   ├── images/                   ← Anatomical Muscle Highlight SVGs
│   └── videos/                   ← Exercise Execution GIFs
│
├── data/                         ← Database seed scripts & initial datasets
├── docs/                         ← Documentation & project specifications
└── HPI_Logo_Pack/                ← Brand logos and transparent PNG assets
```
