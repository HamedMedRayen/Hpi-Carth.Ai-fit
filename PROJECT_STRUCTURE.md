# Hpi — Project Structure

```text
Hpi/
├── PROJECT_STRUCTURE.md          ← Overview of project directory tree
├── GETTING_STARTED.md            ← Manual installation & setup instructions
├── README.md                     ← Main codebase overview & feature catalog
│
├── backend/                      ← FastAPI Application (Python 3.10+)
│   ├── main.py                   ← App entry point, static mount, & db lifespan seeds
│   ├── database.py               ← PostgreSQL client instantiation & DDL migration definitions
│   ├── requirements.txt          ← Python dependency listing (FastAPI, Groq, Psycopg2-binary, etc.)
│   ├── core/
│   │   └── config.py             ← Pydantic configuration & env variables (DATABASE_URL, etc.)
│   ├── models/                   ← Data Transfer Objects & DB Entity Schemas
│   │   ├── user.py               
│   │   ├── workout.py            
│   │   ├── metric.py             
│   │   └── measurements.py       ← Body sizing structure validation models
│   ├── repositories/             ← Database transaction queries & cursor managers
│   │   ├── base.py               
│   │   ├── user_repo.py          
│   │   ├── workout_repo.py       
│   │   └── metric_repo.py        
│   ├── services/                 ← Procedural math operations & API orchestrators
│   │   ├── analytics_service.py  
│   │   ├── ml_service.py         
│   │   ├── ingestion_service.py  
│   │   ├── exercise_service.py   
│   │   ├── recommendation_service.py
│   │   ├── food_service.py       ← Seeds food items dataset into tables
│   │   └── nutrition_service.py  ← Target macros calculator algorithms
│   └── routes/                   ← REST API Route Handlers
│       ├── users.py              ← User Profile operations
│       ├── auth.py               ← JWT Token login/signup validation
│       ├── workouts.py           ← Workout logging, timers, sets, & Epley 1RM calculators
│       ├── metrics.py            ← Strength and rep progress charts
│       ├── progress.py           ← Dashboard macrocycle metrics endpoints
│       ├── analytics.py          ← Core training fatigue, splits, & frequency calculators
│       ├── exercises.py          ← Canonical catalog filtering
│       ├── recommendations.py    ← Traditional dynamic routine recommendations
│       ├── ai_recommend.py       ← Advanced recommendation routes
│       ├── chat.py               ← Groq Llama-3.3-70b Assistant socket & auto-tracking
│       ├── nutrition.py          ← Nutrition tracking, water logging, & Groq meal scanner
│       ├── sleep.py              ← Hours slept & subjective quality logs
│       ├── injuries.py           ← Pain log & silhouette map DB interfaces
│       ├── measurements.py       ← Sizing metric persistence endpoints
│       ├── progress_photos.py    ← Progress image uploads & comparison routes
│       ├── coach.py              ← Athlete roster, invites, & coaching credentials
│       ├── coach_chat.py         ← Direct messaging between coaches and clients
│       ├── challenges.py         ← Season challenge progress charts & joining logic
│       └── notifications.py      ← Alert signals and invitations handlers
│
├── data_engine/                  ← Custom Machine Learning Math Engine
│   ├── engine.py                 ← DataMatrix class + math primitives
│   ├── synthetic_gen.py          ← LCG + interpolation data generator
│   ├── pca.py                    ← Manual PCA (power iteration)
│   └── gbdt.py                   ← Gradient Boosted Decision Trees
│
├── frontend/                     ← React Application & Capacitor Mobile Bridge
│   ├── android/                  ← Native Android build output from Capacitor
│   ├── capacitor.config.json     ← Capacitor configuration file
│   ├── package.json              ← Node & Capacitor plugins dependencies
│   ├── tailwind.config.js        
│   ├── public/                   
│   └── src/                      
│       ├── App.js                ← Root App shell, theme provider, and router maps
│       ├── index.js              
│       ├── index.css             ← Global styles, colors, layouts, and glassmorphic variables
│       ├── mobile/               ← Mobile-specific components (tabs, modals, mobile.css)
│       ├── components/           ← Reusable UI Modules
│       │   ├── layout/
│       │   │   ├── BottomNav.js  ← Bottom tab navigation bar for mobile viewports
│       │   │   ├── Header.js     
│       │   │   ├── Sidebar.js    ← Desktop side navigation sidebar
│       │   │   └── GlassCard.js  
│       │   ├── charts/           ← Custom Recharts wraps
│       │   ├── widgets/
│       │   │   └── SleepWidget.js ← Recharts correlation visualizer
│       │   ├── nutrition/        ← Nutrition Hub modal panels
│       │   │   ├── FoodSearchModal.js
│       │   │   ├── QuickAddModal.js
│       │   │   ├── RecipeBuilderModal.js
│       │   │   ├── CustomFoodModal.js
│       │   │   └── NutritionCalculator.js
│       │   ├── HpiChat/          ← Floating AI Assistant UI
│       │   │   ├── HpiChat.jsx   ← SpeechRecognition voice mode & bubble UI
│       │   │   └── HpiChat.css   
│       │   ├── BodySilhouette.js ← Clickable anatomical SVG log mapping
│       │   ├── FatigueQuiz.js    
│       │   ├── FatigueResult.js  
│       │   └── ExercisePicker.js 
│       ├── pages/                ← Application view panels
│       │   ├── AuthPage.js       ← Login / Signup dashboard
│       │   ├── Dashboard.js      ← Command Center training progress
│       │   ├── Workouts.js       
│       │   ├── LogWorkout.js     ← Advanced Logger, Set entries, timer, and PR animations
│       │   ├── Progress.js       
│       │   ├── FatigueCheck.js   ← Borg quiz interface
│       │   ├── Recommend.js      ← Splits planner panel
│       │   ├── Profile.js        
│       │   ├── Nutrition.js      ← Calorie planner and text scanner input
│       │   ├── SleepTracker.js   ← Sleep quality log interface
│       │   ├── InjuryLog.js      ← Anatomical silhouette mapping
│       │   ├── Measurements.js   ← Sizing log and growth indicators
│       │   ├── ProgressPhotos.js ← Photo gallery & side-by-side comparative overlay
│       │   ├── CoachDashboard.js ← Roster management, suggestions modal, & direct coach chat
│       │   └── Challenges.js     ← Curated seasonal gamified fitness challenges
│       ├── hooks/                
│       └── utils/                
│           ├── api.js            ← Complete fetch client mapping
│           ├── formatters.js     
│           ├── theme.js          
│           ├── auth.js           ← Session authentication context provider
│           ├── icons.js          
│           └── fatigueScoring.js 
│
├── exercises-dataset-main/       ← Local Static Asset Catalog
│   ├── data/
│   │   └── exercises.json        ← 1300+ Canonical Exercises
│   ├── images/                   ← Static Anatomical highlight SVGs
│   └── videos/                   ← Static Animated Execution GIFs
│
├── data/                         ← Database seeding tables
└── docs/                         ← Generated documents & macrocycles
```
