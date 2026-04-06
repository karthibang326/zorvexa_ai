import uuid
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import json
import asyncio
import logging
from .core.planner import PlannerAgent, Task, DAG
from .core.executor import ExecutorAgent, TaskResult
from .core.validator import ValidatorAgent
from .services.llm import OpenAIService
from .memory.vector_store import FAISSVectorStore
from .services.orchestrator import OrchestratorService

app = FastAPI(title="Autonomous AI Ops Engine", version="1.0.0")

# 🏛️ Dependency Injection Setup (Production-Grade Architecture)
llm = OpenAIService(api_key=os.getenv("OPENAI_API_KEY", "mock-key"))
vector_store = FAISSVectorStore(dimension=1536)
executor = ExecutorAgent()
validator = ValidatorAgent(api_key=os.getenv("OPENAI_API_KEY"))
orchestrator = OrchestratorService(llm, vector_store, executor, validator)

# 💾 Scalability: Session Store (Abstraction over Redis or SQL)
# For this demo, we maintain it in-process, but the interface is ready for a distributed store.
execution_sessions: Dict[str, Dict[str, Any]] = {}

class PlanRequest(BaseModel):
    user_intent: str
    context: Optional[Dict[str, Any]] = {}

class ExecutionRequest(BaseModel):
    plan_id: str

class AIExecuteResponse(BaseModel):
    execution_id: str
    status: str
    results: List[TaskResult]
    dag: DAG

@app.post("/ai/plan")
async def create_plan(request: PlanRequest):
    """
    User Intent -> Structured Execution Plan (DAG)
    Identifies if a similar plan already exists in semantic memory.
    """
    try:
        plan_id = str(uuid.uuid4())
        
        # 1. Performance: Check semantic memory for context retrieval
        query_vector = await llm.get_embedding(request.user_intent)
        similar_past = await vector_store.search(query_vector, top_k=2)
        past_context = [s["dag_json"] for s in similar_past if s["status"] == "success"]
        
        # 2. Plan Generation
        system_prompt = "You are a Cloud Ops Planner. Generate a JSON DAG."
        user_prompt = f"Intent: {request.user_intent}\nKnown Patterns: {json.dumps(past_context)}"
        
        dag_json = await llm.generate_json(system_prompt, user_prompt)
        dag = DAG(**dag_json)
        
        execution_sessions[plan_id] = {
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
    Autonomous Feedback Loop (Plan -> Execute -> Validate -> Fix -> Record).
    Offloads to the Orchestrator for fault-tolerant execution.
    """
    try:
        if request.plan_id not in execution_sessions:
            raise HTTPException(status_code=404, detail="Plan session not found")
            
        intent = execution_sessions[request.plan_id]["intent"]
        execution_sessions[request.plan_id]["status"] = "executing"
        
        # TRIGGER THE AUTONOMOUS OODA LOOP
        loop_result = await orchestrator.run_autonomous_loop(intent)
        
        # Final update of session state
        execution_sessions[request.plan_id].update({
            "status": loop_result["status"],
            "results": loop_result["results"],
            "dag": loop_result["dag"]
        })
        
        return AIExecuteResponse(
            execution_id=loop_result["plan_id"], 
            status=loop_result["status"], 
            results=loop_result["results"],
            dag=loop_result["dag"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
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
