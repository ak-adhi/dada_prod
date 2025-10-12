import { useEffect, useState } from 'react';

export default function MainTab() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  // New state for the defense toggle
  const [isDefenseEnabled, setIsDefenseEnabled] = useState(false);

  useEffect(() => {
    // NOTE: In a real app, this should fetch actual model data
    // For now, let's mock the data for testing
    const mockModels = [
        { id: 'mistral-7b', name: 'Mistral 7B' },
        // { id: 'llama-3', name: 'Llama 3 8B' }, // Add more models later
    ];
    setModels(mockModels);
    
    /* Original fetch block:
    fetch('/api/models')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setModels(res.data); // set the array
        } else {
          setModels([]); // fallback
        }
      })
      .catch((err) => console.error(err));
    */
  }, []);

  // Function to handle defense toggle change and API call (to be implemented later)
  const handleDefenseToggle = () => {
    const newState = !isDefenseEnabled;
    setIsDefenseEnabled(newState);
    
    // TODO: Implement the POST /api/v1/defence/toggle API call here
    // This call would update Redis with the new state for the 'main' tab.
    console.log(`Defense is now set to: ${newState}. API call to /api/v1/defence/toggle is required.`);
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-brand-blue">Control Panel</h2>
      <p className="mt-2 text-sm text-gray-600">
        Choose attack families, models, usecases and trigger attacks. Activate defence. Live monitoring placeholder (P&amp;G).
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attack families */}
        <div className="p-4 rounded-lg bg-white shadow">
          <h3 className="font-medium">Attack families</h3>
          <p className="text-sm text-gray-500 mt-2">Select family (placeholder)</p>
        </div>

        {/* Models */}
         <div className="p-4 rounded-lg bg-white shadow">
            <h3 className="font-medium">Models</h3>
            <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
            >
                <option value="">Select model</option>
                {models.map((model) => (
                    <option key={model.id} value={model.id}>
                        {model.name}
                    </option>
                ))}
            </select>
        </div>

        {/* Usecases */}
        <div className="p-4 rounded-lg bg-white shadow">
          <h3 className="font-medium">Usecases</h3>
          <p className="text-sm text-gray-500 mt-2">Select usecase (placeholder)</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3 items-center">
        <button
          className="px-4 py-2 rounded-lg bg-brand-blue text-white font-medium shadow transition-shadow duration-200"
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 0, 0, 0.9)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)')}
        >
          Run Attack
        </button>

        {/* New Defence Toggle Implementation */}
        <div className="flex items-center space-x-3 ml-4 p-2 rounded-lg bg-white shadow border border-2 border-brand-blue">
          <span className="text-sm font-medium text-gray-700">Defence Status:</span>
          
          <button
            onClick={handleDefenseToggle}
            // Use dynamic Tailwind classes for color and position
            className={`
              relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
              ${isDefenseEnabled ? 'bg-green-600 focus:ring-green-500' : 'bg-gray-200 focus:ring-gray-500'}
            `}
            role="switch"
            aria-checked={isDefenseEnabled}
          >
            <span
              aria-hidden="true"
              // Use dynamic Tailwind classes for translation and background
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
      </div>
    </section>
  );
}