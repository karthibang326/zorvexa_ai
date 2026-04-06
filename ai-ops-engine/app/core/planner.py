import json
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from openai import OpenAI
import os

class TaskType(str, Enum):
    API_CALL = "api_call"
    DATA_PIPELINE = "data_pipeline"
    JOB_EXECUTION = "job_execution"
    VALIDATION = "validation"

class Task(BaseModel):
    id: str
    type: TaskType
    action: str
    params: Dict[str, Any]
    dependencies: List[str] = []

class DAG(BaseModel):
    tasks: List[Task]

class PlannerAgent:
    def __init__(self, api_key: Optional[str] = None):
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")

    async def plan(self, user_intent: str, context: Optional[Dict] = None) -> DAG:
        """
        Converts user intent into a structured execution plan (DAG).
        """
        system_prompt = """
        You are a FAANG-grade Cloud Ops AI Planner. 
        Your task is to take a user intent and convert it into a structured execution DAG in JSON format.
        Each task must be granular and have a specific type: api_call, data_pipeline, or job_execution.
        You must specify dependencies between tasks.
        
        Example JSON Output:
        {
          "tasks": [
            {
              "id": "fetch-data",
              "type": "api_call",
              "action": "GET /api/v1/metrics",
              "params": {"metric": "cpu_utilization"},
              "dependencies": []
            },
            {
              "id": "analyze-cpu",
              "type": "job_execution",
              "action": "scripts/analyze_metrics.py",
              "params": {"threshold": 80},
              "dependencies": ["fetch-data"]
            }
          ]
        }
        """

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"User Intent: {user_intent}\nContext: {json.dumps(context or {})}"}
        ]

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            response_format={"type": "json_object"}
        )

        plan_json = json.loads(response.choices[0].message.content)
        return DAG(**plan_json)
