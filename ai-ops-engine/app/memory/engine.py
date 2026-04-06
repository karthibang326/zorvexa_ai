import faiss
import numpy as np
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from openai import OpenAI
import os

class MemoryItem(BaseModel):
    id: str
    task_id: str
    user_intent: str
    dag_json: str
    execution_results: str
    status: str # "success" | "failure"
    failure_reason: Optional[str] = None
    fix_applied: Optional[str] = None
    performance_metrics: Dict[str, Any] = {}
    embedding: List[float] = []

class MemoryEngine:
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        # Store index in FAISS (vector database)
        self.index = faiss.IndexFlatL2(dimension)
        # Store metadata in list or dict (to be persisted in SQL DB)
        self.metadata = {}
        self.items = []
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def get_embedding(self, text: str) -> List[float]:
        response = self.client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding

    async def add_memory(self, item: MemoryItem):
        """
        Adds a memory entry to the vector store and the metadata storage.
        """
        embedding = self.get_embedding(f"Intent: {item.user_intent}\nStatus: {item.status}\nFix: {item.fix_applied}")
        item.embedding = embedding
        
        vector = np.array([embedding]).astype('float32')
        self.index.add(vector)
        self.items.append(item)
        self.metadata[len(self.items) - 1] = item

    async def search_similar(self, query: str, top_k: int = 3) -> List[MemoryItem]:
        """
        Retrieves similar past tasks for self-learning and fix retrieval.
        """
        embedding = np.array([self.get_embedding(query)]).astype('float32')
        distances, indices = self.index.search(embedding, top_k)
        
        results = []
        for idx in indices[0]:
            if idx != -1 and idx < len(self.items):
                results.append(self.items[idx])
        return results

    async def learn_from_failure(self, failed_task_id: str, error: str) -> Optional[str]:
        """
        Uses LLM to analyze similar past successes/failures and propose a fix.
        """
        similar_past = await self.search_similar(error, top_k=5)
        
        context = "\n".join([
            f"Intent: {m.user_intent}\nFailure: {m.failure_reason}\nFix: {m.fix_applied}"
            for m in similar_past if m.fix_applied
        ])

        system_prompt = f"""
        You are an AI Ops Self-Learning Engine. 
        Analyze the current failure and similar past cases to propose a fix.
        Current Failure: {error}
        Similar Past Context: {context}
        Propose a specific action or parameter change to fix the task.
        """

        response = self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[{"role": "system", "content": system_prompt}]
        )

        return response.choices[0].message.content
