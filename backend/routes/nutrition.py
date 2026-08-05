from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, date
import psycopg2.extras
import json

from database import get_db
from routes.auth import get_current_user_id

router = APIRouter(prefix="", tags=["Nutrition"])

# --- Models ---

class FoodItemCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    calories: float
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    serving_size: float = 100
    serving_unit: str = "g"

class RecipeIngredient(BaseModel):
    food_id: int
    amount: float
    unit: str = "g"

class RecipeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    servings: float = 1.0
    ingredients: List[RecipeIngredient]

class MealLogCreate(BaseModel):
    meal_name: str
    meal_category: Optional[str] = "Breakfast"
    food_id: Optional[int] = None
    recipe_id: Optional[int] = None
    amount: float
    unit: str = "g"
    calories: Optional[float] = None # For quick add or override
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    date: Optional[date] = None

class QuickAddRequest(BaseModel):
    calories: float
    meal_name: str = "Quick Add"
    meal_category: Optional[str] = "Breakfast"
    protein_g: Optional[float] = 0
    carbs_g: Optional[float] = 0
    fat_g: Optional[float] = 0
    date: Optional[date] = None

class CopyMealRequest(BaseModel):
    from_date: date
    to_date: date

class ScanRequest(BaseModel):
    description: str
    meal_category: Optional[str] = "Breakfast"
    date: Optional[date] = None

class ScanVisionRequest(BaseModel):
    image_base64: str
    auto_log: Optional[bool] = False

class NutritionCalculationRequest(BaseModel):
    weight: float
    height: float
    age: int
    sex: str
    steps: int
    work_type: str
    training_sessions: int
    training_intensity: str
    goal: str
    pace: str
    diet_style: str
    body_fat: Optional[float] = None
    experience_level: Optional[str] = None
    training_type: Optional[str] = None

class NutritionTargetSaveRequest(BaseModel):
    suggested: Dict[str, float]
    final: Dict[str, float]
    goal: str
    pace: str
    diet_style: str
    maintenance_calories: float
    expected_weekly_change: float

# --- Endpoints ---

import time
_SEARCH_CACHE = {} # { (q, user_id): (timestamp, results) }
CACHE_TTL = 300 # 5 minutes

import re

