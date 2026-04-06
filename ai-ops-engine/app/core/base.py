from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class LLMResponse(BaseModel):
    content: str
    raw_response: Any
    usage: Dict[str, int]

class ILLMService(ABC):
    @abstractmethod
    async def generate_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        pass

    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        pass

class IMemoryStore(ABC):
    @abstractmethod
    async def add(self, vector: List[float], metadata: Dict[str, Any]):
        pass

    @abstractmethod
    async def search(self, vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        pass
