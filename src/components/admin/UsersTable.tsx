import { Profile } from '../../types';

interface UsersTableProps {
  users: Profile[];
  searchQuery: string;
  onUserClick: (user: Profile) => void;
}

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: 'Administrateur',
    manager: 'Gestionnaire',
    player: 'Joueur',
  };
  return labels[role] || role;
};

export function UsersTable({ users, searchQuery, onUserClick }: UsersTableProps) {
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
    const username = (user.username || '').toLowerCase();
    const phone = (user.phone || '').toLowerCase();

    return (
      fullName.includes(query) ||
      username.includes(query) ||
      phone.includes(query)
    );
  });

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Nom
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
              Nom d'utilisateur
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
              Téléphone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Rôle
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredUsers.map((user) => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            const displayName = fullName || user.username;

            return (
              <tr
                key={user.id}
                className={`hover:bg-gray-50 cursor-pointer transition ${
                  !user.is_active ? 'opacity-50 bg-gray-50' : ''
                }`}
                onClick={() => onUserClick(user)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {displayName}
                  {!user.is_active && (
                    <span className="ml-2 text-xs text-red-600">(Inactif)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                  {user.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                  {user.phone || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'admin'
                        ? 'bg-emerald-100 text-emerald-700'
                        : user.role === 'manager'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
