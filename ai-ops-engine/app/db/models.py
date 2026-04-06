from sqlalchemy import Column, String, JSON, Float, Boolean, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class ExecutionRecord(Base):
    """
    Persistence layer for all past executions for self-learning and audit trail.
    """
    __tablename__ = "execution_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_intent = Column(String, nullable=False)
    dag_json = Column(JSON, nullable=False)
    results_json = Column(JSON, nullable=False)
    status = Column(String, nullable=False) # success, failure
    failure_reason = Column(String, nullable=True)
    fix_applied = Column(String, nullable=True)
    performance_metrics = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIAction(Base):
    """
    Tracks every AI decision for the dashboard dashboard as per requirements.
    """
    __tablename__ = "ai_actions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    impact_quantified = Column(Float, nullable=True)
    confidence = Column(Float, nullable=False) # 0.0 - 1.0
    status = Column(String, nullable=False) # planned, executing, success, failure
    created_at = Column(DateTime, default=datetime.utcnow)

class MemoryStoreSQL(Base):
    """
    Persists semantic memory metadata (vectors are stored in FAISS, but IDs must match).
    """
    __tablename__ = "memory_store"
    
    id = Column(String, primary_key=True)
    user_intent = Column(String)
    fix_applied = Column(String)
    vector_id = Column(Integer) # Matches the FAISS index ID
    metadata_json = Column(JSON)
