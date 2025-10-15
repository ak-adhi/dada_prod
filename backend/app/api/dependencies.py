import redis
import os
import time
from prometheus_client import Counter, Gauge, Summary, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response, HTTPException
from typing import Callable, Awaitable, Dict, Any

# --- Configuration ---
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# --- Redis Client Management ---
_redis_client = None

def get_redis_client() -> redis.Redis:
    """Returns a singleton Redis client instance, raising an error if connection fails."""
    global _redis_client
    if _redis_client is None:
        try:
            # decode_responses=True ensures we get Python strings instead of bytes
            _redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            _redis_client.ping()
        except Exception as e:
            print(f"FATAL: Could not connect to Redis at {REDIS_URL}. Error: {e}")
            # Raise HTTP 503 Service Unavailable error if Redis is down
            raise HTTPException(status_code=503, detail="Redis service unavailable.")
    return _redis_client

# --- State for Last Attack Run Result ---
# This dictionary simulates where the final metadata from a Celery SUCCESS state 
# would be stored. It is used to drive the final result metrics.
LAST_ATTACK_RESULT: Dict[str, Any] = {
    "model_id": "none",
    "usecase_id": "none",
    "successful_attacks_total": 0,
    "attacks_run_combinations": 0, 
    "attacks_in_combination_count": 0,
    "timestamp": 0.0
}


# --- Prometheus Metrics Setup ---
# All metrics are automatically collected by generate_latest()

# Common labels for attack run results
ATTACK_LABELS = ['model', 'usecase']

# 1. Metrics for API Requests (Scraped by Prometheus)
REQUEST_COUNT = Counter(
    'http_requests_total', 
    'Total HTTP Requests', 
    ['method', 'endpoint', 'status']
)
REQUEST_LATENCY = Summary(
    'http_request_duration_seconds', 
    'HTTP Request Latency in seconds', 
    ['method', 'endpoint']
)

# 2. Gauge for Attack Progress (Updated by Celery Worker)
ATTACK_PROGRESS_GAUGE = Gauge(
    'dada_attack_progress_percent',
    'Percentage progress of a running attack task (0-100)',
    ['session_id', 'task_id']
)

# 3. Metrics for Last Completed Attack Run (For Grafana Dashboards)
# Total successful attacks (Changed from Counter to Gauge to allow .set())
ATTACK_TOTAL_SUCCESSFUL_GAUGE = Gauge(
    'attack_run_total_successful',
    'Total number of attacks that were successful in the last run.',
    ATTACK_LABELS
)

# Total attacks executed (Changed from Counter to Gauge to allow .set())
ATTACK_TOTAL_EXECUTED_GAUGE = Gauge(
    'attack_run_total_executed',
    'Total number of attacks executed in the last run.',
    ATTACK_LABELS
)

# Success Rate (as a Gauge, since it's a current state derived from totals)
ATTACK_SUCCESS_RATE_GAUGE = Gauge(
    'attack_run_success_rate', 
    'The success rate of the last completed attack run (0.0 to 1.0).',
    ATTACK_LABELS
)

# Gauge for data freshness
TIME_SINCE_LAST_RUN_GAUGE = Gauge(
    'attack_run_time_since_last_completion', 
    'Seconds since the last attack run completed.',
    [] # No labels needed for this global time
)

def update_attack_run_metrics(result: Dict[str, Any]):
    """
    Updates the global LAST_ATTACK_RESULT and sets the Prometheus metrics 
    based on the final results of a completed attack run.
    This function should be called by the Celery task completion handler.
    
    Args:
        result: Dictionary containing final run data (e.g., model_id, usecase_id, successful_attacks_total, etc.)
    """
    
    # 1. Update the in-memory state
    result["timestamp"] = time.time()
    LAST_ATTACK_RESULT.update(result)
    
    # 2. Calculate derived metrics
    model_id = result.get("model_id", "unknown")
    usecase_id = result.get("usecase_id", "unknown")
    successful = result.get("successful_attacks_total", 0)
    
    total_executed = (result.get("attacks_in_combination_count", 0) * result.get("attacks_run_combinations", 0))
    
    success_rate = 0.0
    if total_executed > 0:
        success_rate = successful / total_executed
        
    # 3. Set Prometheus metric values
    # We use Gauges here because we are setting the *final* value 
    # for the run, representing the current state of the last completed result.
    ATTACK_TOTAL_SUCCESSFUL_GAUGE.labels(model=model_id, usecase=usecase_id).set(successful)
    ATTACK_TOTAL_EXECUTED_GAUGE.labels(model=model_id, usecase=usecase_id).set(total_executed)
    ATTACK_SUCCESS_RATE_GAUGE.labels(model=model_id, usecase=usecase_id).set(success_rate)
    
    # Reset and start tracking time since completion
    TIME_SINCE_LAST_RUN_GAUGE.set(0.0)
    

def metrics_middleware(app: Callable[[Request, Callable[[Request], Awaitable[Response]]], Awaitable[Response]]):
    """FastAPI middleware to track request count and latency for Prometheus."""
    async def middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]):
        start_time = time.time()
        endpoint = request.url.path 
        method = request.method
        status_code = 500 # Default status code for errors
        
        # In a real app, you would have a separate thread/task periodically 
        # updating TIME_SINCE_LAST_RUN_GAUGE. For simplicity, we skip that step here.
        
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            # Record 500 status on exception
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status_code).inc()
            raise e
        
        process_time = time.time() - start_time
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status_code).inc()
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(process_time)
        return response
    return middleware

def get_prometheus_metrics():
    """Generates Prometheus metrics for the /metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

# --- Initial dummy update for immediate testing ---
# This simulates the first attack run finishing when the service starts
update_attack_run_metrics({
    "model_id": "gemini",
    "usecase_id": "data_leak",
    "successful_attacks_total": 85,
    "attacks_in_combination_count": 10, 
    "attacks_run_combinations": 10,
})

# Note on TIME_SINCE_LAST_RUN_GAUGE:
# For this metric to be accurate, you would need a background loop in your FastAPI 
# application that periodically calculates `time.time() - LAST_ATTACK_RESULT["timestamp"]` 
# and sets the gauge value. We omit that loop for simplicity in this file.
