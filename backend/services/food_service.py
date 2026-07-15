import csv
import os
import logging
import psycopg2.extras
from typing import Dict, List

log = logging.getLogger("hpi")

def seed_food_items(conn):
    """Seed food items from CSV files in data/food/."""
    
    # 0. Early-exit guard: Check if food_items table already has data
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) as cnt FROM food_items")
            row = cur.fetchone()
            if row and row["cnt"] > 0:
                log.info(f"[SEED] Food library already populated ({row['cnt']} rows). Skipping CSV ingestion.")
                return
    except Exception as e:
        log.warning(f"[SEED] Could not verify existing food count: {e}")

    food_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "food")
    
    # 1. calories.csv
    calories_csv = os.path.join(food_dir, "calories.csv")
    if os.path.exists(calories_csv):
        try:
            with open(calories_csv, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                items = []
                for row in reader:
                    name = row.get("FoodItem")
                    category = row.get("FoodCategory")
                    cals_str = row.get("Cals_per100grams", "0").replace(" cal", "").strip()
                    try:
                        calories = float(cals_str)
                    except:
                        calories = 0.0
                    
                    items.append({
                        "name": name,
                        "category": category,
                        "calories": calories,
                        "serving_size": 100.0,
                        "serving_unit": "g",
                        "is_branded": False
                    })
                
                if items:
                    log.info(f"[SEED] Starting bulk ingestion of {len(items)} items from calories.csv...")
                    _upsert_food_items_bulk(conn, items)
                    log.info(f"[SEED] Successfully ingested {len(items)} items from calories.csv")
        except Exception as e:
            log.warning(f"[SEED] Error seeding calories.csv: {e}")

    # 2. daily_food_nutrition_dataset.csv
    nutrition_csv = os.path.join(food_dir, "daily_food_nutrition_dataset.csv")
    if os.path.exists(nutrition_csv):
        try:
            with open(nutrition_csv, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                items = []
                for row in reader:
                    name = row.get("Food_Item")
                    category = row.get("Category")
                    try:
                        calories = float(row.get("Calories (kcal)", 0))
                        protein = float(row.get("Protein (g)", 0))
                        carbs = float(row.get("Carbohydrates (g)", 0))
                        fat = float(row.get("Fat (g)", 0))
                        fiber = float(row.get("Fiber (g)", 0))
                    except:
                        continue
                        
                    items.append({
                        "name": name,
                        "category": category,
                        "calories": calories,
                        "protein_g": protein,
                        "carbs_g": carbs,
                        "fat_g": fat,
                        "fiber_g": fiber,
                        "serving_size": 100.0,
                        "serving_unit": "g",
                        "is_branded": False
                    })
                
                if items:
                    log.info(f"[SEED] Starting bulk ingestion of {len(items)} items from daily_food_nutrition_dataset.csv...")
                    _upsert_food_items_bulk(conn, items)
                    log.info(f"[SEED] Successfully ingested {len(items)} items from daily_food_nutrition_dataset.csv")
        except Exception as e:
            log.warning(f"[SEED] Error seeding daily_food_nutrition_dataset.csv: {e}")

def _upsert_food_items_bulk(conn, items: List[Dict]):
    """Perform bulk insert with ON CONFLICT DO NOTHING for performance."""
    from psycopg2.extras import execute_values
    
    # Format: (name, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, is_branded)
    values = [
        (
            item["name"], 
            item.get("category"), 
            item.get("calories", 0.0),
            item.get("protein_g", 0.0), 
            item.get("carbs_g", 0.0), 
            item.get("fat_g", 0.0),
            item.get("fiber_g", 0.0), 
            item.get("serving_size", 100.0),
            item.get("serving_unit", "g"), 
            item.get("is_branded", False)
        )
        for item in items
    ]
    
    query = """
        INSERT INTO food_items (name, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, is_branded)
        VALUES %s
        ON CONFLICT (name) DO UPDATE SET
            category = COALESCE(EXCLUDED.category, food_items.category),
            calories = CASE WHEN (EXCLUDED.protein_g > 0 OR EXCLUDED.carbs_g > 0 OR EXCLUDED.fat_g > 0 OR EXCLUDED.fiber_g > 0) THEN EXCLUDED.calories ELSE food_items.calories END,
            protein_g = CASE WHEN (EXCLUDED.protein_g > 0 OR EXCLUDED.carbs_g > 0 OR EXCLUDED.fat_g > 0 OR EXCLUDED.fiber_g > 0) THEN EXCLUDED.protein_g ELSE food_items.protein_g END,
            carbs_g = CASE WHEN (EXCLUDED.protein_g > 0 OR EXCLUDED.carbs_g > 0 OR EXCLUDED.fat_g > 0 OR EXCLUDED.fiber_g > 0) THEN EXCLUDED.carbs_g ELSE food_items.carbs_g END,
            fat_g = CASE WHEN (EXCLUDED.protein_g > 0 OR EXCLUDED.carbs_g > 0 OR EXCLUDED.fat_g > 0 OR EXCLUDED.fiber_g > 0) THEN EXCLUDED.fat_g ELSE food_items.fat_g END,
            fiber_g = CASE WHEN (EXCLUDED.protein_g > 0 OR EXCLUDED.carbs_g > 0 OR EXCLUDED.fat_g > 0 OR EXCLUDED.fiber_g > 0) THEN EXCLUDED.fiber_g ELSE food_items.fiber_g END
    """
    
    with conn.cursor() as cur:
        execute_values(cur, query, values)
    conn.commit()

