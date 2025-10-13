from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal, Dict, Any
from redis import Redis
from api.dependencies import get_redis_client

router = APIRouter()

# --- Schemas ---

class DefenceTogglePayload(BaseModel):
    """Schema for the POST /api/v1/defence/toggle body."""
    session_id: str
    # model_id: str
    enable: bool # The desired state of the defense (True/False)
    tab: Literal["main", "chat", "taxonomy"] # Specifies which tab's defense state is being set

class DefenceToggleResponse(BaseModel):
    """Schema for the response after a successful toggle."""
    session_id: str
    tab: str
    is_enabled: bool

# --- API Endpoint ---

@router.post("/toggle", response_model=DefenceToggleResponse)
def toggle_defense_status(
    payload: DefenceTogglePayload,
    redis_client: Redis = Depends(get_redis_client) # Inject the Redis client
):
    """
    Toggles the defense flag for a specific session and tab, storing the state in Redis.
    This state is dynamically read by the Celery worker during attack execution.
    """
    
    # 1. Define the Redis key structure
    # Use HASH data structure: HSET dada:session:{session_id}:defence {tab} {enable}
    redis_key = f"dada:session:{payload.session_id}:defence"
    
    # 2. Convert boolean state to string for Redis storage ('true' or 'false')
    status_str = 'true' if payload.enable else 'false'
    
    try:
        # 3. Store the state using HSET (Hash Set)
        # This allows multiple tabs/models to store separate defense states under one session key.
        redis_client.hset(redis_key, payload.tab, status_str)
        
        print(f"Redis updated: Key={redis_key}, Field={payload.tab}, Value={status_str}")

    except Exception as e:
        # Catch connection errors or other Redis failures
        print(f"Error updating defense status in Redis: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to or update Redis.")

    # 4. Return confirmation response
    return DefenceToggleResponse(
        session_id=payload.session_id,
        tab=payload.tab,
        is_enabled=payload.enable
    )
