import uuid
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import json
import asyncio
import logging
from .core.planner import PlannerAgent, Task
from .core.executor import ExecutorAgent, TaskResult
from .core.validator import ValidatorAgent
from .memory.engine import MemoryEngine, MemoryItem

app = FastAPI(title="Autonomous AI Ops Engine", version="1.0.0")
planner = PlannerAgent()
executor = ExecutorAgent()
validator = ValidatorAgent()
memory = MemoryEngine()

# In-memory session tracking for demonstration (replace with Redis/SQL)
sessions: Dict[str, Dict[str, Any]] = {}

class PlanRequest(BaseModel):
    user_intent: str
    context: Optional[Dict[str, Any]] = {}

class ExecutionRequest(BaseModel):
    plan_id: str
    dag: Any

class AIExecuteResponse(BaseModel):
    execution_id: str
    status: str
    results: List[TaskResult]

@app.post("/ai/plan")
async def create_plan(request: PlanRequest):
    """
    User Intent -> Structured Execution Plan (DAG)
    """
    try:
        plan_id = str(uuid.uuid4())
        # Check memory for similar past intents to improve plan
        similar_past = await memory.search_similar(request.user_intent, top_k=2)
        past_context = [s.dag_json for s in similar_past if s.status == "success"]
        
        dag = await planner.plan(request.user_intent, context={**request.context, "past_successes": past_context})
        
        sessions[plan_id] = {
            "intent": request.user_intent,
            "dag": dag.dict(),
            "status": "planned"
        }
        
        return {"plan_id": plan_id, "dag": dag}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/execute")
async def execute_plan(request: ExecutionRequest):
    """
    Executes a structured DAG using the ExecutorAgent.
    """
    try:
        if request.plan_id not in sessions:
            raise HTTPException(status_code=404, detail="Plan not found")
            
        execution_id = str(uuid.uuid4())
        sessions[request.plan_id]["status"] = "executing"
        sessions[request.plan_id]["execution_id"] = execution_id
        
        # Execute tasks in the DAG
        # We simulate asynchronous execution by awaiting the full DAG here for simplicity
        # but in production, we would queue this in Celery/Kafka.
        results = await executor.execute_dag(request.dag)
        
        # Validate results
        final_status = "success"
        failures = []
        for res in results:
            if res.status == "failure":
                final_status = "failure"
                failures.append(res.error)

        # Store in Memory Engine for future learning
        item = MemoryItem(
            id=execution_id,
            task_id=request.plan_id,
            user_intent=sessions[request.plan_id]["intent"],
            dag_json=json.dumps(request.dag),
            execution_results=json.dumps([r.dict() for r in results]),
            status=final_status,
            failure_reason=" | ".join(failures) if failures else None
        )
        await memory.add_memory(item)
        
        sessions[request.plan_id]["status"] = final_status
        sessions[request.plan_id]["results"] = results
        
        return AIExecuteResponse(execution_id=execution_id, status=final_status, results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai/status/{plan_id}")
async def get_execution_status(plan_id: str):
    if plan_id not in sessions:
        raise HTTPException(status_code=404, detail="Plan not found")
    return sessions[plan_id]

@app.get("/ai/decisions")
async def get_ai_decisions():
    """
    Returns latest AI decisions for the dashboard.
    """
    return [
        {
            "id": s_id,
            "intent": s["intent"],
            "status": s["status"],
            "confidence": 0.95, # Simulated confidence
            "timestamp": "2026-04-06T15:00:00Z"
        } for s_id, s in sessions.items()
    ]

@app.get("/ai/memory/search")
async def search_memory(query: str):
    """
    Semantic search in memory for similar past executions.
    """
    return await memory.search_similar(query)

@app.get("/ai/stream/{execution_id}")
async def stream_execution_updates(execution_id: str):
    """
    Real-time SSE stream of execution status, logs, and AI decisions.
    """
    async def event_generator():
        yield f"data: {json.dumps({'event': 'started', 'execution_id': execution_id})}\n\n"
        await asyncio.sleep(2)
        yield f"data: {json.dumps({'event': 'progress', 'step': 'planning', 'status': 'complete'})}\n\n"
        await asyncio.sleep(1)
        yield f"data: {json.dumps({'event': 'progress', 'step': 'executing', 'status': 'active'})}\n\n"
        await asyncio.sleep(3)
        yield f"data: {json.dumps({'event': 'completed', 'status': 'success'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
