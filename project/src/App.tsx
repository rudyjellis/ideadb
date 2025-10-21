import { useState, useEffect } from 'react';
import { Lightbulb, Database, Target, Settings as SettingsIcon, LogOut, Loader2, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useApiKey } from './hooks/useApiKey';
import Login from './pages/Login';
import ExtractIdea from './pages/ExtractIdea';
import ViewIdeas from './pages/ViewIdeas';
import FounderMatch from './pages/FounderMatch';
import Settings from './pages/Settings';
import UsageDashboard from './pages/UsageDashboard';
import DocumentViewer from './pages/DocumentViewer';
import WelcomeModal from './components/WelcomeModal';

type Page = 'extract' | 'view' | 'match' | 'usage' | 'settings';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const { hasApiKey, loading: apiKeyLoading } = useApiKey();
  const [currentPage, setCurrentPage] = useState<Page>('extract');
  const [showWelcome, setShowWelcome] = useState(false);

  if (window.location.pathname === '/view-documents') {
    return <DocumentViewer />;
  }

  useEffect(() => {
    if (user && !apiKeyLoading) {
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome && !hasApiKey) {
        setShowWelcome(true);
        localStorage.setItem('hasSeenWelcome', 'true');
      }
    }
  }, [user, apiKeyLoading, hasApiKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Startup Idea Database</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage('extract')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  currentPage === 'extract'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Extract Idea
              </button>
              <button
                onClick={() => setCurrentPage('view')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  currentPage === 'view'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Database className="w-4 h-4" />
                View Ideas
              </button>
              <button
                onClick={() => setCurrentPage('match')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  currentPage === 'match'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Target className="w-4 h-4" />
                Founder Match
              </button>
              <button
                onClick={() => setCurrentPage('usage')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  currentPage === 'usage'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Activity className="w-4 h-4" />
                Usage
              </button>
              <div className="border-l border-gray-300 h-8 mx-2" />
              <button
                onClick={() => setCurrentPage('settings')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  currentPage === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={signOut}
                className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-100"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'extract' && (
          <ExtractIdea
            onNavigateToSettings={() => setCurrentPage('settings')}
            onNavigateToViewIdeas={() => setCurrentPage('view')}
          />
        )}
        {currentPage === 'view' && <ViewIdeas />}
        {currentPage === 'match' && <FounderMatch />}
        {currentPage === 'usage' && <UsageDashboard />}
        {currentPage === 'settings' && <Settings />}
      </main>

      {showWelcome && (
        <WelcomeModal
          onClose={() => setShowWelcome(false)}
          onNavigateToSettings={() => {
            setShowWelcome(false);
            setCurrentPage('settings');
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
