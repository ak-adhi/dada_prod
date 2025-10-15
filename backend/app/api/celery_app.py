import os
from celery import Celery

# Configuration: Use environment variables set in docker-compose
# Uses the internal Docker URL: redis://redis:6379/0 (as configured in the corrected .env)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize Celery app
celery_app = Celery(
    "dada_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    # Include the tasks module so Celery knows where to find the 'run_full_attack_family' function
    include=['api.tasks'] 
)

# Standard Celery configuration
celery_app.conf.update(
    enable_utc=True,
    timezone='UTC',
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
)

# --- START DIAGNOSTIC PRINT ---
print(f"\n--- CELERY APP INITIALIZATION DEBUG ---")
print(f"FastAPI Client Backend URL: {celery_app.conf.result_backend}")
print(f"FastAPI Client Broker URL: {celery_app.conf.broker_url}")
print(f"-----------------------------------------\n")
# --- END DIAGNOSTIC PRINT ---