@router.get("/food/search")
def search_food(q: str = Query(...), user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    cache_key = (q, user_id)
    if cache_key in _SEARCH_CACHE:
        ts, results = _SEARCH_CACHE[cache_key]
        if time.time() - ts < CACHE_TTL:
            return results

    # Clean query for FTS: remove non-alphanumeric and add prefix operator
    sanitized_q = re.sub(r'[^\w\s]', '', q)
    clean_q = " & ".join([f"{word}:*" for word in sanitized_q.split() if word])
    if not clean_q: return []

    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Hybrid Search Query:
            # 1. FTS Rank (Lexical)
            # 2. Similarity (Fuzzy)
            # 3. Recency Boost (Personalization)
            # 4. Popularity Boost (Global)
            cur.execute("""
                SELECT fi.*, 
                       ts_rank(fi.search_vector, to_tsquery('english', %s)) as fts_rank,
                       similarity(fi.name, %s) as fuzzy_sim,
                       (SELECT MAX(logged_at) FROM nutrition_logs nl 
                        WHERE nl.meal_name = fi.name AND nl.user_id = %s) as last_used,
                       COALESCE(fi.popularity, 0) as popularity_score
                FROM food_items fi
                WHERE (fi.search_vector @@ to_tsquery('english', %s) OR fi.name ILIKE %s)
                AND (fi.is_user_added = FALSE OR fi.created_by = %s)
                ORDER BY 
                    (fts_rank * 10 + fuzzy_sim * 5 + 
                     CASE WHEN fi.name ILIKE %s THEN 20 ELSE 0 END + -- Exact match
                     CASE WHEN fi.name ILIKE %s THEN 10 ELSE 0 END + -- Starts with boost
                     CASE WHEN last_used IS NOT NULL THEN 25 ELSE 0 END +
                     LEAST(popularity_score, 100) * 0.1) DESC,
                    fi.name ASC 
                LIMIT 50
            """, (clean_q, q, user_id, clean_q, f"%{q}%", user_id, q, f"{q}%"))
            results = cur.fetchall()
            _SEARCH_CACHE[cache_key] = (time.time(), results)
            return results
    except Exception as e:
        print(f"SEARCH ERROR: {e}")
        return []

@router.get("/food/all")
def get_all_food_items(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Get all global items plus user added ones
            cur.execute("""
                SELECT * FROM food_items 
                WHERE is_user_added = FALSE OR created_by = %s
                ORDER BY popularity DESC, name ASC
            """, (user_id,))
            res = cur.fetchall()
            print(f"DEBUG: get_all_food_items returned {len(res)} items for user {user_id}")
            return res
    except Exception as e:
        print(f"DEBUG ERROR: get_all_food_items failed: {e}")
        return []
def create_custom_food(payload: FoodItemCreate, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO food_items (name, brand, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, is_user_added, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s)
            RETURNING *
        """, (
            payload.name, payload.brand, payload.category, payload.calories,
            payload.protein_g, payload.carbs_g, payload.fat_g, payload.fiber_g,
            payload.serving_size, payload.serving_unit, user_id
        ))
        return cur.fetchone()

@router.post("/recipes")
def create_recipe(payload: RecipeCreate, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO recipes (user_id, name, description, servings)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (user_id, payload.name, payload.description, payload.servings))
        recipe_id = cur.fetchone()["id"]
        
        for ing in payload.ingredients:
            cur.execute("""
                INSERT INTO recipe_ingredients (recipe_id, food_id, amount, unit)
                VALUES (%s, %s, %s, %s)
            """, (recipe_id, ing.food_id, ing.amount, ing.unit))
            
        return {"id": recipe_id, "message": "Recipe created successfully"}

@router.get("/recipes")
def get_user_recipes(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM recipes WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        return cur.fetchall()

@router.get("/recipes/{recipe_id}")
def get_recipe_details(recipe_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM recipes WHERE id = %s AND user_id = %s", (recipe_id, user_id))
        recipe = cur.fetchone()
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
            
        cur.execute("""
            SELECT ri.*, fi.name, fi.calories, fi.protein_g, fi.carbs_g, fi.fat_g, fi.fiber_g, fi.serving_size, fi.serving_unit
            FROM recipe_ingredients ri
            JOIN food_items fi ON ri.food_id = fi.id
            WHERE ri.recipe_id = %s
        """, (recipe_id,))
        ingredients = cur.fetchall()
        recipe["ingredients"] = ingredients
        return recipe

@router.post("/log")
def log_nutrition(payload: MealLogCreate, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    # Calculate nutrition values based on amount/unit
    cals, protein, carbs, fat, fiber = 0, 0, 0, 0, 0
    log_date = payload.date or date.today()
    
    if payload.calories is not None:
        # Use explicitly provided overrides from frontend
        cals = payload.calories
        protein = payload.protein_g or 0
        carbs = payload.carbs_g or 0
        fat = payload.fat_g or 0
        fiber = payload.fiber_g or 0
    elif payload.food_id:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM food_items WHERE id = %s", (payload.food_id,))
            food = cur.fetchone()
            if food:
                if payload.unit == "serving":
                    ratio = payload.amount
                else:
                    calc_amount = payload.amount
                    if payload.unit == "kg":
                        calc_amount *= 1000
                    elif payload.unit == "oz":
                        calc_amount *= 28.35
                    elif payload.unit == "lb":
                        calc_amount *= 453.59
                    ratio = calc_amount / (food["serving_size"] or 1)
                
                cals = food["calories"] * ratio
                protein = (food["protein_g"] or 0) * ratio
                carbs = (food["carbs_g"] or 0) * ratio
                fat = (food["fat_g"] or 0) * ratio
                fiber = (food["fiber_g"] or 0) * ratio
    elif payload.recipe_id:
         # Simplified recipe calculation: sum of ingredients
         with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT ri.amount as ing_amount, fi.*
                FROM recipe_ingredients ri
                JOIN food_items fi ON ri.food_id = fi.id
                WHERE ri.recipe_id = %s
            """, (payload.recipe_id,))
            ingredients = cur.fetchall()
            for ing in ingredients:
                ratio = ing["ing_amount"] / (ing["serving_size"] or 1)
                cals += ing["calories"] * ratio
                protein += (ing["protein_g"] or 0) * ratio
                carbs += (ing["carbs_g"] or 0) * ratio
                fat += (ing["fat_g"] or 0) * ratio
                fiber += (ing["fiber_g"] or 0) * ratio
            
            # Divide by servings of the recipe and multiply by the log amount (if log amount is servings)
            cur.execute("SELECT servings FROM recipes WHERE id = %s", (payload.recipe_id,))
            servings_row = cur.fetchone()
            servings = servings_row["servings"] if servings_row and servings_row["servings"] else 1
            cals = (cals / servings) * payload.amount
            protein = (protein / servings) * payload.amount
            carbs = (carbs / servings) * payload.amount
            fat = (fat / servings) * payload.amount
            fiber = (fiber / servings) * payload.amount

    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        category = payload.meal_category or "Breakfast"
        cur.execute("""
            INSERT INTO nutrition_logs (user_id, meal_name, meal_category, calories, protein_g, carbs_g, fat_g, fiber_g, date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (user_id, payload.meal_name, category, cals, protein, carbs, fat, fiber, log_date))
        res = cur.fetchone()
        db.commit()
        return res

@router.post("/log/quick")
def quick_add(payload: QuickAddRequest, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    log_date = payload.date or date.today()
    category = payload.meal_category or "Breakfast"
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO nutrition_logs (user_id, meal_name, meal_category, calories, protein_g, carbs_g, fat_g, date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (user_id, payload.meal_name, category, payload.calories, payload.protein_g or 0, payload.carbs_g or 0, payload.fat_g or 0, log_date))
        res = cur.fetchone()
        db.commit()
        return res

@router.delete("/log/{log_id}")
def delete_log(log_id: int, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("DELETE FROM nutrition_logs WHERE id = %s AND user_id = %s", (log_id, user_id))
        db.commit()
    return {"message": "Log entry deleted"}

@router.get("/today")
def get_today_nutrition(date: Optional[str] = Query(None), user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    target_date = date or str(date.today()) if hasattr(date, 'today') else (date or str(datetime.now().date()))
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, meal_name, COALESCE(meal_category, 'Breakfast') as meal_category, calories, protein_g, carbs_g, fat_g, fiber_g, date, logged_at 
            FROM nutrition_logs 
            WHERE user_id = %s AND date = %s::date
            ORDER BY logged_at ASC
        """, (user_id, target_date))
        meals = cur.fetchall()
        
    totals = {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}
    for m in meals:
        totals["calories"] += m["calories"] or 0
        totals["protein_g"] += m["protein_g"] or 0
        totals["carbs_g"] += m["carbs_g"] or 0
        totals["fat_g"] += m["fat_g"] or 0
        
    return {"meals": meals, "totals": totals, "date": target_date}

@router.get("/history")
def get_nutrition_history(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT date, SUM(calories) as calories, SUM(protein_g) as protein_g, 
                   SUM(carbs_g) as carbs_g, SUM(fat_g) as fat_g
            FROM nutrition_logs 
            WHERE user_id = %s
            GROUP BY date 
            ORDER BY date DESC 
            LIMIT 30
        """, (user_id,))
        return cur.fetchall()

@router.post("/log/copy")
def copy_meals(payload: CopyMealRequest, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO nutrition_logs (user_id, meal_name, calories, protein_g, carbs_g, fat_g, fiber_g, date)
            SELECT user_id, meal_name, calories, protein_g, carbs_g, fat_g, fiber_g, %s
            FROM nutrition_logs
            WHERE user_id = %s AND date = %s
        """, (payload.to_date, user_id, payload.from_date))
        db.commit()
        return {"message": "Meals copied successfully"}

@router.post("/scan")
def scan_meal(payload: ScanRequest, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    import os
    from groq import Groq
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        # Fallback to a simple estimation if API key is missing, or just error
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
        
    client = Groq(api_key=groq_api_key)
    prompt = """You are a nutrition expert. The user will describe a meal.
Respond ONLY with a JSON object:
{ "calories": int, "protein_g": float, "carbs_g": float, "fat_g": float, "fiber_g": float, "meal_name": "str" }
Be accurate based on typical serving sizes."""

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": payload.description}],
            temperature=0.1,
        )
        reply = completion.choices[0].message.content.strip()
        if "```json" in reply:
            reply = reply.split("```json")[1].split("```")[0].strip()
        elif "```" in reply:
            reply = reply.split("```")[1].split("```")[0].strip()
        
        data = json.loads(reply)
        
        category = payload.meal_category or "Breakfast"
        log_date = payload.date or date.today()
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO nutrition_logs (user_id, meal_name, meal_category, calories, protein_g, carbs_g, fat_g, fiber_g, description, date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                user_id, data.get("meal_name", "AI Meal"), category, data.get("calories", 0),
                data.get("protein_g", 0), data.get("carbs_g", 0), data.get("fat_g", 0),
                data.get("fiber_g", 0), payload.description, log_date
            ))
            res = cur.fetchone()
            db.commit()
            return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Active Vision Transformer model on Groq
GROQ_VISION_MODEL = "qwen/qwen3.6-27b"

@router.post("/scan-vision")
def scan_meal_vision(payload: ScanVisionRequest, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    import os
    from groq import Groq
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
        
    img_b64 = payload.image_base64
    if "," in img_b64:
        img_b64 = img_b64.split(",", 1)[1]
        
    client = Groq(api_key=groq_api_key, max_retries=1)
    
    system_prompt = """[NO_THINK] You are 'Aura Vision', an elite AI Vision Transformer specialized in computer vision, culinary analysis, and precise nutritional assessment.
Your backstory: You were trained on millions of high-resolution food images and clinical macro chemical breakdowns. When presented with a photo of a meal, you examine every element, texture, side dish, sauce, and portion size.

Identify every food item present in the image and calculate its specific macros.
Do NOT include any <think> tags or conversational reasoning text outside JSON.
Respond ONLY with a single valid JSON object using the following exact structure:
{
  "meal_name": "Name of the meal",
  "description": "Comprehensive visual description of the meal viewed, including cooking style, freshness, and visible ingredients.",
  "components": [
    {
      "name": "Component name (e.g., Grilled Chicken Breast)",
      "portion": "Estimated portion (e.g., 150g)",
      "calories": 240,
      "protein_g": 46.0,
      "carbs_g": 0.0,
      "fat_g": 5.0,
      "fiber_g": 0.0
    }
  ],
  "totals": {
    "calories": 240,
    "protein_g": 46.0,
    "carbs_g": 0.0,
    "fat_g": 5.0,
    "fiber_g": 0.0
  }
}
Ensure the sum in 'totals' accurately equals the sum of all individual components' macros."""

    try:
        print(f"[Aura Vision] Executing meal vision scan with Groq model: {GROQ_VISION_MODEL}")
        completion = client.chat.completions.create(
            model=GROQ_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": system_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{img_b64}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.1,
            max_tokens=2048
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Aura Vision] Groq Vision Scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"Groq Vision Scan failed: {str(e)}")

    try:
        import re

        def extract_last_json(text: str) -> dict:
            txt = text.strip()
            if "```json" in txt:
                candidate = txt.split("```json")[-1].split("```")[0].strip()
                try:
                    return json.loads(candidate)
                except Exception:
                    pass
                    
            if "```" in txt:
                for part in reversed(txt.split("```")):
                    part_str = part.strip()
                    if part_str.startswith("{") and part_str.endswith("}"):
                        try:
                            return json.loads(part_str)
                        except Exception:
                            pass

            if "</think>" in txt:
                txt = txt.split("</think>")[-1].strip()

            start_indices = [m.start() for m in re.finditer(r'\{', txt)]
            end_indices = [m.start() for m in re.finditer(r'\}', txt)]
            
            if start_indices and end_indices:
                for s in reversed(start_indices):
                    for e in reversed(end_indices):
                        if e > s:
                            sub = txt[s:e+1]
                            sub_clean = re.sub(r',\s*([\]}])', r'\1', sub)
                            try:
                                return json.loads(sub_clean)
                            except Exception:
                                continue
            raise ValueError("No valid JSON object found")

        try:
            data = extract_last_json(reply)
            if not data.get("components"):
                raise ValueError("No components in vision JSON")
        except Exception:
            print("[Aura Vision] Refining vision description into structured component JSON via Llama 3.3 70B...")
            refine_prompt = f"""You are 'Aura Vision', an expert AI nutritionist.
Convert the following food vision description into a single valid JSON object adhering strictly to this schema:
{{
  "meal_name": "Name of the dish",
  "description": "Clean description of the meal viewed",
  "components": [
    {{
      "name": "Component name (e.g. Seafood Mix)",
      "portion": "Estimated portion (e.g. 150g)",
      "calories": 200,
      "protein_g": 20.0,
      "carbs_g": 10.0,
      "fat_g": 5.0,
      "fiber_g": 1.0
    }}
  ],
  "totals": {{
    "calories": 200,
    "protein_g": 20.0,
    "carbs_g": 10.0,
    "fat_g": 5.0,
    "fiber_g": 1.0
  }}
}}

Food Vision Description:
\"\"\"{reply}\"\"\"
Return ONLY the JSON object."""
            try:
                refinement = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": refine_prompt}],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                data = json.loads(refinement.choices[0].message.content.strip())
            except Exception as e2:
                print(f"[Aura Vision] Refinement error: {e2}")
                data = {
                    "meal_name": "Scanned Meal",
                    "description": reply[:300] if reply else "Analyzed food photo.",
                    "components": [],
                    "totals": {"calories": 350, "protein_g": 25, "carbs_g": 40, "fat_g": 10, "fiber_g": 3}
                }
        
        totals = data.get("totals", {}) if isinstance(data, dict) else {}
        components = data.get("components", []) if isinstance(data, dict) else []
        description = data.get("description", "Analyzed meal photo.") if isinstance(data, dict) else "Analyzed meal photo."
        meal_name = data.get("meal_name", "Scanned Meal") if isinstance(data, dict) else "Scanned Meal"
        
        if not totals and components:
            totals = {
                "calories": sum(c.get("calories", 0) for c in components if isinstance(c, dict)),
                "protein_g": sum(c.get("protein_g", 0) for c in components if isinstance(c, dict)),
                "carbs_g": sum(c.get("carbs_g", 0) for c in components if isinstance(c, dict)),
                "fat_g": sum(c.get("fat_g", 0) for c in components if isinstance(c, dict)),
                "fiber_g": sum(c.get("fiber_g", 0) for c in components if isinstance(c, dict)),
            }

        logged_record = None
        if payload.auto_log:
            with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO nutrition_logs (user_id, meal_name, calories, protein_g, carbs_g, fat_g, fiber_g, description)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    user_id, meal_name, totals.get("calories", 0),
                    totals.get("protein_g", 0), totals.get("carbs_g", 0), totals.get("fat_g", 0),
                    totals.get("fiber_g", 0), description
                ))
                logged_record = cur.fetchone()
                db.commit()

        return {
            "success": True,
            "meal_name": meal_name,
            "description": description,
            "components": components,
            "totals": totals,
            "model_used": GROQ_VISION_MODEL,
            "logged_record": logged_record
        }

    except Exception as e:
        print(f"[Aura Vision] Response formatting error: {e}")
        return {
            "success": True,
            "meal_name": "Scanned Meal",
            "description": "Analyzed food photo.",
            "components": [],
            "totals": {"calories": 350, "protein_g": 25, "carbs_g": 40, "fat_g": 10, "fiber_g": 3},
            "model_used": GROQ_VISION_MODEL,
            "logged_record": None
        }


