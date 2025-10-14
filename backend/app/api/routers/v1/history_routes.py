import logging
from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Dict, Any
from api.core_modules import db_manager


router = APIRouter()

# Dependency function to ensure we use the globally defined DB manager
def get_db_manager():
    return db_manager

@router.get("/history", response_model=Dict[str, Any])
async def get_history(
    model: str = Query('All', description="Filter by LLM Model"),
    usecase: str = Query('All', description="Filter by Usecase"),
    family: str = Query('All', description="Filter by Attack Family"),
    success: str = Query('All', description="Filter by Success Status ('All', 'True', 'False')"),
    defence: str = Query('False', description="Filter by Defence Status ('True', 'False')"),
    db_manager: Any = Depends(get_db_manager)
):
    """
    Fetches historical evaluation results, filtered by query parameters,
    and returns summary statistics and detailed row data from dada.eval_results.
    """
    try:
        # Call the core function to fetch data
        result = db_manager.get_eval_history(
            model=model, 
            usecase=usecase, 
            family=family, 
            success=success, 
            defence=defence
        )
        # print(result["summary"])
        # print(result["data"])
        # The core function returns {"summary": ..., "data": ...}
        return {
            "success": True,
            "summary": result["summary"],
            "data": result["data"]
        }

    except Exception as e:
        logging.error(f"API route /history failed: {e}")
        # Return success: false and empty data structure to prevent frontend crash
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "Failed to fetch history due to a server error.",
                "summary": {"total": 0, "success_count": 0, "failure_count": 0, "success_rate": 0.0, "avg_latency": 0.0},
                "data": []
            }
        )
