// import { useEffect, useState } from 'react';

// export default function MainTab() {
//   const [models, setModels] = useState([]);
//   const [selectedModel, setSelectedModel] = useState('');
//   const [usecases, setUsecases] = useState([]);
//   const [selectedUsecase, setSelectedUsecase] = useState('');
//   const [isDefenseEnabled, setIsDefenseEnabled] = useState(false);
//   const [loadingData, setLoadingData] = useState(true);
//   const [sessionId, setSessionId] = useState('');
//   const [isRunningAttack, setIsRunningAttack] = useState(false);
//   const [systemMessage, setSystemMessage] = useState({ text: 'Ready to run a new attack.', type: 'info' });

//   // --- 1. Session ID and Initial Data Fetch ---
//   useEffect(() => {
//     // Generate or retrieve persistent session ID using localStorage
//     const storedId = localStorage.getItem('dada_session_id');
//     const newId = storedId || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'temp-id-' + Date.now());
    
//     if (!storedId) {
//       localStorage.setItem('dada_session_id', newId);
//     }
//     setSessionId(newId);

//     // Function to fetch all required dropdown data
//     const fetchInitialData = async () => {
//       setLoadingData(true);
//       try {
//         // 1. Fetch Models
//         const modelsResponse = await fetch('/api/v1/list/llms');
//         const modelsData = await modelsResponse.json();
//         if (Array.isArray(modelsData)) {
//           setModels(modelsData);
//         }

//         // 2. Fetch Usecases
//         const usecasesResponse = await fetch('/api/v1/list/usecases');
//         const usecasesData = await usecasesResponse.json();
//         if (Array.isArray(usecasesData)) {
//           setUsecases(usecasesData);
//         }
//         // 3. Attack Families
//         const familiesResponse = await fetch('/api/v1/list/attack_families');
//         const familiesData = await familiesResponse.json();
//         if (Array.isArray(familiesData)) {
//             // Assuming data is [{ attack_family: 'Jailbreak' }, ...]
//             const familyNames = familiesData.map(item => item.attack_family).filter(name => name);
//             setAttackFamilies(familyNames);
//         }
//       } catch (error) {
//         console.error('Error fetching initial data:', error);
//         setSystemMessage({ text: 'Error connecting to API. Check backend services.', type: 'error' });
//       } finally {
//         setLoadingData(false);
//       }
//     };

//     fetchInitialData();
//   }, []);

//   // --- 2. Defense Toggle Handler ---
//   const handleDefenseToggle = async () => {
//     const newState = !isDefenseEnabled;
    
//     if (!sessionId) {
//       setSystemMessage({ text: 'System error: Session ID not available.', type: 'error' });
//       return; 
//     }

//     setIsDefenseEnabled(newState);
    
//     const tabName = "main";
//     setSystemMessage({ text: `Attempting to ${newState ? 'enable' : 'disable'} defense for session...`, type: 'info' });

//     try {
//         const response = await fetch('/api/v1/defence/toggle', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ 
//                 session_id: sessionId, 
//                 tab: tabName, 
//                 enable: newState
//             }),
//         });

//         if (!response.ok) {
//             let errorDetails = `Status: ${response.status}.`;
            
//             if (response.status === 422) {
//                 try {
//                     const errorData = await response.json();
//                     if (errorData.detail && Array.isArray(errorData.detail)) {
//                         const validationErrors = errorData.detail.map(d => 
//                             `${d.loc.slice(1).join('.')} -> ${d.msg}`
//                         ).join('; ');
//                         errorDetails = `Validation failed: ${validationErrors}`;
//                     }
//                 } catch (e) {
//                     // Response body was not readable JSON
//                 }
//             }
            
//             setSystemMessage({ 
//                 text: `Failed to toggle defense. ${errorDetails}`, 
//                 type: 'error' 
//             });
//             setIsDefenseEnabled(!newState);
//         } else {
//             setSystemMessage({ text: `Defense successfully ${newState ? 'ENABLED' : 'DISABLED'}.`, type: 'success' });
//         }
//     } catch (error) {
//         console.error('Network error while toggling defense:', error);
//         setSystemMessage({ text: 'Network error during defense toggle.', type: 'error' });
//         setIsDefenseEnabled(!newState);
//     }
//   };
  
