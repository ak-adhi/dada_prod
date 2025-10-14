import { useEffect, useState, useCallback } from 'react';
import { Loader2, Zap, Monitor, CheckCircle, XCircle } from 'lucide-react'; // Added icons for visual feedback

export default function MainTab() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [usecases, setUsecases] = useState([]);
  const [selectedUsecase, setSelectedUsecase] = useState('');
  const [attackFamilies, setAttackFamilies] = useState([]);
  const [selectedAttackFamily, setSelectedAttackFamily] = useState('all');
  const [isDefenseEnabled, setIsDefenseEnabled] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [sessionId, setSessionId] = useState('');
  
  // --- New State for Monitoring ---
  const [isRunningAttack, setIsRunningAttack] = useState(false); 
  const [runId, setRunId] = useState(null); // Custom Business ID (for display)
  const [taskUuid, setTaskUuid] = useState(null); // <-- NEW: Celery Task UUID (for polling)
  const [attackProgress, setAttackProgress] = useState(null); 
  const [finalResult, setFinalResult] = useState(null); 
  const [taskStatus, setTaskStatus] = useState(null); // NEW: To track raw Celery status (PENDING, STARTED, PROGRESS, SUCCESS, FAILURE)
  
  const [systemMessage, setSystemMessage] = useState({ text: 'Ready to run a new attack.', type: 'info' });

  // --- 1. Session ID and Initial Data Fetch (unchanged) ---
  useEffect(() => {
    // Generate or retrieve persistent session ID using localStorage
    const storedId = localStorage.getItem('dada_session_id');
    const newId = storedId || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'temp-id-' + Date.now());
    
    if (!storedId) {
      localStorage.setItem('dada_session_id', newId);
    }
    setSessionId(newId);

    // Function to fetch all required dropdown data
    const fetchInitialData = async () => {
      setLoadingData(true);
      try {
        // 1. Fetch Models (Hardcoded for demo as requested, only showing 'mistral')
        setModels([{ llm_name: 'mistral' }]);

        // 2. Fetch Usecases
        const usecasesResponse = await fetch('/api/v1/list/usecases');
        const usecasesData = await usecasesResponse.json();
        if (Array.isArray(usecasesData)) {
          setUsecases(usecasesData);
        }
        // 3. Attack Families
        const familiesResponse = await fetch('/api/v1/list/attack_families');
        const familiesData = await familiesResponse.json();
        if (Array.isArray(familiesData)) {
            const familyNames = familiesData.map(item => item.attack_family).filter(name => name);
            setAttackFamilies(familyNames);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setSystemMessage({ text: 'Error connecting to API. Check backend services.', type: 'error' });
      } finally {
        setLoadingData(false);
      }
    };

    fetchInitialData();
  }, []);

  // --- 2. Defense Toggle Handler (unchanged) ---
  const handleDefenseToggle = async () => {
    const newState = !isDefenseEnabled;
    
    if (!sessionId) {
      setSystemMessage({ text: 'System error: Session ID not available.', type: 'error' });
      return; 
    }

    setIsDefenseEnabled(newState);
    
    const tabName = "main";
    setSystemMessage({ text: `Attempting to ${newState ? 'enable' : 'disable'} defense for session...`, type: 'info' });

    try {
        const response = await fetch('/api/v1/defence/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                session_id: sessionId, 
                tab: tabName, 
                enable: newState
            }),
        });

        if (!response.ok) {
            let errorDetails = `Status: ${response.status}.`;
            
            if (response.status === 422) {
                try {
                    const errorData = await response.json();
                    if (errorData.detail && Array.isArray(errorData.detail)) {
                        const validationErrors = errorData.detail.map(d => 
                            `${d.loc.slice(1).join('.')} -> ${d.msg}`
                        ).join('; ');
                        errorDetails = `Validation failed: ${validationErrors}`;
                    }
                } catch (e) {
                    // Response body was not readable JSON
                }
            }
            
            setSystemMessage({ 
                text: `Failed to toggle defense. ${errorDetails}`, 
                type: 'error' 
            });
            setIsDefenseEnabled(!newState);
        } else {
            setSystemMessage({ text: `Defense successfully ${newState ? 'ENABLED' : 'DISABLED'} for tab 'main'.`, type: 'success' });
        }
    } catch (error) {
        console.error('Network error while toggling defense:', error);
        setSystemMessage({ text: 'Network error during defense toggle.', type: 'error' });
        setIsDefenseEnabled(!newState);
    }
  };
  
  // --- 3. Run Attack Handler (Updated to capture redis_key_uuid) ---
  const handleRunAttack = async () => {
      if (!selectedModel || selectedUsecase === '' || isRunningAttack) {
          setSystemMessage({ text: 'Mandatory: Please select both a Model and a Usecase to proceed.', type: 'warning' });
          return;
      }
      
      setFinalResult(null); // Clear previous results
      setAttackProgress(null); // Clear previous progress
      setTaskStatus(null); // Clear previous status
      setTaskUuid(null); // <-- Clear previous Celery UUID
      setIsRunningAttack(true); // Start running/polling state

      const modelId = selectedModel;
      const usecaseId = selectedUsecase === 'all' ? null : selectedUsecase;
      const attackFamily = selectedAttackFamily === 'all' ? null : selectedAttackFamily;

      setSystemMessage({ 
          text: `Launching attack run...`, 
          type: 'info' 
      });

      try {
        const payload = {
            session_id: sessionId,
            model_id: modelId,
            usecase_id: usecaseId,   
            attack_family: attackFamily, 
            metadata: { tab: 'main' }
        };
        
        console.log('DEBUG: Launching attack with payload:', payload); 

        const response = await fetch('/api/v1/attacks/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            let errorMsg = data.detail || `Attack launch failed with status ${response.status}.`;
            if (response.status === 422 && Array.isArray(data.detail)) {
                errorMsg = data.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(' | ');
            }
            console.error('DEBUG: Launch failed response:', data); 
            setSystemMessage({ 
                text: `Attack launch failed: ${errorMsg}`, 
                type: 'error' 
            });
            setIsRunningAttack(false); // Stop running state if launch fails
        } else {
            const newRunId = data.run_id; // Custom Business ID
            const newTaskUuid = data.redis_key_uuid; // <-- Capture the Celery UUID for polling
            
            if (newRunId && newTaskUuid) {
                setRunId(newRunId);
                setTaskUuid(newTaskUuid); // <-- Set the Celery UUID
                
                console.log('DEBUG: Attack launch successful. Run ID:', newRunId, ' | Task UUID:', newTaskUuid); 
                setSystemMessage({ 
                    text: `Attack launched! Run ID: ${newRunId}. Starting live monitor...`, 
                    type: 'success' 
                });
                // Polling starts via useEffect once taskUuid is set
            } else {
                 setSystemMessage({ 
                    text: 'Attack launched, but missing required IDs. Monitoring failed.', 
                    type: 'error' 
                });
                setIsRunningAttack(false);
            }
        }

      } catch (error) {
          console.error('Network error while running attack:', error);
          setSystemMessage({ 
              text: 'Network error occurred while attempting to launch the attack.', 
              type: 'error' 
          });
          setIsRunningAttack(false);
      }
  }

  // --- 4. Polling Logic (`useEffect` and `fetchStatus`) (Updated to use taskUuid) ---
  const fetchStatus = useCallback(async (currentTaskUuid) => { // <-- Function now accepts the UUID
    if (!currentTaskUuid) return;

    try {
        console.log(`DEBUG: Polling status for Celery UUID: ${currentTaskUuid}.`); 

        // Use the Celery UUID in the status endpoint call
        const response = await fetch(`/api/v1/tasks/${currentTaskUuid}/status`);
        const statusData = await response.json(); 
        
        console.log('DEBUG: Received statusData (state/meta):', statusData); 

        // The generic endpoint returns state (status) and meta (progress/data)
        const status = statusData.state;
        const metadata = statusData.meta;

        setTaskStatus(status); // Update the raw status state

        if (status === 'PROGRESS') {
            console.log('DEBUG: Status is PROGRESS. Updating progress.'); 
            setAttackProgress(metadata);
        } else if (status === 'SUCCESS' || status === 'FAILURE') {
            console.log(`DEBUG: Status is ${status}. Attempting to STOP polling and set final result.`); 
            
            // Backend puts final result data into the 'meta' field.
            setAttackProgress(metadata); // Set one last update (100% data)
            setFinalResult(metadata);     // Set the final result object
            
            // Task completed, stop polling
            setIsRunningAttack(false); 
            setRunId(null);
            setTaskUuid(null); // <-- Clear UUID to stop useEffect
            
            console.log('DEBUG: FINAL RESULT METADATA:', metadata); 
            
            if (status === 'SUCCESS') {
                setSystemMessage({ 
                    text: `Attack Run ${runId || 'N/A'} completed successfully!`, 
                    type: 'success' 
                });
            } else {
                 // Use a more robust error message fallback
                 setSystemMessage({ 
                    text: `Attack Run ${runId || 'N/A'} failed! Error: ${metadata?.message || metadata?.status_message || 'Unknown Error'}`, 
                    type: 'error' 
                });
            }
        } else {
             // PENDING, STARTED, or other non-terminal state
             // Use the status_message from meta if available for a friendlier update
             const statusMessage = metadata?.status_message || `${status}...`;
             console.log(`DEBUG: Status is non-terminal: ${status}. Message: ${statusMessage}`); 
             setSystemMessage({ 
                text: `Attack Run ${runId || 'N/A'} is ${statusMessage}`, 
                type: 'info' 
            });
        }

    } catch (error) {
        console.error("Error fetching attack status:", error);
        setSystemMessage({ 
            text: 'Monitoring lost connection to API. Stopping task monitor.', 
            type: 'error' 
        });
        setIsRunningAttack(false);
        setTaskUuid(null); // Stop polling
    }
  }, [runId]); // Added runId dependency for system message reporting

  useEffect(() => {
    let intervalId;

    if (isRunningAttack && taskUuid) { // <-- Now depends on taskUuid
        console.log(`DEBUG: Starting polling interval for Celery UUID: ${taskUuid}`); 
        // Start polling every 1000ms (1 second)
        intervalId = setInterval(() => {
            fetchStatus(taskUuid); // <-- Pass the taskUuid
        }, 1000); 
    }

    // Cleanup: Clear the interval when the component unmounts or polling stops
    return () => {
        if (intervalId) {
            clearInterval(intervalId);
            console.log(`DEBUG: Polling interval CLEARED.`); 
        }
    };
  }, [isRunningAttack, taskUuid, fetchStatus]); // <-- taskUuid is now the polling key


  // --- 5. Reset Session Handler (updated) ---
  const handleResetSession = () => {
    localStorage.removeItem('dada_session_id');
    
    // Clear all local state
    setSessionId('');
    setSelectedModel('');
    setSelectedUsecase('');
    setSelectedAttackFamily('all'); 
    setIsDefenseEnabled(false);
    setRunId(null);
    setTaskUuid(null); // <-- Clear new state
    setAttackProgress(null);
    setFinalResult(null);
    setIsRunningAttack(false);
    setTaskStatus(null);
    
    setSystemMessage({ 
        text: 'Session reset requested. Refreshing page to generate a new Session ID...', 
        type: 'warning' 
    });
    
    setTimeout(() => {
        window.location.reload(); 
    }, 500);
  };
  
  // --- 6. New Rendering Components for Progress and Results ---

  const renderProgress = () => {
    // Show the progress bar section while a run is active (taskUuid is set) AND we haven't received the final result yet.
    if (!taskUuid || finalResult) return null;

    const isCompleted = taskStatus === 'SUCCESS' || taskStatus === 'FAILURE';
    
    // If we have progress data, use its percent. If not, default to 0. 
    // If completed, force to 100% just before the bar disappears.
    const percent = attackProgress && attackProgress.percent !== undefined 
        ? (isCompleted ? 100 : attackProgress.percent) 
        : 0;
    
    // Default values for display before PROGRESS starts
    const currentAttack = attackProgress?.last_attack || 'Waiting for Celery worker...';
    const model = attackProgress?.current_model || 'N/A';
    const defenceStatus = attackProgress?.defence_status ? 'ON' : (isDefenseEnabled ? 'ON (Expected)' : 'OFF');


    return (
        <div className="mt-6 p-4 rounded-xl shadow-inner border border-gray-300 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Monitor className="w-5 h-5 mr-2 text-indigo-600 animate-pulse" />
                Live Run Monitor: <span className="text-red-700 ml-2">{taskStatus || 'UNKNOWN'}</span> 
            </h3>
            <div className="w-full bg-gray-300 rounded-full h-2.5 mt-2">
                <div 
                    className="bg-red-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
            <div className="mt-3 text-sm space-y-1 p-2 border-l-4 border-indigo-500 bg-white shadow-sm rounded-r-md">
                <p className="text-gray-700">
                    <span className="font-semibold">Model:</span> {model} | <span className="font-semibold">Defense:</span> 
                    <span className={`font-bold ml-1 ${defenceStatus === 'ON' ? 'text-green-600' : 'text-red-600'}`}>
                        {defenceStatus}
                    </span>
                </p>
                {/* Only show attack details if we have PROGRESS data */}
                {taskStatus === 'PROGRESS' && (
                    <p className="text-gray-700">
                        <span className="font-semibold">Running:</span> {currentAttack} 
                        ({attackProgress.current_attack}/{attackProgress.attacks_in_combination} in combination {attackProgress.current_combination}/{attackProgress.total_combinations})
                    </p>
                )}
                 {taskStatus === 'PENDING' && (
                    <p className="text-gray-500 italic">
                        Task waiting in queue for a worker to start processing...
                    </p>
                )}
            </div>
        </div>
    );
  };

  const renderResults = () => {
    if (!finalResult) return null;

    // These keys are expected to be present in the final dictionary returned by the Celery task (now in finalResult)
    const totalAttacks = finalResult.attacks_run_combinations * (finalResult.attacks_in_combination_count || 1); // Added fallback to prevent NaN if count is missing
    const successful = finalResult.successful_attacks_total || 0;
    const failed = totalAttacks - successful;
    const successRate = totalAttacks > 0 ? (successful / totalAttacks * 100).toFixed(1) : 0;
    
    let badgeColor = 'bg-green-600'; // Default to green (low success rate means good defense)
    if (successRate > 60) badgeColor = 'bg-red-600'; 
    else if (successRate >= 30) badgeColor = 'bg-yellow-600';
    
    return (
        <div className="mt-6 p-5 bg-white rounded-xl shadow-lg border border-2 border-green-500">
            <h3 className="text-xl font-bold text-green-600 flex items-center mb-4">
                <CheckCircle className="w-6 h-6 mr-2" />
                Attack Run Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 border-b-2 border-red-500">
                    <p className="text-xs font-medium text-gray-500">Successful Attacks</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">{successful}</p>
                </div>
                <div className="p-3 border-b-2 border-gray-500">
                    <p className="text-xs font-medium text-gray-500">Total Executed</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{totalAttacks}</p>
                </div>
                 <div className="p-3 border-b-2 border-green-500">
                    <p className="text-xs font-medium text-gray-500">Attack Success Rate</p>
                    <span className={`px-3 py-1 text-sm font-bold text-white rounded-full ${badgeColor} shadow-md`}>
                        {successRate}%
                    </span>
                </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
                Run ID: <code className="font-mono text-xs">{finalResult.run_id}</code> | Task UUID: <code className="font-mono text-xs">{finalResult.task_id}</code>
            </p>
        </div>
    );
  };


  // Define dynamic color for the system message box
  const getSystemMessageColor = (type) => {
    switch (type) {
      case 'error': return 'border-red-500 bg-red-100 text-red-800';
      case 'warning': return 'border-yellow-500 bg-yellow-100 text-yellow-800';
      case 'success': return 'border-green-500 bg-green-100 text-green-800';
      case 'info':
      default: return 'border-blue-500 bg-blue-100 text-blue-800';
    }
  };

  if (loadingData) {
    return <div className="p-8 text-center text-lg text-gray-500">Loading control panel data...</div>;
  }

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-800">Control Panel</h2>
      <p className="mt-2 text-sm text-gray-600">
        Configure the target model, domain, and defense status before launching an attack run.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Attack families */}
        <div className="p-4 rounded-lg bg-white shadow border border-gray-200">
          <h3 className="font-medium text-gray-700">Attack families</h3>
          <select
            value={selectedAttackFamily}
            onChange={(e) => setSelectedAttackFamily(e.target.value)}
            className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
            disabled={isRunningAttack}
          >
            <option value="all">ALL (Run all families)</option>
            {attackFamilies.map((family) => (
                <option key={family} value={family}>
                    {family}
                </option>
            ))}
          </select>
        </div>

        {/* Models (Only 'mistral' available, 'ALL' option removed) */}
         <div className="p-4 rounded-lg bg-white shadow border border-gray-200">
            <h3 className="font-medium text-gray-700">Models</h3>
            <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                disabled={isRunningAttack}
            >
                <option value="">Select model</option>
                {models.map((model) => (
                    <option key={model.llm_name} value={model.llm_name}>
                        {model.llm_name}
                    </option>
                ))}
            </select>
        </div>

        {/* Usecases */}
        <div className="p-4 rounded-lg bg-white shadow border border-gray-200">
          <h3 className="font-medium text-gray-700">Usecases</h3>
          <select
                value={selectedUsecase}
                onChange={(e) => setSelectedUsecase(e.target.value)}
                className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                disabled={isRunningAttack}
            >
                <option value="">Select usecase</option>
                <option value="all">ALL</option>
                {usecases.map((usecase) => (
                    <option key={usecase.usecase_name} value={usecase.usecase_name}>
                        {usecase.usecase_name}
                    </option>
                ))}
            </select>
        </div>
      </div>

      <div className="mt-6 flex gap-3 items-center">
        {/* Run Attack Button */}
        <button
          onClick={handleRunAttack}
          disabled={isRunningAttack || !selectedModel || selectedUsecase === ''}
          className={`
            px-6 py-2 rounded-lg text-white font-semibold transition-all duration-300 shadow-md 
            ${isRunningAttack || !selectedModel || selectedUsecase === ''
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            }
          `}
          onMouseEnter={(e) => !isRunningAttack && (e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 0, 0, 0.7)')}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
        >
          {isRunningAttack ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Running ({taskStatus || 'Pending'} {attackProgress?.percent !== undefined ? attackProgress.percent.toFixed(0) : 0}%)
            </span>
          ) : (
            'Run Attack'
          )}
        </button>

        {/* Defense Toggle Implementation */}
        <div className="flex items-center space-x-3 ml-4 p-2 rounded-lg bg-white shadow border border-1 border-brand-blue">
          <span className="text-sm font-medium text-gray-700">Defence Status:</span>
          
          <button
            onClick={handleDefenseToggle}
            className={`
              relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
              ${isDefenseEnabled ? 'bg-green-600 focus:ring-green-500' : 'bg-gray-400 focus:ring-gray-500'}
            `}
            role="switch"
            aria-checked={isDefenseEnabled}
          >
            <span
              aria-hidden="true"
              className={`
                pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
                ${isDefenseEnabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            ></span>
          </button>
          
          <span className={`text-sm font-semibold ${isDefenseEnabled ? 'text-green-600' : 'text-gray-500'}`}>
            {isDefenseEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        {/* Reset Session Button (NEW) */}
        <button
          onClick={handleResetSession}
          className="ml-4 px-4 py-2 rounded-lg bg-yellow-500 text-white font-medium shadow transition-all duration-200 hover:bg-yellow-600"
        >
          Reset Session
        </button>

      </div>
      
      {/* System Message Box */}
      <div className={`mt-6 p-4 rounded-lg border-l-4 ${getSystemMessageColor(systemMessage.type)}`}>
        <p className="text-sm font-medium">{systemMessage.text}</p>
        <code className="text-xs font-mono opacity-80 mt-1 block">Session ID: {sessionId}</code>
      </div>

      {/* Live Monitoring Section - Show while running or just after completion */}
      {taskUuid && !finalResult && renderProgress()}
      
      {/* Final Results Section - Show only after finalResult is set */}
      {finalResult && renderResults()}

    </section>
  );
}
