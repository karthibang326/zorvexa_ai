import asyncio
import httpx
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from .planner import Task, TaskType
import json
import logging

class TaskResult(BaseModel):
    task_id: str
    status: str # "success" | "failure"
    output: Any
    error: Optional[str] = None
    fix_applied: Optional[str] = None

class ExecutorAgent:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    async def execute_task(self, task: Task) -> TaskResult:
        """
        Executes a granular task: api_call, data_pipeline, or job_execution.
        """
        self.logger.info(f"Executing task {task.id}: {task.type} - {task.action}")
        
        try:
            if task.type == TaskType.API_CALL:
                return await self._execute_api_call(task)
            elif task.type == TaskType.DATA_PIPELINE:
                return await self._execute_data_pipeline(task)
            elif task.type == TaskType.JOB_EXECUTION:
                return await self._execute_job(task)
            else:
                return TaskResult(task_id=task.id, status="failure", output=None, error="Unknown task type")
        except Exception as e:
            return TaskResult(task_id=task.id, status="failure", output=None, error=str(e))

    async def _execute_api_call(self, task: Task) -> TaskResult:
        # Example API call implementation
        async with httpx.AsyncClient() as client:
            # Simplified parsing: "GET /url"
            parts = task.action.split(" ")
            method = parts[0].upper()
            url = parts[1]
            
            response = await client.request(method, url, json=task.params)
            response.raise_for_status()
            return TaskResult(task_id=task.id, status="success", output=response.json())

    async def _execute_data_pipeline(self, task: Task) -> TaskResult:
        # Simplified: Simulate processing a data pipeline
        await asyncio.sleep(1) # Simulate complex work
        return TaskResult(task_id=task.id, status="success", output={"processed_records": 1000})

    async def _execute_job(self, task: Task) -> TaskResult:
        # Executes specific task such as "scripts/analyze_metrics.py"
        process = await asyncio.create_subprocess_exec(
            "python3", task.action, 
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            return TaskResult(task_id=task.id, status="success", output=stdout.decode())
        else:
            return TaskResult(task_id=task.id, status="failure", output=None, error=stderr.decode())

    async def execute_dag(self, dag: Any) -> List[TaskResult]:
        """
        Executes an entire DAG, respecting dependencies.
        """
        results = {}
        pending_tasks = {t.id: t for t in dag.tasks}
        
        while pending_tasks:
            executable = [
                t for tid, t in pending_tasks.items() 
                if all(dep in results and results[dep].status == "success" for dep in t.dependencies)
            ]
            
            if not executable:
                # Potential deadlock or failed dependency
                failed_deps = [t for tid, t in pending_tasks.items() if any(dep in results and results[dep].status == "failure" for dep in t.dependencies)]
                for t in failed_deps:
                    results[t.id] = TaskResult(task_id=t.id, status="failure", output=None, error="Dependency failed")
                    del pending_tasks[t.id]
                if not failed_deps:
                    break
                continue

            # Execute tasks in parallel where possible
            batch_results = await asyncio.gather(*[self.execute_task(t) for t in executable])
            for res in batch_results:
                results[res.task_id] = res
                del pending_tasks[res.task_id]
                
        return list(results.values())
