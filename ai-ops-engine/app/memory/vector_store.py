import faiss
import numpy as np
import json
from typing import List, Dict, Any, Optional
from ..core.base import IMemoryStore
import os
import logging

class FAISSVectorStore(IMemoryStore):
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        self.index = faiss.IndexFlatL2(dimension)
        self.metadata: List[Dict[str, Any]] = []
        self.logger = logging.getLogger(__name__)

    async def add(self, vector: List[float], metadata: Dict[str, Any]):
        """
        Adds a single vector and its metadata to the local FAISS index.
        Thread-safety (not implemented here) should be handled by the orchestrator.
        """
        try:
            v_array = np.array([vector]).astype('float32')
            self.index.add(v_array)
            self.metadata.append(metadata)
        except Exception as e:
            self.logger.error(f"Failed to add to vector store: {e}")
            raise

    async def search(self, vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Searches for the nearest neighbors of the provided vector.
        """
        if self.index.ntotal == 0:
            return []
            
        try:
            v_array = np.array([vector]).astype('float32')
            distances, indices = self.index.search(v_array, min(top_k, self.index.ntotal))
            
            results = []
            for i, idx in enumerate(indices[0]):
                if idx != -1 and idx < len(self.metadata):
                    results.append({
                        **self.metadata[idx],
                        "distance": float(distances[0][i])
                    })
            return results
        except Exception as e:
            self.logger.error(f"Failed to search vector store: {e}")
            return []
