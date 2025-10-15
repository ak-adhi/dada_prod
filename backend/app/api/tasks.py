import time
from typing import Optional, List, Dict, Any, Tuple

# Celery application instance and dependencies
from api.celery_app import celery_app
from api.dependencies import get_redis_client, ATTACK_PROGRESS_GAUGE, update_attack_run_metrics
# Core modules containing logic for DB, LLM, Defense, Evaluation, and TEMPLATING
from api.core_modules import db_manager, LLMClient, apply_defense, evaluate_response, generate_templated_prompt

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


def _execute_single_run(
    self,
    attacks: List[Dict[str, Any]],
    llm_client: LLMClient,
    session_id: str,
    tab: str,
    run_id: str,
    total_run_combinations: int,
    current_combination_index: int,
) -> int:
    """
    Core function to run a single list of attacks against one LLM client.
    Updates the main Celery and Prometheus progress for the entire task.
    Returns the number of successful attacks in this sub-run.
    
    This function has been updated to incorporate RAG, system prompt retrieval, 
    and prompt templating for a more realistic attack execution flow.
    """
    total_attacks_in_run = len(attacks)
    successful_attacks = 0
    
    # Base progress percentage before this sub-run starts
    base_percent = (current_combination_index / total_run_combinations) * 100
    
    for i, attack in enumerate(attacks):
        current_attack_num = i + 1
        
        # --- DYNAMICALLY READ DEFENSE STATE FROM REDIS ---
        is_defence_enabled = False
        try:
            redis_key = f"dada:session:{session_id}:defence"
            status_str = REDIS_CLIENT.hget(redis_key, tab)
            is_defence_enabled = (status_str == b'true') # Redis returns bytes
        except Exception as e:
            print(f"Warning: Failed to read defense status from Redis: {e}")
            
        # --- 1. FETCH BASE PROMPT COMPONENTS ---
        # The usecase determines the system prompt and the RAG index
        usecase_id = attack['usecase']
        user_input = attack['attack_prompt']
        
        # Fetch the baseline system instruction for the usecase
        base_system_prompt = db_manager.get_usecase_system_prompt(usecase_id)
        
        # Retrieve the RAG context based on the usecase and attack input
        retrieved_context = db_manager.retrieve_rag_context(usecase_id, user_input)
        
        # --- 2. APPLY DEFENSE (CONDITIONAL) ---
        if is_defence_enabled:
            # The defense module modifies the system prompt to include safety instructions
            # (
            #     final_system_prompt, 
            #     final_context, 
            #     final_user_input
            # ) = apply_defense(base_system_prompt, retrieved_context, user_input, defense_type="PII_Filter")
            ################# Disabling defence for now
            final_system_prompt = base_system_prompt
            final_context = retrieved_context
            final_user_input = user_input
        else:
            final_system_prompt = base_system_prompt
            final_context = retrieved_context
            final_user_input = user_input
            
        # --- 3. GENERATE FINAL TEMPLATED PROMPT ---
        # Use the Mistral template for optimal performance on Mistral 7B
        final_prompt = generate_templated_prompt(
            final_system_prompt, 
            final_context, 
            final_user_input
        )
        
        # --- 4. QUERY LLM ---
        print(f"  [{current_combination_index+1}/{total_run_combinations}] Running Attack {current_attack_num}/{total_attacks_in_run}: {attack['attack_name']} on {llm_client.model_id} (Defence: {'ON' if is_defence_enabled else 'OFF'})")
        
        start_time = time.time()
        llm_response_data = llm_client.query(final_prompt, stream=False)
        # latency is still calculated even though it's not logged, as it might be useful later.
        latency = (time.time() - start_time) * 1000 # convert to milliseconds 
        # llm_response = llm_response_data.get("text", "Error: No response from LLM.")
        llm_response = llm_response_data
        print(llm_response)

        # --- EVALUATE RESPONSE ---
        is_safe = evaluate_response(
        llm_response,
        attack_prompt=user_input,
        system_prompt=base_system_prompt
        )
        if not is_safe:
            successful_attacks += 1
            
        # --- REPORT PROGRESS (Celery and Prometheus) ---
        # Calculate percentage for THIS sub-run
        sub_run_percent_completion = (current_attack_num / total_attacks_in_run)
        # Calculate overall percentage: Base + (Progress in this sub-run * weight of this sub-run)
        current_percent = base_percent + (sub_run_percent_completion * (100 / total_run_combinations))
        
        self.update_state(
            state='PROGRESS',
            meta={
                'current_combination': current_combination_index + 1,
                'total_combinations': total_run_combinations,
                'current_attack': current_attack_num,
                'attacks_in_combination': total_attacks_in_run,
                'percent': round(current_percent, 2),
                'last_attack': attack['attack_name'],
                'current_model': llm_client.model_id,
                'defence_status': is_defence_enabled,
            }
        )
        
        ATTACK_PROGRESS_GAUGE.labels(session_id=session_id, task_id=self.request.id).set(current_percent)
        
        # Small sleep to allow workers to report status
        time.sleep(0.05) 

    return successful_attacks


