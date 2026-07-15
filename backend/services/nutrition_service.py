
from typing import Dict, Any, Optional

class NutritionService:
    @staticmethod
    def calculate_bmr(weight: float, height: float, age: int, sex: str) -> float:
        """Mifflin-St Jeor Equation"""
        if sex.upper() == 'M':
            return 10 * weight + 6.25 * height - 5 * age + 5
        else:
            return 10 * weight + 6.25 * height - 5 * age - 161

    @staticmethod
    def calculate_activity_expenditure(
        steps: int, 
        work_type: str, 
        training_sessions: int, 
        training_intensity: str
    ) -> float:
        # 1. Non-Exercise Activity Thermogenesis (NEAT) from work
        # Work multipliers (applied to BMR roughly for the work hours)
        work_multipliers = {
            "desk": 0.1,      # +10%
            "standing": 0.25,  # +25%
            "physical": 0.45   # +45%
        }
        work_bonus = work_multipliers.get(work_type.lower(), 0.1)
        
        # 2. Movement from steps
        # Approx 0.04 kcal per step for an average person
        step_calories = steps * 0.04
        
        # 3. Exercise Activity Thermogenesis (EAT)
        # Intensity multipliers for a 60min session
        intensity_map = {
            "low": 200,
            "moderate": 350,
            "high": 500
        }
        base_eat = intensity_map.get(training_intensity.lower(), 350)
        daily_eat = (base_eat * training_sessions) / 7
        
        return step_calories + daily_eat + work_bonus

    @staticmethod
    def get_goal_adjustment(goal: str, pace: str) -> float:
        """Returns a multiplier for total calories (e.g. 0.8 for 20% deficit)"""
        adjustments = {
            "fat_loss": {
                "slow": -0.10,
                "moderate": -0.20,
                "aggressive": -0.25
            },
            "muscle_gain": {
                "slow": 0.05,
                "moderate": 0.10,
                "aggressive": 0.15
            },
            "maintenance": {
                "slow": 0,
                "moderate": 0,
                "aggressive": 0
            }
        }
        return adjustments.get(goal.lower(), {}).get(pace.lower(), 0.0)

    @classmethod
    def calculate_recommendation(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        weight = float(data.get('weight', 0))
        height = float(data.get('height', 0))
        age = int(data.get('age', 0))
        sex = data.get('sex', 'M')
        
        steps = int(data.get('steps', 5000))
        work_type = data.get('work_type', 'desk')
        training_sessions = int(data.get('training_sessions', 3))
        training_intensity = data.get('training_intensity', 'moderate')
        
        goal = data.get('goal', 'maintenance')
        pace = data.get('pace', 'moderate')
        diet_style = data.get('diet_style', 'balanced')
        
        # 1. BMR
        bmr = cls.calculate_bmr(weight, height, age, sex)
        
        # 2. Activity
        # We apply work multiplier to BMR for the baseline
        work_multipliers = {"desk": 1.1, "standing": 1.25, "physical": 1.4}
        baseline_activity = bmr * work_multipliers.get(work_type.lower(), 1.1)
        
        # Add steps and exercise
        step_calories = steps * 0.04
        intensity_map = {"low": 200, "moderate": 350, "high": 500}
        daily_eat = (intensity_map.get(training_intensity.lower(), 350) * training_sessions) / 7
        
        maintenance = baseline_activity + step_calories + daily_eat
        
        # 3. Goal Adjustment
        adj_pct = cls.get_goal_adjustment(goal, pace)
        target_calories = maintenance * (1 + adj_pct)
        
        # 4. Macros
        # Protein: 1.8g to 2.2g per kg
        protein_g = weight * 2.0 
        if goal == "fat_loss":
            protein_g = weight * 2.2 # Higher protein for fat loss
        elif goal == "muscle_gain":
            protein_g = weight * 1.8 # Sufficient for growth
            
        # Fat: 25% of calories usually
        fat_pct = 0.25
        if diet_style == "low_carb":
            fat_pct = 0.40
            protein_g = weight * 2.4 # Even higher on low carb
        elif diet_style == "high_protein":
            protein_g = weight * 2.6
            fat_pct = 0.20
            
        fat_g = (target_calories * fat_pct) / 9
        
        # Carbs: Remainder
        carb_cals = target_calories - (protein_g * 4) - (fat_g * 9)
        carbs_g = max(carb_cals / 4, 0)
        
        # Weekly change (approx 7700 kcal per kg of fat)
        weekly_kcal_diff = (target_calories - maintenance) * 7
        expected_weekly_change = weekly_kcal_diff / 7700
        
        return {
            "maintenance_calories": round(maintenance),
            "target_calories": round(target_calories),
            "calorie_range": [round(target_calories * 0.95), round(target_calories * 1.05)],
            "protein_g": round(protein_g),
            "protein_range": [round(protein_g * 0.9), round(protein_g * 1.1)],
            "carbs_g": round(carbs_g),
            "carbs_range": [round(carbs_g * 0.9), round(carbs_g * 1.1)],
            "fat_g": round(fat_g),
            "fat_range": [round(fat_g * 0.9), round(fat_g * 1.1)],
            "expected_weekly_change": round(expected_weekly_change, 2),
            "goal": goal,
            "pace": pace,
            "diet_style": diet_style
        }