//   // --- 3. Run Attack Handler (Implemented) ---
//   const handleRunAttack = async () => {
//       if (!selectedModel || !selectedUsecase) {
//           setSystemMessage({ text: 'Mandatory: Please select both a Model and a Usecase to proceed.', type: 'warning' });
//           return;
//       }
      
//       const selectedAttackFamily = 'all';

//       setIsRunningAttack(true); // Start loading state
//       setSystemMessage({ 
//           text: `Launching full attack run on Model: ${selectedModel} / Usecase: ${selectedUsecase}. Waiting for response...`, 
//           type: 'info' 
//       });

//       try {
//         const payload = {
//             session_id: sessionId,
//             model: selectedModel,
//             usecase: selectedUsecase,
//             attack_family: selectedAttackFamily,
//         };

//         const response = await fetch('/api/v1/attacks/run', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(payload),
//         });

//         const data = await response.json();

//         if (!response.ok) {
//             let errorMsg = data.detail || `Attack launch failed with status ${response.status}.`;
//             setSystemMessage({ 
//                 text: `Attack launch failed: ${errorMsg}`, 
//                 type: 'error' 
//             });
//         } else {
//             // Assuming successful response returns a task ID or similar success confirmation
//             const taskId = data.task_id || 'N/A';
//             setSystemMessage({ 
//                 text: `Attack successfully launched! Task ID: ${taskId}. Results will appear in the Attack Results tab.`, 
//                 type: 'success' 
//             });
//         }

//       } catch (error) {
//           console.error('Network error while running attack:', error);
//           setSystemMessage({ 
//               text: 'Network error occurred while attempting to launch the attack.', 
//               type: 'error' 
//           });
//       } finally {
//         setIsRunningAttack(false); // Stop loading state
//       }
//   }

//   // --- 4. Reset Session Handler (NEW) ---
//   const handleResetSession = () => {
//     // 1. Remove the stored ID from the browser's storage
//     localStorage.removeItem('dada_session_id');
    
//     // 2. Clear all local state
//     setSessionId('');
//     setSelectedModel('');
//     setSelectedUsecase('');
//     setIsDefenseEnabled(false);
    
//     // 3. Inform the user and force a full page reload to generate a new Session ID
//     setSystemMessage({ 
//         text: 'Session reset requested. Refreshing page to generate a new Session ID...', 
//         type: 'warning' 
//     });
    
//     // Use a slight delay to ensure message is seen before reload
//     setTimeout(() => {
//         window.location.reload(); 
//     }, 500);
//   };

//   // Define dynamic color for the system message box
//   const getSystemMessageColor = (type) => {
//     switch (type) {
//       case 'error': return 'border-red-500 bg-red-100 text-red-800';
//       case 'warning': return 'border-yellow-500 bg-yellow-100 text-yellow-800';
//       case 'success': return 'border-green-500 bg-green-100 text-green-800';
//       case 'info':
//       default: return 'border-blue-500 bg-blue-100 text-blue-800';
//     }
//   };

//   if (loadingData) {
//     return <div className="p-8 text-center text-lg text-gray-500">Loading control panel data...</div>;
//   }

//   return (
//     <section>
//       <h2 className="text-xl font-bold text-gray-800">Control Panel</h2>
//       <p className="mt-2 text-sm text-gray-600">
//         Configure the target model, domain, and defense status before launching an attack run.
//       </p>

//       <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        
//         {/* Attack families (Placeholder) */}
//         <div className="p-4 rounded-lg bg-gray-50 shadow border border-gray-200">
//           <h3 className="font-medium text-gray-700">Attack families</h3>
//           <select className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm bg-white cursor-not-allowed text-gray-400" disabled>
//             <option value="all">ALL (Default)</option>
//           </select>
//         </div>

//         {/* Models */}
//          <div className="p-4 rounded-lg bg-white shadow border border-gray-200">
//             <h3 className="font-medium text-gray-700">Models</h3>
//             <select
//                 value={selectedModel}
//                 onChange={(e) => setSelectedModel(e.target.value)}
//                 className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
//             >
//                 <option value="">Select model</option>
//                 <option value="all">ALL</option>
//                 {models.map((model) => (
//                     <option key={model.llm_name} value={model.llm_name}>
//                         {model.llm_name}
//                     </option>
//                 ))}
//             </select>
//         </div>

