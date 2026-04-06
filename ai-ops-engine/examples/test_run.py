import httpx
import asyncio
import json

async def test_ai_ops_flow():
    base_url = "http://localhost:8000"
    
    # 🎯 1. User Intent -> Plan
    intent = "Scale down the 'order-service' by 50% because its throughput is below 10 RPS for 1 hour."
    async with httpx.AsyncClient() as client:
        print(f"Submitting intent: {intent}")
        plan_res = await client.post(f"{base_url}/ai/plan", json={"user_intent": intent})
        plan_data = plan_res.json()
        plan_id = plan_data["plan_id"]
        dag = plan_data["dag"]
        print(f"Generated Plan ID: {plan_id}")
        print(f"DAG: {json.dumps(dag, indent=2)}")

        # ⚙️ 2. Execute the Plan
        print(f"Executing plan: {plan_id}")
        exec_res = await client.post(f"{base_url}/ai/execute", json={"plan_id": plan_id, "dag": dag})
        exec_data = exec_res.json()
        print(f"Execution Status: {exec_data['status']}")
        print(f"Results: {json.dumps(exec_data['results'], indent=2)}")

        # 🔄 3. Search Memory (to see if it learned)
        print("Searching memory for similar intents...")
        mem_res = await client.get(f"{base_url}/ai/memory/search?query=scale down order-service")
        mem_data = mem_res.json()
        print(f"Found {len(mem_data)} similar past cases in Memory Engine.")

if __name__ == "__main__":
    # Ensure the FastAPI server is running before executing this
    print("Ensure 'uvicorn app.main:app' is running on port 8000")
    try:
        asyncio.run(test_ai_ops_flow())
    except Exception as e:
        print(f"Error: {e}")
