import React, { useState } from 'react';
import MainTab from './tabs/MainTab';
import ChatTab from './tabs/ChatTab';
import HistoryTab from './tabs/HistoryTab';
import TaxonomyTab from './tabs/TaxonomyTab';
import AboutTab from './tabs/AboutTab';
import ChatWidget from './components/ChatWidget';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col font-sans bg-gray-50 text-gray-900">
      <style>{`
        :root{
          --brand-blue: rgb(2 10 245 / 1);
          --rich-black: #0b0f16;
          --muted-grey: #6b7280;
          --bg: #ffffff;
        }
        .retro-card{ 
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(250,250,250,0.95)); 
          border: 1px solid rgba(11,15,22,0.06); 
        }
        .tab-active{ 
          box-shadow: 0 6px 18px rgba(2,10,245,0.12); 
          transform: translateY(-2px); 
        }
      `}</style>
      {/* Thin top blue line */}
      <div
        className="w-full h-[3px] fixed top-0 left-0 z-50"
        style={{ backgroundColor: 'var(--brand-blue)' }}
      ></div>
      {/* Header */}
      <header className="w-full py-6 px-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* GitHub icon (top-left) */}
          <a
            href="https://github.com/ak-adhi/dada_prod.git"
            target="_blank"
            rel="noreferrer"
            aria-label="Open GitHub repo"
            className="p-2 rounded hover:bg-gray-100 transition"
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.96 3.22 9.15 7.69 10.62.56.1.77-.24.77-.54 0-.26-.01-1.12-.02-2.03-3.13.68-3.79-1.51-3.79-1.51-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.12.08 1.71 1.16 1.71 1.16 1 .17 2.03.76 2.53 1.03.08-.81.39-1.37.71-1.69-2.5-.28-5.12-1.25-5.12-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.45.11-3.02 0 0 .95-.31 3.12 1.15a10.8 10.8 0 0 1 2.84-.38c.96 0 1.93.13 2.84.38 2.17-1.47 3.12-1.15 3.12-1.15.61 1.57.23 2.73.11 3.02.72.79 1.16 1.79 1.16 3.02 0 4.32-2.62 5.28-5.12 5.56.4.35.76 1.05.76 2.12 0 1.53-.01 2.77-.01 3.15 0 .3.2.65.78.54C19.03 20.9 22.25 16.71 22.25 11.75 22.25 5.48 17.27.5 12 .5z"
                fill="var(--rich-black)"
              />
            </svg>
          </a>
        </div>

        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            <span className="text-brand-blue">DADA</span>{' '}
            <span style={{ color: 'var(--rich-black)' }}>FRAMEWORK</span>
          </h1>
          <p className="text-sm text-gray-500">
            The Defence Against Dark Arts Framework
          </p>
          <p className="mt-2 text-center font-mono text-gray-600 text-sm font-normal md:mt-4 md:ml-4">
            A sandboxed framework to stress-test and harden LLMs against
            real-world prompt injection exploits
          </p>
        </div>

        <div className="w-12" /> {/* spacer to keep title centered */}
      </header>

      {/* Navigation Tabs */}
      <nav className="px-6 py-4">
        <ul className="flex gap-3 items-center justify-center">
          {[
            { id: 'home', label: 'Home' },
            { id: 'chat', label: 'Chat' },
            { id: 'dashboard', label: 'Results Dashboard' },
            { id: 'taxonomy', label: 'Taxonomy' },
            { id: 'About', label: 'About' },
          ].map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium shadow-sm transition-transform ${
                  activeTab === tab.id
                    ? 'bg-white tab-active text-brand-blue'
                    : 'bg-transparent hover:bg-white hover:text-brand-blue'
                }`}
                aria-pressed={activeTab === tab.id}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content area */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="retro-card rounded-2xl p-6 h-full">
          {activeTab === 'home' && <MainTab />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'dashboard' && <HistoryTab />}
          {activeTab === 'taxonomy' && <TaxonomyTab />}
          {activeTab === 'About' && <AboutTab />}
        </div>
      </main>

       {/* Floating chat button + widget */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3">
        {chatOpen && <ChatWidget onClose={() => setChatOpen(false)} />}
        <button
          onClick={() => setChatOpen((v) => !v)}
          aria-label="Open chat"
          className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center bg-white hover:scale-105 transition"
          style={{
            boxShadow: '0 0 15px 3px rgba(2,10,245,0.3)', // faint glow using brand blue
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
              stroke="var(--brand-blue)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
        

      <footer className="text-center py-6 text-sm text-gray-500">
        Powered by the DADA Framework — Secure, Scalable, and Production-Ready.
      </footer>
    </div>
  );
}