//         {/* Usecases */}
//         <div className="p-4 rounded-lg bg-white shadow border border-gray-200">
//           <h3 className="font-medium text-gray-700">Usecases</h3>
//           <select
//                 value={selectedUsecase}
//                 onChange={(e) => setSelectedUsecase(e.target.value)}
//                 className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
//             >
//                 <option value="">Select usecase</option>
//                 <option value="all">ALL</option>
//                 {usecases.map((usecase) => (
//                     <option key={usecase.usecase_name} value={usecase.usecase_name}>
//                         {usecase.usecase_name}
//                     </option>
//                 ))}
//             </select>
//         </div>
//       </div>

//       <div className="mt-6 flex gap-3 items-center">
//         {/* Run Attack Button */}
//         <button
//           onClick={handleRunAttack}
//           disabled={isRunningAttack || !selectedModel || !selectedUsecase}
//           className={`
//             px-6 py-2 rounded-lg text-white font-semibold transition-all duration-300 shadow-md 
//             ${isRunningAttack || !selectedModel || !selectedUsecase
//                 ? 'bg-gray-400 cursor-not-allowed'
//                 : 'bg-red-600 hover:bg-red-700'
//             }
//           `}
//           onMouseEnter={(e) => !isRunningAttack && (e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 0, 0, 0.7)')}
//           onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
//         >
//           {isRunningAttack ? (
//             <span className="flex items-center">
//               <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//               </svg>
//               Launching...
//             </span>
//           ) : (
//             'Run Attack'
//           )}
//         </button>

//         {/* Defense Toggle Implementation */}
//         <div className="flex items-center space-x-3 ml-4 p-2 rounded-lg bg-white shadow border border-1 border-brand-blue">
//           <span className="text-sm font-medium text-gray-700">Defence Status:</span>
          
//           <button
//             onClick={handleDefenseToggle}
//             className={`
//               relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
//               ${isDefenseEnabled ? 'bg-green-600 focus:ring-green-500' : 'bg-gray-400 focus:ring-gray-500'}
//             `}
//             role="switch"
//             aria-checked={isDefenseEnabled}
//           >
//             <span
//               aria-hidden="true"
//               className={`
//                 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
//                 ${isDefenseEnabled ? 'translate-x-5' : 'translate-x-0'}
//               `}
//             ></span>
//           </button>
          
//           <span className={`text-sm font-semibold ${isDefenseEnabled ? 'text-green-600' : 'text-gray-500'}`}>
//             {isDefenseEnabled ? 'Enabled' : 'Disabled'}
//           </span>
//         </div>
        
//         {/* Reset Session Button (NEW) */}
//         <button
//           onClick={handleResetSession}
//           className="ml-4 px-4 py-2 rounded-lg bg-yellow-500 text-white font-medium shadow transition-all duration-200 hover:bg-yellow-600"
//         >
//           Reset Session
//         </button>

//       </div>

//       {/* System Message Box */}
//       <div className={`mt-6 p-4 rounded-lg border-l-4 ${getSystemMessageColor(systemMessage.type)}`}>
//         <p className="text-sm font-medium">{systemMessage.text}</p>
//         <code className="text-xs font-mono opacity-80 mt-1 block">Session ID: {sessionId}</code>
//       </div>

//     </section>
//   );
// }

import { useEffect, useState } from 'react';