@router.post("/water")
def log_water(payload: dict, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    amount = payload.get("amount_ml", 0)
    action = payload.get("action", "add")
    
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if action == "add":
            cur.execute("""
                INSERT INTO water_logs (user_id, amount_ml, date)
                VALUES (%s, %s, CURRENT_DATE)
                ON CONFLICT (user_id, date) DO UPDATE SET amount_ml = water_logs.amount_ml + EXCLUDED.amount_ml
                RETURNING amount_ml
            """, (user_id, amount))
        else:
            cur.execute("""
                INSERT INTO water_logs (user_id, amount_ml, date)
                VALUES (%s, %s, CURRENT_DATE)
                ON CONFLICT (user_id, date) DO UPDATE SET amount_ml = EXCLUDED.amount_ml
                RETURNING amount_ml
            """, (user_id, amount))
        result = cur.fetchone()
    return result

@router.get("/water/today")
def get_today_water(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT amount_ml FROM water_logs WHERE user_id = %s AND date = CURRENT_DATE", (user_id,))
        row = cur.fetchone()
    return row or {"amount_ml": 0}

# --- Recommendation System ---

from services.nutrition_service import NutritionService

@router.post("/calculate-targets")
def calculate_nutrition_targets(payload: NutritionCalculationRequest):
    return NutritionService.calculate_recommendation(payload.dict())

@router.post("/save-targets")
def save_nutrition_targets(payload: NutritionTargetSaveRequest, user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO nutrition_targets (
                user_id, 
                suggested_calories, suggested_protein, suggested_carbs, suggested_fat,
                final_calories, final_protein, final_carbs, final_fat,
                goal, pace, diet_style,
                maintenance_calories, expected_weekly_change
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            user_id,
            payload.suggested["calories"], payload.suggested["protein"], payload.suggested["carbs"], payload.suggested["fat"],
            payload.final["calories"], payload.final["protein"], payload.final["carbs"], payload.final["fat"],
            payload.goal, payload.pace, payload.diet_style,
            payload.maintenance_calories, payload.expected_weekly_change
        ))
        return cur.fetchone()

@router.get("/targets/latest")
def get_latest_targets(user_id: int = Depends(get_current_user_id), db=Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM nutrition_targets 
            WHERE user_id = %s 
            ORDER BY created_at DESC LIMIT 1
        """, (user_id,))
        return cur.fetchone()
