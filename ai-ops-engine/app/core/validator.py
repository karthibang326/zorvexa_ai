import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from openai import OpenAI
import os

class ValidationResult(BaseModel):
    is_valid: bool
    reason: Optional[str] = None
    sla_compliance: bool = True
    quality_score: float = 1.0 # 0.0 - 1.0

class ValidatorAgent:
    def __init__(self, api_key: Optional[str] = None):
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")

    async def validate(self, task_output: Any, constraints: Dict[str, Any]) -> ValidationResult:
        """
        Verifies task output against predefined constraints.
        Supports both deterministic and AI-powered quality validation.
        """
        # Deterministic checks first
        if "expected_fields" in constraints:
            for field in constraints["expected_fields"]:
                if field not in task_output:
                    return ValidationResult(is_valid=False, reason=f"Missing field: {field}", quality_score=0.0)

        # AI-powered quality validation
        system_prompt = f"""
        You are a FAANG-grade Cloud Ops Validator.
        Your task is to judge if a task output is correct, of high quality, and meets the given constraints.
        
        Constraints: {json.dumps(constraints)}
        Task Output: {json.dumps(task_output)}
        
        Return JSON format: {{"is_valid": true/false, "reason": "...", "quality_score": 0.0-1.0}}
        """

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system_prompt}],
            response_format={"type": "json_object"}
        )

        res_json = json.loads(response.choices[0].message.content)
        return ValidationResult(**res_json)