export default function MainTab() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [usecases, setUsecases] = useState([]);
  const [selectedUsecase, setSelectedUsecase] = useState('');
  const [attackFamilies, setAttackFamilies] = useState([]); // ADDED STATE
  const [selectedAttackFamily, setSelectedAttackFamily] = useState('all'); // ADDED STATE, default 'all'
  const [isDefenseEnabled, setIsDefenseEnabled] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [isRunningAttack, setIsRunningAttack] = useState(false);
  const [systemMessage, setSystemMessage] = useState({ text: 'Ready to run a new attack.', type: 'info' });

  // --- 1. Session ID and Initial Data Fetch ---
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
        // 1. Fetch Models
        const modelsResponse = await fetch('/api/v1/list/llms');
        const modelsData = await modelsResponse.json();
        if (Array.isArray(modelsData)) {
          setModels(modelsData);
        }

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
            // Assuming data is [{ attack_family: 'Jailbreak' }, ...]
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

  // --- 2. Defense Toggle Handler ---
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
            setSystemMessage({ text: `Defense successfully ${newState ? 'ENABLED' : 'DISABLED'}.`, type: 'success' });
        }
    } catch (error) {
        console.error('Network error while toggling defense:', error);
        setSystemMessage({ text: 'Network error during defense toggle.', type: 'error' });
        setIsDefenseEnabled(!newState);
    }
  };
  
  // --- 3. Run Attack Handler (Implemented) ---
  const handleRunAttack = async () => {
      if (!selectedModel || !selectedUsecase) {
          setSystemMessage({ text: 'Mandatory: Please select both a Model and a Usecase to proceed.', type: 'warning' });
          return;
      }
      
      // Removed hardcoded 'all' and use state. Update system message to reflect selection.
      setIsRunningAttack(true); // Start loading state
      setSystemMessage({ 
          text: `Launching attack run (${selectedAttackFamily}) on Model: ${selectedModel} / Usecase: ${selectedUsecase}. Waiting for response...`, 
          type: 'info' 
      });

      try {
        const payload = {
            session_id: sessionId,
            model: selectedModel,
            usecase: selectedUsecase,
            attack_family: selectedAttackFamily, // USING STATE
        };

        const response = await fetch('/api/v1/attacks/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            let errorMsg = data.detail || `Attack launch failed with status ${response.status}.`;
            setSystemMessage({ 
                text: `Attack launch failed: ${errorMsg}`, 
                type: 'error' 
            });
        } else {
            // Assuming successful response returns a task ID or similar success confirmation
            const taskId = data.task_id || 'N/A';
            setSystemMessage({ 
                text: `Attack successfully launched! Task ID: ${taskId}. Results will appear in the Attack Results tab.`, 
                type: 'success' 
            });
        }

      } catch (error) {
          console.error('Network error while running attack:', error);
          setSystemMessage({ 
              text: 'Network error occurred while attempting to launch the attack.', 
              type: 'error' 
          });
      } finally {
        setIsRunningAttack(false); // Stop loading state
      }
  }

  // --- 4. Reset Session Handler (NEW) ---
  const handleResetSession = () => {
    // 1. Remove the stored ID from the browser's storage
    localStorage.removeItem('dada_session_id');
    
    // 2. Clear all local state
    setSessionId('');
    setSelectedModel('');
    setSelectedUsecase('');
    setSelectedAttackFamily('all'); // ADDED reset for attack family
    setIsDefenseEnabled(false);
    
    // 3. Inform the user and force a full page reload to generate a new Session ID
    setSystemMessage({ 
        text: 'Session reset requested. Refreshing page to generate a new Session ID...', 
        type: 'warning' 
    });
    
    // Use a slight delay to ensure message is seen before reload
    setTimeout(() => {
        window.location.reload(); 
    }, 500);
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
        
        {/* Attack families (NOW DYNAMIC) */}
        <div className="p-4 rounded-lg bg-white shadow border border-gray-200">
          <h3 className="font-medium text-gray-700">Attack families</h3>
          <select
            value={selectedAttackFamily}
            onChange={(e) => setSelectedAttackFamily(e.target.value)}
            className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
          >
            <option value="all">ALL (Run all families)</option>
            {attackFamilies.map((family) => (
                <option key={family} value={family}>
                    {family}
                </option>
            ))}
          </select>
        </div>

        {/* Models */}
         <div className="p-4 rounded-lg bg-white shadow border border-gray-200">
            <h3 className="font-medium text-gray-700">Models</h3>
            <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
            >
                <option value="">Select model</option>
                <option value="all">ALL</option>
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
          disabled={isRunningAttack || !selectedModel || !selectedUsecase}
          className={`
            px-6 py-2 rounded-lg text-white font-semibold transition-all duration-300 shadow-md 
            ${isRunningAttack || !selectedModel || !selectedUsecase
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
              Launching...
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

    </section>
  );
}
