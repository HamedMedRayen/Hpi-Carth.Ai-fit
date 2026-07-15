"""
HPI — Retroactively update food library calories and macros
This script reads the CSV files from data/food/ and updates the existing food items in-place.
"""

import csv
import os
import sys
from pathlib import Path
import psycopg2.extras

def patch(conn):
    food_dir = Path(__file__).parent.parent / "data" / "food"
    
    # 1. calories.csv
    calories_csv = food_dir / "calories.csv"
    if calories_csv.exists():
        try:
            print("[PATCH] Reading calories.csv...")
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
                    print(f"[PATCH] Ingesting/Updating {len(items)} items from calories.csv...")
                    _upsert_food_items_bulk(conn, items)
        except Exception as e:
            print(f"[PATCH] Error parsing calories.csv: {e}")

    # 2. daily_food_nutrition_dataset.csv
    nutrition_csv = food_dir / "daily_food_nutrition_dataset.csv"
    if nutrition_csv.exists():
        try:
            print("[PATCH] Reading daily_food_nutrition_dataset.csv...")
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
                    print(f"[PATCH] Ingesting/Updating {len(items)} items from daily_food_nutrition_dataset.csv...")
                    _upsert_food_items_bulk(conn, items)
        except Exception as e:
            print(f"[PATCH] Error parsing daily_food_nutrition_dataset.csv: {e}")

def _upsert_food_items_bulk(conn, items):
    from psycopg2.extras import execute_values
    
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

if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from database import get_connection
    conn = get_connection()
    patch(conn)
    conn.close()
    print("[PATCH] Food library calories and macros successfully updated!")
