import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { PlayerDashboard } from './components/PlayerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { useMetaTags } from './hooks/useMetaTags';

function App() {
  const { user, profile, loading } = useAuth();
  useMetaTags();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  if (profile.role === 'admin' || profile.role === 'manager') {
    return <AdminDashboard />;
  }

  return <PlayerDashboard />;
}

export default App;
