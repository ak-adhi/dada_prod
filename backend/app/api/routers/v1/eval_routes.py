from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
from api.core_modules import evaluate_response

router = APIRouter()

class EvaluatePayload(BaseModel):
    run_id: str
    model_id: str
    response: str
    
@router.post("/", response_model=Dict[str, bool])
def evaluate_response_route(payload: EvaluatePayload):
    """Evaluates an LLM response for attack success."""
    
    is_safe = evaluate_response(payload.response)
    
    return {
        "is_safe": is_safe
    }
