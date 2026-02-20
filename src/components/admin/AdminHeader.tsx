import { LogOut } from 'lucide-react';

interface AdminHeaderProps {
  username: string;
  logoUrl: string | null;
  onSignOut: () => void;
}

export function AdminHeader({ username, logoUrl, onSignOut }: AdminHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-12 w-auto"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Admin</h1>
              <p className="text-sm text-gray-600 mt-1">Bienvenue, {username}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