# --- Main Attack Orchestrator Task ---
@celery_app.task(bind=True, base=AttackTask)
def run_full_attack_family(
    self, 
    run_id: str,
    model_id: str, 
    usecase_id: str, 
    attack_family: str, 
    attack_id: Optional[int],
    session_id: str,
    tab: str,
) -> Dict[str, Any]:
    """
    Orchestrates the attack execution. Resolves 'all' selections into concrete lists 
    and iterates over all resulting model/usecase/family combinations.
    """
    
    print(f"Starting Orchestrator Task {self.request.id} (Run ID: {run_id}). Session: {session_id}")

    # 1. Resolve 'all' selections into concrete lists of IDs
    # These lists will contain concrete names (e.g., ['banking']) or ALL concrete names, but NEVER 'all'.
    llm_ids = [model_id] if model_id != 'all' else db_manager.get_all_llm_ids()
    usecase_ids = [usecase_id] if usecase_id != 'all' else db_manager.get_all_usecase_ids()
    family_ids = [attack_family] if attack_family != 'all' else db_manager.get_all_attack_families()

    # 2. Pre-fetch ALL attacks needed for filtering.
    # CRITICAL FIX: The literal string 'all' was causing a DB error.
    # We pass None to the DB manager's general fetch function (db_manager.get_attack_prompts)
    # to signal "select all" (i.e., omit the WHERE clause for usecase and family).
    
    # We will fetch a full superset of attacks for all usecases and families.
    all_attacks = db_manager.get_attack_prompts(
        usecase=None, 
        attack_family=None, 
        attack_id=attack_id # Specific attack ID if provided
    )

    if not all_attacks:
        return {'result': 'No attacks found in the database.', 'attacks_run': 0, 'run_id': run_id}

    # 3. Determine the total number of combination runs
    run_combinations = []
    # If a single attack ID is provided, filter the main lists to only include that attack's specific combination
    if attack_id:
        single_attack = next((a for a in all_attacks if a.get('attack_id') == attack_id), None)
        if single_attack:
            llm_ids = [model_id] # Already resolved above, but confirm
            usecase_ids = [single_attack['usecase']]
            family_ids = [single_attack['attack_family']]
            # Note: We continue to step 4, but the filtering in step 3 will now be highly specific.


    for m_id in llm_ids:
        for u_id in usecase_ids:
            for f_id in family_ids:
                
                # Filter the pre-fetched attacks list to match the current combination.
                # u_id and f_id are concrete names (e.g., 'banking', 'Jailbreak') from the resolved lists.
                filtered_attacks = [
                    a for a in all_attacks 
                    if a.get('usecase') == u_id and a.get('attack_family') == f_id and 
                       (attack_id is None or a.get('attack_id') == attack_id)
                ]
                
                if filtered_attacks:
                    run_combinations.append({
                        'model_id': m_id, 
                        'usecase_id': u_id, 
                        'attack_family': f_id,
                        'attacks': filtered_attacks
                    })
    
    total_run_combinations = len(run_combinations)
    total_successful_attacks = 0

    if total_run_combinations == 0:
         return {'result': 'No valid combinations found after filtering attacks.', 'attacks_run': 0, 'run_id': run_id}

    print(f"Orchestrator found {total_run_combinations} execution groups.")
    
    # 4. Iterate through all combinations and execute
    for i, combination in enumerate(run_combinations):
        
        print(f"--- Combination {i+1}/{total_run_combinations}: Model={combination['model_id']}, Usecase={combination['usecase_id']}, Family={combination['attack_family']} ({len(combination['attacks'])} attacks) ---")

        llm_client = LLMClient(model_id=combination['model_id'])
        
        successful_attacks = _execute_single_run(
            self,
            attacks=combination['attacks'],
            llm_client=llm_client,
            session_id=session_id,
            tab=tab,
            run_id=run_id,
            total_run_combinations=total_run_combinations,
            current_combination_index=i
        )
        total_successful_attacks += successful_attacks

    # 5. TASK COMPLETION
    # Set final progress to 100%
    ATTACK_PROGRESS_GAUGE.labels(session_id=session_id, task_id=self.request.id).set(100)
    
    # Define the final payload that will be returned and used for the final SUCCESS state
    final_result_payload = {
        'result': 'All attack executions finished.',
        'attacks_run_combinations': total_run_combinations,
        'successful_attacks_total': total_successful_attacks,
        'run_id': run_id,
        'percent': 100,
        'last_attack': 'COMPLETED',
        'current_model': model_id,
        'model_id': model_id, # Added for clarity in metric labeling
        'usecase_id': usecase_id, # Added for clarity in metric labeling
        'attacks_in_combination_count': len(run_combinations[0]['attacks']) if run_combinations else 0 # Assuming uniform size
    }

    # CRITICAL: Update the Prometheus metrics with the final results
    update_attack_run_metrics(final_result_payload)
    
    # CRITICAL FIX: Explicitly set SUCCESS state to ensure front-end polling loop terminates cleanly
    self.update_state(state='SUCCESS', meta=final_result_payload)
    
    return final_result_payload
