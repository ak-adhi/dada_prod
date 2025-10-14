import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from celery.result import AsyncResult
# Import the Celery task defined in api/tasks.py
from api.tasks import run_full_attack_family

router = APIRouter()

# --- Request and Response Schemas ---

class AttackRunPayload(BaseModel):
    """Schema for the POST /api/v1/attacks/run body."""
    model_id: str
    usecase_id: str
    session_id: str
    defence_enabled: bool # The current state of defense when the user initiates the run
    attack_family: Optional[str] = None
    attack_id: Optional[int] = None
    metadata: Dict[str, Any] = {} # Used to pass context like 'tab'

class AttackRunResponse(BaseModel):
    """Schema for the 202 Accepted response."""
    run_id: str
    status: str
    task_url: str

class AttackStatusResponse(BaseModel):
    """Schema for the GET /api/v1/attacks/status/{task_id} response."""
    task_id: str
    status: str
    progress: Dict[str, Any]

# --- API Endpoints ---

@router.post("/run", response_model=AttackRunResponse, status_code=202)
def run_attack_task(payload: AttackRunPayload):
    """
    Kicks off a long-running attack job (single attack or full family) 
    using Celery and returns the Celery Task ID immediately.
    """
    # Generate a unique Run ID for history/tracking purposes
    run_id = f"run_{uuid.uuid4().hex[:10]}"

    # Start the Celery task, passing all necessary payload data
    task = run_full_attack_family.delay(
        run_id=run_id,
        model_id=payload.model_id,
        usecase_id=payload.usecase_id,
        attack_family=payload.attack_family,
        attack_id=payload.attack_id,
        session_id=payload.session_id,
        # Extract the 'tab' context from metadata
        tab=payload.metadata.get("tab", "main") 
    )

    # Return the requested 202 response format
    return AttackRunResponse(
        run_id=run_id,
        status="queued",
        task_url=f"/api/v1/attacks/status/{task.id}"
    )

@router.get("/status/{task_id}", response_model=AttackStatusResponse)
def get_attack_status(task_id: str):
    """
    Polls the Celery task broker (Redis) for the current status and progress 
    of an attack run.
    """
    # Get the Celery result object based on the task_id
    task = AsyncResult(task_id, app=run_full_attack_family.app)
    
    # Retrieve the state/progress dictionary from the task object
    if task.state == 'PENDING':
        # Task is waiting to be executed
        progress = {'message': 'Task waiting to be processed.'}
    elif task.state in ['SUCCESS', 'FAILURE']:
        # Task is done (or failed); result holds the final data
        progress = task.result if isinstance(task.result, dict) else {'message': str(task.result)}
    else: # STARTED, PROGRESS, RETRY, etc.
        # Task is currently running; info holds the progress updates
        progress = task.info if isinstance(task.info, dict) else {'message': str(task.info)}
    
    return AttackStatusResponse(
        task_id=task_id,
        status=task.state,
        progress=progress
    )
