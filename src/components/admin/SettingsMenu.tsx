import { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown } from 'lucide-react';

type SettingsTab = 'courts' | 'settings' | 'welcome' | 'brevo' | 'stripe' | 'manifest';

interface SettingsMenuProps {
  activeTab: SettingsTab | null;
  onTabChange: (tab: SettingsTab) => void;
  userRole?: 'admin' | 'manager' | 'player';
}

export function SettingsMenu({ activeTab, onTabChange, userRole = 'admin' }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const allMenuItems = [
    { id: 'courts' as SettingsTab, label: 'Courts', roles: ['admin', 'manager'] },
    { id: 'settings' as SettingsTab, label: 'Paramètres de réservation', roles: ['admin', 'manager'] },
    { id: 'welcome' as SettingsTab, label: "Médias d'accueil", roles: ['admin'] },
    { id: 'brevo' as SettingsTab, label: 'Mail Brevo', roles: ['admin'] },
    { id: 'stripe' as SettingsTab, label: 'Paiements Stripe', roles: ['admin'] },
    { id: 'manifest' as SettingsTab, label: 'Manifest application', roles: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getActiveLabel = () => {
    const activeItem = menuItems.find(item => item.id === activeTab);
    return activeItem?.label || 'Configuration';
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
          activeTab && menuItems.some(item => item.id === activeTab)
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        } shadow-sm border border-gray-200`}
      >
        <Settings size={20} />
        <span className="font-medium">{getActiveLabel()}</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm transition ${
                activeTab === item.id
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
