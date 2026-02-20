import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Court, Profile, Refund } from '../types';
import { AdminSettings } from './AdminSettings';
import { AdminBrevoSettings } from './AdminBrevoSettings';
import { AdminStripeSettings } from './AdminStripeSettings';
import AdminWelcomeSettings from './AdminWelcomeSettings';
import { AdminManifestSettings } from './AdminManifestSettings';
import { BookingCalendar } from './BookingCalendar';
import { UserDetails } from './UserDetails';
import { AdminHeader } from './admin/AdminHeader';
import { TabNavigation } from './admin/TabNavigation';
import { AdminCourtsTab } from './admin/AdminCourtsTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminStatsTab } from './admin/AdminStatsTab';
import { AdminRefundsTab } from './admin/AdminRefundsTab';
import { AdminPromotionsTab } from './admin/AdminPromotionsTab';
import { courtService, profileService, settingsService, refundService } from '../services';
import { mediaService } from '../services/mediaService';
import { sendUserNotification } from '../lib/emailService';

type Tab = 'courts' | 'bookings' | 'players' | 'stats' | 'refunds' | 'promotions' | 'settings' | 'welcome' | 'brevo' | 'stripe' | 'manifest';

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const [courts, setCourts] = useState<Court[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const userRole = profile?.role || 'admin';
  const isManager = userRole === 'manager';

  const managerRestrictedTabs: Tab[] = ['welcome', 'brevo', 'stripe', 'manifest'];

  const handleTabChange = (tab: Tab) => {
    if (isManager && managerRestrictedTabs.includes(tab)) {
      setError('Accès non autorisé à cette section');
      return;
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    fetchCourts();
    fetchUsers();
    fetchSettings();
    fetchRefunds();
  }, []);

  const fetchCourts = async () => {
    try {
      const data = await courtService.getAll();
      setCourts(data);
    } catch (err) {
      console.error('Error fetching courts:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await profileService.getAll();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await settingsService.get();
      setLogoUrl(data.company_logo_url || null);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchRefunds = async () => {
    try {
      const data = await refundService.getAll();
      setRefunds(data);
    } catch (err) {
      console.error('Error fetching refunds:', err);
    }
  };

  const handleCreateCourt = async (courtName: string, courtCapacity: 2 | 4, courtPrice: number, imageFile?: File) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const uploadResult = await mediaService.uploadCourtImage(imageFile);
        imageUrl = uploadResult.url;
      }

      await courtService.create({
        name: courtName,
        capacity: courtCapacity,
        price: courtPrice,
        image_url: imageUrl
      });
      setSuccess('Court créé avec succès !');
      fetchCourts();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourt = async (courtId: string, updates: { name?: string; capacity?: number; price?: number; image_url?: string }, imageFile?: File) => {
    setError('');
    setSuccess('');

    try {
      if (imageFile) {
        const uploadResult = await mediaService.uploadCourtImage(imageFile);
        updates.image_url = uploadResult.url;
      }

      await courtService.update(courtId, updates);
      setSuccess('Court mis à jour avec succès !');
      fetchCourts();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce court ?')) return;

    try {
      await courtService.deactivate(courtId);
      fetchCourts();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  const handleCreateUser = async (
    role: 'admin' | 'manager' | 'player',
    data: {
      email: string;
      password: string;
      username: string;
      firstName: string;
      lastName: string;
      phone: string;
    }
  ) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await profileService.create({ ...data, role });
      const roleLabel = role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Joueur';
      setSuccess(`${roleLabel} créé avec succès !`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRefund = async (refundId: string) => {
    setError('');
    setSuccess('');

    try {
      if (!profile?.id) throw new Error('Utilisateur non identifié');

      const refund = refunds.find(r => r.id === refundId);
      if (!refund) throw new Error('Remboursement non trouvé');

      await refundService.approve(refundId, profile.id);

      if (refund.user_id && refund.booking && refund.profile) {
        await sendUserNotification(refund.user_id, 'refund_approved', {
          first_name: refund.profile.first_name,
          last_name: refund.profile.last_name,
          booking_date: new Date(refund.booking.booking_date).toLocaleDateString('fr-FR'),
          start_time: refund.booking.start_time.slice(0, 5),
          end_time: refund.booking.end_time.slice(0, 5),
          court_name: refund.booking.court?.name || 'Court',
          amount: (refund.amount / 100).toFixed(2) + ' €',
        });
      }

      setSuccess('Remboursement approuvé avec succès !');
      fetchRefunds();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  const handleRejectRefund = async (refundId: string, reason: string) => {
    setError('');
    setSuccess('');

    try {
      if (!profile?.id) throw new Error('Utilisateur non identifié');

      const refund = refunds.find(r => r.id === refundId);
      if (!refund) throw new Error('Remboursement non trouvé');

      await refundService.reject(refundId, profile.id, reason);

      if (refund.user_id && refund.booking && refund.profile) {
        await sendUserNotification(refund.user_id, 'refund_rejected', {
          first_name: refund.profile.first_name,
          last_name: refund.profile.last_name,
          booking_date: new Date(refund.booking.booking_date).toLocaleDateString('fr-FR'),
          start_time: refund.booking.start_time.slice(0, 5),
          end_time: refund.booking.end_time.slice(0, 5),
          court_name: refund.booking.court?.name || 'Court',
          amount: (refund.amount / 100).toFixed(2) + ' €',
          rejection_reason: reason,
        });
      }

      setSuccess('Remboursement refusé avec succès !');
      fetchRefunds();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  const pendingRefundsCount = refunds.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader username={profile?.username || ''} logoUrl={logoUrl} onSignOut={signOut} />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingRefundsCount={pendingRefundsCount}
          userRole={userRole}
        />

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}>
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-lg text-sm mb-4 flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess('')}>
              <X size={18} />
            </button>
          </div>
        )}

        {activeTab === 'courts' && (
          <AdminCourtsTab
            courts={courts}
            onCreateCourt={handleCreateCourt}
            onUpdateCourt={handleUpdateCourt}
            onDeleteCourt={handleDeleteCourt}
            loading={loading}
          />
        )}

        {activeTab === 'bookings' && <BookingCalendar courts={courts} onRefundCreated={fetchRefunds} />}

        {activeTab === 'players' && (
          <AdminUsersTab
            users={users}
            onCreateUser={handleCreateUser}
            onUserClick={setSelectedUser}
            loading={loading}
            userRole={userRole}
          />
        )}

        {activeTab === 'stats' && <AdminStatsTab />}

        {activeTab === 'refunds' && (
          <AdminRefundsTab
            refunds={refunds}
            onApprove={handleApproveRefund}
            onReject={handleRejectRefund}
          />
        )}

        {activeTab === 'promotions' && <AdminPromotionsTab />}

        {activeTab === 'settings' && <AdminSettings />}

        {activeTab === 'welcome' && !isManager && <AdminWelcomeSettings />}

        {activeTab === 'brevo' && !isManager && <AdminBrevoSettings />}

        {activeTab === 'stripe' && !isManager && <AdminStripeSettings />}

        {activeTab === 'manifest' && !isManager && <AdminManifestSettings />}
      </div>

      {selectedUser && (
        <UserDetails
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={fetchUsers}
        />
      )}
    </div>
  );
}
