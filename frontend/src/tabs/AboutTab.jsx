import React, { useState } from 'react';

export default function TeamTab() {
  // Initialize state for descriptions
  const [descriptions, setDescriptions] = useState({
    Adithya: 'Designed and implemented the core architecture of the DADA Framework, including both the command-line utility and React-based UI. Developed the initial defence layer and refined the final attack testbed. Built and integrated the FastAPI backend with Celery–Redis orchestration, PostgreSQL database, and GPU acceleration for high-performance execution, deploying the entire system through Docker containers.',
    Alfi: '',
    Amanda: '',
    Faiyaz: '',
    Nayna: '',
    Shashikanth: '',
    Siddartha: ''
  });

  // Handle description change
  const handleDescriptionChange = (name, value) => {
    setDescriptions({
      ...descriptions,
      [name]: value
    });
  };

  const teamMembers = [
    'Adithya',
    'Alfi',
    'Amanda',
    'Faiyaz',
    'Nayna',
    'Shashikanth',
    'Siddartha'
  ];

  return (
    <section>
      <h2 className="text-lg font-semibold text-brand-blue">Meet the team</h2>
      <p className="mt-2 text-sm text-gray-600">Each teammate gets their own tab in the full project — keep UI separation minimal to avoid git conflicts.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {teamMembers.map((name) => (
          <div key={name} className="p-4 bg-white rounded-lg shadow text-sm">
            <div className="font-medium">{name}</div>
            <div className="text-gray-500 mt-1"></div>
            <textarea
  value={descriptions[name]}
  onChange={(e) => handleDescriptionChange(name, e.target.value)}
  placeholder="Write a description..."
  className="mt-2 p-2 w-full text-sm border rounded-md bg-white text-black resize-none overflow-hidden min-h-[100px]"
//   Add custom class to avoid scrolling and grow automatically
/>

          </div>
        ))}
      </div>
    </section>
  );
}
