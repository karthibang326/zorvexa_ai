import urllib.request
import json
import time

def test_ai_ops_flow(port=8000):
    base_url = f"http://localhost:{port}"
    
    # 🎯 1. User Intent -> Plan
    intent = "Scale down order-service by 50% due to low throughput."
    print(f"Submitting intent: {intent}")
    
    req = urllib.request.Request(f"{base_url}/ai/plan", data=json.dumps({"user_intent": intent}).encode('utf-8'), method='POST')
    with urllib.request.urlopen(req) as res:
        plan_data = json.loads(res.read().decode('utf-8'))
        plan_id = plan_data["plan_id"]
        dag = plan_data["dag"]
        print(f"Generated Plan ID: {plan_id}")
        print(f"DAG: {json.dumps(dag, indent=2)}")

        time.sleep(1)

        # ⚙️ 2. Execute the Plan
        print(f"Executing plan: {plan_id}")
        req_exec = urllib.request.Request(f"{base_url}/ai/execute", data=json.dumps({"plan_id": plan_id, "dag": dag}).encode('utf-8'), method='POST')
        with urllib.request.urlopen(req_exec) as res_exec:
            exec_data = json.loads(res_exec.read().decode('utf-8'))
            print(f"Execution Status: {exec_data['status']}")
            print(f"Results: {json.dumps(exec_data['results'], indent=2)}")

        time.sleep(1)

        # 🔄 3. Memory Retrieval
        print("Retrieving past executions from Memory Engine...")
        with urllib.request.urlopen(f"{base_url}/ai/memory") as res_mem:
            mem_data = json.loads(res_mem.read().decode('utf-8'))
            print(f"Found {len(mem_data)} similar past cases in Memory Engine.")

if __name__ == "__main__":
    test_ai_ops_flow()
