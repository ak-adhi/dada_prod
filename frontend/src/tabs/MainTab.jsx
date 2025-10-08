import { useEffect, useState } from 'react';

export default function MainTab() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

useEffect(() => {
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
}, []);


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
          <option key={model.id} value={model.name}>
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

      <div className="mt-6 flex gap-3">
        <button
          className="px-4 py-2 rounded-lg bg-brand-blue text-white font-medium shadow transition-shadow duration-200"
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 0, 0, 0.9)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)')}
        >
          Run Attack
        </button>

        <button
          className="px-4 py-2 rounded-lg bg-brand-blue text-white border border-gray-200 font-medium shadow transition-shadow duration-200"
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 15px rgba(34, 139, 34, 0.9)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)')}
        >
          Activate Defence
        </button>
      </div>
    </section>
  );
}
