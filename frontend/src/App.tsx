import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExtractorPage } from './pages/ExtractorPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <ExtractorPage />
      </div>
    </QueryClientProvider>
  );
}

export default App;