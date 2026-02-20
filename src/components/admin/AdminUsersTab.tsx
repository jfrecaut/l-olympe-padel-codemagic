import { useState } from 'react';
import { UserPlus, Search } from 'lucide-react';
import { Profile } from '../../types';
import { UserForm } from './UserForm';
import { UsersTable } from './UsersTable';

interface AdminUsersTabProps {
  users: Profile[];
  onCreateUser: (
    role: 'admin' | 'manager' | 'player',
    data: {
      email: string;
      password: string;
      username: string;
      firstName: string;
      lastName: string;
      phone: string;
    }
  ) => Promise<void>;
  onUserClick: (user: Profile) => void;
  loading: boolean;
  userRole?: 'admin' | 'manager' | 'player';
}

export function AdminUsersTab({
  users,
  onCreateUser,
  onUserClick,
  loading,
  userRole = 'admin',
}: AdminUsersTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [formRole, setFormRole] = useState<'admin' | 'manager' | 'player'>('player');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = async (data: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) => {
    await onCreateUser(formRole, data);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Gestion des utilisateurs</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFormRole('player');
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            <UserPlus size={20} />
            Ajouter un joueur
          </button>
          {(userRole === 'admin' || userRole === 'manager') && (
            <button
              onClick={() => {
                setFormRole('manager');
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
            >
              <UserPlus size={20} />
              Ajouter un manager
            </button>
          )}
          {userRole === 'admin' && (
            <button
              onClick={() => {
                setFormRole('admin');
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
            >
              <UserPlus size={20} />
              Ajouter un admin
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom, username, téléphone ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {showForm && (
        <UserForm
          role={formRole}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          loading={loading}
        />
      )}

      <UsersTable users={users} searchQuery={searchQuery} onUserClick={onUserClick} />
    </div>
  );
}
