import time
from typing import Optional, List, Dict, Any

# Celery application instance and dependencies
from api.celery_app import celery_app
from api.dependencies import get_redis_client, ATTACK_PROGRESS_GAUGE
# Core modules containing mock logic for DB, LLM, Defense, and Evaluation
from api.core_modules import db_manager, LLMClient, apply_defense, evaluate_response

# Ensure Redis client is available to the worker process
try:
    REDIS_CLIENT = get_redis_client()
except Exception as e:
    # If the worker cannot connect to Redis on startup, it will log a critical error and exit
    print(f"FATAL: Celery worker failed to initialize Redis client: {e}")
    # In a production setup, Celery usually handles reconnects, but we keep the try/except for clarity.

# --- Custom Task Class for Progress Reporting ---
class AttackTask(celery_app.Task):
    """Custom Task class for integrating with Prometheus and logging."""
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called if the task fails."""
        session_id = kwargs.get('session_id', 'unknown')
        print(f"Task failed: {task_id} (Session: {session_id}) - {exc}")
        # Clean up Prometheus gauge on failure by setting it to 0
        ATTACK_PROGRESS_GAUGE.labels(session_id=session_id, task_id=task_id).set(0)

# --- Main Attack Execution Task ---
@celery_app.task(bind=True, base=AttackTask)
def run_full_attack_family(
    self, 
    run_id: str,
    model_id: str, 
    usecase_id: str, 
    attack_family: Optional[str], 
    attack_id: Optional[int],
    session_id: str,
    tab: str,
) -> Dict[str, Any]:
    """
    Executes a sequence of attacks in the background, reading dynamic state 
    from Redis and reporting progress via Celery and Prometheus.
    """
    
    print(f"Starting Task {self.request.id} (Run ID: {run_id}). Session: {session_id}, Tab: {tab}")
    
    # 1. Fetch relevant attacks from the database manager
    attacks: List[Dict[str, Any]] = db_manager.get_attack_prompts(
        usecase=usecase_id,
        attack_family=attack_family,
        attack_id=attack_id
    )
    
    if not attacks:
        return {'result': 'No attacks found for the criteria.', 'attacks_run': 0, 'run_id': run_id}

    total_attacks = len(attacks)
    llm_client = LLMClient(model_id=model_id)
    
    successful_attacks = 0
    
    # 2. Loop through and execute each attack
    for i, attack in enumerate(attacks):
        current_attack_num = i + 1
        
        # --- DYNAMICALLY READ DEFENSE STATE FROM REDIS (Key based on session and tab) ---
        is_defence_enabled = False
        try:
            redis_key = f"dada:session:{session_id}:defence"
            # HGET reads the 'tab' field (e.g., 'main') from the hash map (redis_key)
            status_str = REDIS_CLIENT.hget(redis_key, tab)
            is_defence_enabled = (status_str == 'true')
        except Exception as e:
            # Log error but continue with default (disabled) defense
            print(f"Warning: Failed to read defense status from Redis: {e}")
            
        # --- CONSTRUCT AND APPLY DEFENSE ---
        initial_prompt = f"System: UseCase={usecase_id}. Instruction: {attack['attack_prompt']}"
        
        final_prompt = initial_prompt
        if is_defence_enabled:
            # Apply defense layer logic from core_modules
            final_prompt = apply_defense(initial_prompt)
        
        # --- QUERY LLM (Proxy call to the mistral_7b docker container) ---
        print(f"  [{current_attack_num}/{total_attacks}] Running {attack['attack_name']} (Defense: {'ON' if is_defence_enabled else 'OFF'})")
        llm_response_data = llm_client.query(final_prompt, stream=False)
        llm_response = llm_response_data.get("text", "Error: No response from LLM.")

        # --- EVALUATE RESPONSE ---
        # Evaluate if the LLM successfully performed the malicious instruction
        is_safe = evaluate_response(llm_response)
        if not is_safe:
            successful_attacks += 1
            
        # --- REPORT PROGRESS (Celery and Prometheus) ---
        current_percent = (current_attack_num / total_attacks) * 100
        
        # Update Celery state: Used by the GET /attacks/status endpoint
        self.update_state(
            state='PROGRESS',
            meta={
                'current': current_attack_num,
                'total': total_attacks,
                'percent': round(current_percent, 2),
                'last_attack': attack['attack_name'],
                'defence_status': is_defence_enabled,
                'last_safe': is_safe
            }
        )
        
        # Update Prometheus gauge: Used by Grafana dashboard
        ATTACK_PROGRESS_GAUGE.labels(session_id=session_id, task_id=self.request.id).set(current_percent)
        
        # A small sleep to simulate work and allow the UI to update
        time.sleep(0.5) 

    # --- 3. TASK COMPLETION ---
    # Set final progress to 100%
    ATTACK_PROGRESS_GAUGE.labels(session_id=session_id, task_id=self.request.id).set(100)
    
    return {
        'result': 'Attack family execution finished.',
        'attacks_run': total_attacks,
        'successful_attacks': successful_attacks,
        'success_rate': round((successful_attacks / total_attacks) * 100, 2),
        'run_id': run_id,
    }
