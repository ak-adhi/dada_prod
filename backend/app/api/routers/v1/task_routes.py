from fastapi import APIRouter, HTTPException
from api.celery_app import celery_app
from typing import Dict, Any

# Define a router specifically for handling task status checks
router = APIRouter()

@router.get("/{task_id}/status", response_model=Dict[str, Any])
async def get_task_status(task_id: str):
    """
    Retrieves the current status and progress metadata for any Celery task.
    
    This function prioritizes checking for a completed task using task.ready() 
    to prevent getting stuck in the PENDING state when the result is available.
    """
    # 1. Get the task result object
    task = celery_app.AsyncResult(task_id)
    
    # 2. Check for completed tasks first (SUCCESS, FAILURE, REVOKED, etc.)
    # task.ready() will be True as soon as the result is written to Redis.
    if task.ready():
        state = task.state
        final_meta = task.result # task.result holds the final return value (the payload dict)
        
        # Ensure that if the task is ready, we return the final SUCCESS state
        if state == 'SUCCESS':
            # This is the expected final state we want the frontend to see.
            print(f"DEBUG: Task {task_id} is READY and SUCCESSFUL. Returning final result.")
            return {
                "task_id": task_id,
                "state": state,
                # This ensures the final payload (with 100% and summary) is returned
                "meta": final_meta if isinstance(final_meta, dict) else {"percent": 100, "status_message": "Completed.", "result": final_meta}
            }
        
        elif state == 'FAILURE':
            # For failure, ensure task.result (the exception object) is converted to a string message
            error_message = str(final_meta) if final_meta else "Task failed with unknown error."
            print(f"DEBUG: Task {task_id} is READY and FAILED.")
            return {
                "task_id": task_id, 
                "state": state,
                "meta": {"percent": 100, "status_message": f"Task failed: {error_message}", "error": error_message}
            }

        # Handle other terminal states (e.g., REVOKED)
        print(f"DEBUG: Task {task_id} is READY with terminal state: {state}")
        return {
            "task_id": task_id,
            "state": state,
            "meta": {"percent": 100, "status_message": f"Task finished with state: {state}"}
        }

    # 3. Handle non-terminal states (PENDING, STARTED, PROGRESS)
    current_state = task.state
    meta_info = task.info if task.info else {}

    # Provide a friendly fallback for PENDING/STARTED when no meta is available
    if current_state == 'PENDING' or current_state == 'STARTED':
        if not meta_info:
            status_message = "Task received and waiting to start." if current_state == 'PENDING' else "Task started by worker."
            meta_info = {"percent": 0, "status_message": status_message}
    
    print(f"DEBUG: Task {task_id} is NOT READY. State: {current_state}, Meta: {meta_info.get('percent', 'N/A')}%")
    return {
        "task_id": task_id,
        "state": current_state,
        "meta": meta_info 
    }
