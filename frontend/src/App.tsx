import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExtractorPage } from './pages/ExtractorPage';
import { GraphPage } from './pages/GraphPage';

const queryClient = new QueryClient();

type Tab = 'extract' | 'graph';

const TABS: { id: Tab; label: string }[] = [
  { id: 'extract', label: 'Extract' },
  { id: 'graph', label: 'Graph' },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('extract');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-8 h-14">
            <span className="font-bold text-gray-900 text-lg tracking-tight">
              RAG Graph
            </span>
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          {activeTab === 'extract' ? <ExtractorPage /> : <GraphPage />}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;