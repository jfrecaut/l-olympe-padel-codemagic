import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Profile } from '../types';

interface UserSearchSelectProps {
  users: Profile[];
  selectedUserId: string;
  onSelect: (userId: string) => void;
  placeholder?: string;
  required?: boolean;
  excludeUserIds?: string[];
  excludeRoles?: Array<'admin' | 'player'>;
}

export function UserSearchSelect({
  users,
  selectedUserId,
  onSelect,
  placeholder = 'Rechercher un joueur...',
  required = false,
  excludeUserIds = [],
  excludeRoles = [],
}: UserSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedUser = users.find(u => u.id === selectedUserId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserDisplayName = (user: Profile) => {
    const fullName = `${user.first_name} ${user.last_name}`.trim();
    return fullName || user.username;
  };

  const getAvailableUsers = () => {
    return users.filter(u =>
      !excludeUserIds.includes(u.id) &&
      !excludeRoles.includes(u.role)
    );
  };

  const getFilteredUsers = () => {
    const availableUsers = getAvailableUsers();

    if (!searchTerm.trim()) {
      return availableUsers;
    }

    const term = searchTerm.toLowerCase();
    return availableUsers.filter(user => {
      const displayName = getUserDisplayName(user).toLowerCase();
      const username = user.username.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      const phone = user.phone?.toLowerCase() || '';
      const firstName = user.first_name?.toLowerCase() || '';
      const lastName = user.last_name?.toLowerCase() || '';

      return (
        displayName.includes(term) ||
        username.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        firstName.includes(term) ||
        lastName.includes(term)
      );
    });
  };

  const handleSelect = (userId: string) => {
    onSelect(userId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onSelect('');
    setSearchTerm('');
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <div
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer flex items-center justify-between hover:border-gray-400 transition"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedUser ? (
            <div className="flex-1 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  {getUserDisplayName(selectedUser)}
                </div>
                <div className="text-xs text-gray-500">
                  @{selectedUser.username}
                  {selectedUser.email && ` • ${selectedUser.email}`}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="ml-2 p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b sticky top-0 bg-white">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, prénom, pseudo, email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-64">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Aucun joueur trouvé
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelect(user.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-emerald-50 transition border-b last:border-b-0 ${
                    user.id === selectedUserId ? 'bg-emerald-100' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {getUserDisplayName(user)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    @{user.username}
                  </div>
                  {(user.email || user.phone) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {user.email && <span>{user.email}</span>}
                      {user.email && user.phone && <span> • </span>}
                      {user.phone && <span>{user.phone}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {required && !selectedUserId && (
        <input
          type="text"
          value=""
          required
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      )}
    </div>
  );
}
