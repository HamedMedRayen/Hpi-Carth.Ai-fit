import json
import os
from pathlib import Path
from typing import List, Dict, Any

class ChallengeService:
    def __init__(self):
        self.data_path = Path(__file__).parent.parent.parent / "data" / "fitness_challenges.json"
        self._cache = None

    def get_all_challenges(self) -> Dict[str, Any]:
        if self._cache:
            return self._cache
        
        if not os.path.exists(self.data_path):
            return {"challenges": []}
            
        with open(self.data_path, 'r', encoding='utf-8') as f:
            self._cache = json.load(f)
        return self._cache

    def get_challenge_by_id(self, challenge_id: str) -> Dict[str, Any]:
        data = self.get_all_challenges()
        for challenge in data.get("challenges", []):
            if challenge["id"] == challenge_id:
                return challenge
        return None

challenge_service = ChallengeService()
