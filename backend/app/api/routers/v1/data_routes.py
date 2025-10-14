from fastapi import APIRouter
from typing import List, Dict, Any
from api.core_modules import db_manager

router = APIRouter()

@router.get("/llms", response_model=List[Dict[str, Any]])
def list_llms():
    """Lists all available LLM models from the database."""
    print(db_manager.get_llms())
    return db_manager.get_llms()

@router.get("/usecases", response_model=List[Dict[str, Any]])
def list_usecases():
    """Lists all defined usecases from the database."""
    return db_manager.get_usecases()

@router.get("/attack_families", response_model=List[Dict[str, Any]])
def list_attackfamilies():
    """Lists all defined usecases from the database."""
    return db_manager.get_attack_families()

@router.get("/tax_tree", response_model=List[Dict[str, Any]])
def list_tax_tree():
    """Lists all defined usecases from the database."""
    return db_manager.get_tax_tree()