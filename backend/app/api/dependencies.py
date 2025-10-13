import redis
import os
import time
from prometheus_client import Counter, Gauge, Summary, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response, HTTPException
from typing import Callable, Awaitable

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

# --- Prometheus Metrics Setup ---
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

# 2. Gauge for Attack Progress (Updated by Celery Worker, Scraped via API)
ATTACK_PROGRESS_GAUGE = Gauge(
    'dada_attack_progress_percent',
    'Percentage progress of a running attack task (0-100)',
    ['session_id', 'task_id']
)

def metrics_middleware(app: Callable[[Request, Callable[[Request], Awaitable[Response]]], Awaitable[Response]]):
    """FastAPI middleware to track request count and latency for Prometheus."""
    async def middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]):
        start_time = time.time()
        endpoint = request.url.path 
        method = request.method
        status_code = 500 # Default status code for errors
        
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