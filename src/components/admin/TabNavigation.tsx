import { Calendar, Users, BarChart3, DollarSign, Tag } from 'lucide-react';
import { SettingsMenu } from './SettingsMenu';

type MainTab = 'bookings' | 'players' | 'stats' | 'refunds' | 'promotions';
type SettingsTab = 'courts' | 'settings' | 'welcome' | 'brevo' | 'stripe';
type Tab = MainTab | SettingsTab;

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  pendingRefundsCount?: number;
  userRole?: 'admin' | 'manager' | 'player';
}

export function TabNavigation({ activeTab, onTabChange, pendingRefundsCount = 0, userRole = 'admin' }: TabNavigationProps) {
  const mainTabs = [
    { id: 'bookings' as MainTab, label: 'Réservations', icon: Calendar },
    { id: 'players' as MainTab, label: 'Joueurs', icon: Users },
    { id: 'refunds' as MainTab, label: 'Remboursements', icon: DollarSign, badge: pendingRefundsCount },
    { id: 'promotions' as MainTab, label: 'Promotions', icon: Tag },
    { id: 'stats' as MainTab, label: 'Statistiques', icon: BarChart3 },
  ];

  const isSettingsTab = ['courts', 'settings', 'welcome', 'brevo', 'stripe', 'manifest'].includes(activeTab);

  return (
    <div className="bg-white rounded-lg shadow-sm mb-6 px-6 py-4">
      <div className="flex items-center justify-between">
        <nav className="flex gap-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition relative ${
                  activeTab === tab.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <SettingsMenu
          activeTab={isSettingsTab ? activeTab as SettingsTab : null}
          onTabChange={onTabChange}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
