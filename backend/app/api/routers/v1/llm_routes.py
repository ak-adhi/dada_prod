from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from api.core_modules import LLMClient

router = APIRouter()

class LLMQueryPayload(BaseModel):
    model_id: str
    prompt: str
    session_id: Optional[str] = None
    stream: bool = False

@router.post("/query", response_model=Dict[str, Any])
def query_llm_model(payload: LLMQueryPayload):
    """Synchronously queries the LLM Docker container."""
    
    # NOTE: Since the LLMClient mock is simple, we reuse the global one.
    # In a real app, you would instantiate or use a pool for the specific model_id.
    
    client = LLMClient(model_id=payload.model_id)
    response = client.query(payload.prompt, payload.stream)
    
    return {
        "model_id": payload.model_id,
        "response": response["text"],
        "stream_supported": False # Mocking no streaming for this sync endpoint
    }
