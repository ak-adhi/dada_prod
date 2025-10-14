from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Import all required routers (ensure these files are created in api/routers/v1/)
from api.routers.v1 import attack_routes, defence_routes, data_routes, llm_routes, eval_routes, history_routes
from api.dependencies import metrics_middleware, get_prometheus_metrics

# Create the main FastAPI application instance
app = FastAPI(
    title="DADA Framework API",
    description="API Gateway for LLM Attack/Defense Framework",
    version="1.0.0"
)

# --- CORS Middleware (Allows frontend to talk to backend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Prometheus Metrics Middleware ---
# Applies metric tracking to all incoming HTTP requests
app.middleware("http")(metrics_middleware(app))


# --- API Versioning and Routing ---
# Group all endpoints under the /api/v1 prefix
app.include_router(attack_routes.router, prefix="/api/v1/attacks", tags=["Attacks"])
app.include_router(defence_routes.router, prefix="/api/v1/defence", tags=["Defense"])
app.include_router(data_routes.router, prefix="/api/v1/list", tags=["List Data"])
app.include_router(llm_routes.router, prefix="/api/v1/llm", tags=["LLM Proxy"])
app.include_router(eval_routes.router, prefix="/api/v1/evaluate", tags=["Evaluation"])
app.include_router(history_routes.router, prefix="/api/v1", tags=["History"]) # New Router added


# --- Health Check Endpoint ---
@app.get("/health", include_in_schema=False)
async def health_check():
    """Basic health check."""
    return {"status": "ok", "app": "dada-api"}

# --- Prometheus Metrics Endpoint (scraped by Prometheus service) ---
@app.get("/metrics", include_in_schema=False)
async def get_metrics():
    """Serves Prometheus metrics."""
    return get_prometheus_metrics()