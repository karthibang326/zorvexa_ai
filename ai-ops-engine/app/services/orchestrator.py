import asyncio
import json
import uuid
import logging
from typing import List, Dict, Any, Optional
from ..core.base import ILLMService, IMemoryStore
from ..core.planner import DAG, Task
from ..core.executor import ExecutorAgent, TaskResult
from ..core.validator import ValidatorAgent

class OrchestratorService:
    def __init__(self, llm: ILLMService, memory_store: IMemoryStore, executor: ExecutorAgent, validator: ValidatorAgent):
        self.llm = llm
        self.memory = memory_store
        self.executor = executor
        self.validator = validator
        self.logger = logging.getLogger(__name__)

    async def run_autonomous_loop(self, user_intent: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Production-grade execution loop with semantic retrieval and robust retries.
        """
        plan_id = str(uuid.uuid4())
        self.logger.info(f"Loop {plan_id} started: {user_intent}")

        # 🧠 1. PLANNING (Retrieval-Augmented)
        # Performance: Search similar past successes to optimize plan generation
        query_vector = await self.llm.get_embedding(user_intent)
        similar_past = await self.memory.search(query_vector, top_k=3)
        
        # Build plan prompt with context from memory (Self-Learning)
        past_plans = [m["dag_json"] for m in similar_past if m.get("status") == "success"]
        
        system_prompt = "You are a Cloud Ops Planner. Generate a JSON DAG. Use past successful plans for context."
        user_prompt = f"Intent: {user_intent}\nContext: {json.dumps({'past_plans': past_plans[:2]})}"
        
        dag_json = await self.llm.generate_json(system_prompt, user_prompt)
        dag = DAG(**dag_json)

        # ⚙️ 2. EXECUTION / VALIDATION (Fault-Tolerant Feedback)
        results = []
        for task in dag.tasks:
            # Task-level retry policy (Exponential Backoff could be added here)
            task_result = await self._execute_task_with_retries(task)
            results.append(task_result)
            
            if task_result.status == "failure":
                # Decision point: abort or continue? ABORT for sequential safety.
                break

        # 🧠 3. RECORDING (Self-Learning Update)
        status = "success" if all(r.status == "success" for r in results) and len(results) == len(dag.tasks) else "failure"
        
        # Store in vector memory for future retrieval
        memory_metadata = {
            "plan_id": plan_id,
            "intent": user_intent,
            "dag_json": json.dumps(dag.dict()),
            "status": status,
            "results": json.dumps([r.dict() for r in results])
        }
        # In a real environment, vector storage and SQL storage would be done atomically.
        await self.memory.add(query_vector, memory_metadata)

        return {
            "plan_id": plan_id,
            "status": status,
            "results": results,
            "dag": dag
        }

    async def _execute_task_with_retries(self, task: Task, max_retries: int = 2) -> TaskResult:
        """
        Internal task execution loop with self-learning feedback fix.
        """
        current_params = task.params.copy()
        last_error = None
        
        for attempt in range(max_retries + 1):
            # 1. Execute
            modified_task = Task(**{**task.dict(), "params": current_params})
            result = await self.executor.execute_task(modified_task)
            
            # 2. Validate
            if result.status == "success":
                validation = await self.validator.validate(result.output, {"expected_fields": task.params.get("validation_fields", [])})
                if validation.is_valid:
                    return result
                else:
                    last_error = validation.reason
                    result.status = "failure" # Mark as failure to trigger fix logic
            else:
                last_error = result.error

            # 3. Fix (Self-Learning Loop)
            if attempt < max_retries:
                self.logger.info(f"Task {task.id} failed (attempt {attempt}). Consulting AI for fix...")
                fix_prompt = f"Task: {task.id}\nAction: {task.action}\nError: {last_error}\nPropose a fix JSON with 'new_params'."
                
                # LLM analyzes failure and proposes fix
                # Fault Tolerance: LLM could also look into memory for similar fixes here
                fix_json = await self.llm.generate_json("You are an AI Ops Debugger.", fix_prompt)
                
                if "new_params" in fix_json:
                    current_params.update(fix_json["new_params"])
                    self.logger.info(f"Applying fix to task {task.id}: {fix_json['new_params']}")
                
        return TaskResult(task_id=task.id, status="failure", output=None, error=last_error)
