import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, User, Phone, Mail, UserCheck, UserX, Edit, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile, Booking, Court } from '../types';

interface UserDetailsProps {
  user: Profile;
  onClose: () => void;
  onUpdate?: () => void;
}

interface BookingWithCourt extends Booking {
  court?: Court;
}

export function UserDetails({ user, onClose, onUpdate }: UserDetailsProps) {
  const [bookings, setBookings] = useState<BookingWithCourt[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile>(user);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user.username,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
    email: '',
    password: ''
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    fetchUserBookings();
    fetchUserEmail();
    setCurrentUser(user);
    setEditForm({
      username: user.username,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      email: '',
      password: ''
    });
    setIsEditing(false);
  }, [user.id]);

  useEffect(() => {
    setEditForm(prev => ({
      ...prev,
      username: currentUser.username,
      first_name: currentUser.first_name || '',
      last_name: currentUser.last_name || '',
      phone: currentUser.phone || '',
      email: userEmail,
      password: ''
    }));
  }, [userEmail, currentUser]);

  const fetchUserEmail = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_email', {
        target_user_id: user.id
      });

      if (error) {
        alert(`Error loading email: ${error.message}`);
        return;
      }

      setUserEmail(data || '');
    } catch (error) {
      alert('Failed to load user email');
    }
  };

  const fetchUserBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        court:courts(*)
      `)
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (data) {
      setBookings(data as BookingWithCourt[]);
    }
    setLoading(false);
  };

  const toggleUserStatus = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentUser.is_active })
        .eq('id', currentUser.id);

      if (error) throw error;

      setCurrentUser({ ...currentUser, is_active: !currentUser.is_active });
      if (onUpdate) onUpdate();
    } catch (error) {
    } finally {
      setUpdating(false);
    }
  };

  const saveUserChanges = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      if (editForm.email && editForm.email !== userEmail) {
        const { data, error: emailError } = await supabase.rpc('update_user_email', {
          target_user_id: currentUser.id,
          new_email: editForm.email
        });

        if (emailError) {
          throw new Error(emailError.message || 'Échec de la mise à jour de l\'email');
        }

        setUserEmail(editForm.email);
      }

      if (editForm.password && editForm.password.trim() !== '') {
        if (editForm.password.length < 6) {
          throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }

        const { error: passwordError } = await supabase.rpc('update_user_password', {
          target_user_id: currentUser.id,
          new_password: editForm.password
        });

        if (passwordError) {
          throw new Error(passwordError.message || 'Échec de la mise à jour du mot de passe');
        }
      }

      setCurrentUser({
        ...currentUser,
        username: editForm.username,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone
      });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      alert(error.message || 'Error updating user');
    } finally {
      setUpdating(false);
    }
  };

  const cancelEdit = () => {
    setEditForm({
      username: currentUser.username,
      first_name: currentUser.first_name || '',
      last_name: currentUser.last_name || '',
      phone: currentUser.phone || '',
      email: userEmail,
      password: ''
    });
    setIsEditing(false);
  };

  const now = new Date();
  const upcomingBookings = bookings.filter(b => {
    const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`);
    return bookingDateTime >= now;
  });
  const pastBookings = bookings.filter(b => {
    const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`);
    return bookingDateTime < now;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUserDisplayName = () => {
    const fullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
    return fullName || currentUser.username;
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      admin: 'Administrateur',
      manager: 'Gestionnaire',
      player: 'Joueur',
    };
    return labels[role] || role;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-emerald-500 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Détails de l'utilisateur</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-emerald-600 rounded-lg p-2 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 rounded-full p-3">
                  <User size={32} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{getUserDisplayName()}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        currentUser.role === 'admin'
                          ? 'bg-emerald-100 text-emerald-700'
                          : currentUser.role === 'manager'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {getRoleLabel(currentUser.role)}
                    </span>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        currentUser.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {currentUser.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveUserChanges}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50"
                    >
                      <Save size={18} />
                      Enregistrer
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50"
                    >
                      <X size={18} />
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
                  >
                    <Edit size={18} />
                    Modifier
                  </button>
                )}
                <button
                  onClick={toggleUserStatus}
                  disabled={updating || isEditing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium disabled:opacity-50 ${
                    currentUser.is_active
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {currentUser.is_active ? (
                    <>
                      <UserX size={18} />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <UserCheck size={18} />
                      Activer
                    </>
                  )}
                </button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe (optionnel)
                  </label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Laisser vide pour ne pas modifier"
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères. Laisser vide pour conserver le mot de passe actuel.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <User size={18} className="text-gray-400" />
                  <span className="text-sm">Nom d'utilisateur: <strong>{currentUser.username}</strong></span>
                </div>
                {userEmail && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail size={18} className="text-gray-400" />
                    <span className="text-sm">{userEmail}</span>
                  </div>
                )}
                {currentUser.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone size={18} className="text-gray-400" />
                    <span className="text-sm">{currentUser.phone}</span>
                  </div>
                )}
                {currentUser.first_name && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-sm">Prénom: <strong>{currentUser.first_name}</strong></span>
                  </div>
                )}
                {currentUser.last_name && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-sm">Nom: <strong>{currentUser.last_name}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement des réservations...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={20} className="text-emerald-500" />
                  Réservations à venir ({upcomingBookings.length})
                </h4>
                {upcomingBookings.length === 0 ? (
                  <p className="text-gray-500 text-sm bg-gray-50 rounded-lg p-4">Aucune réservation à venir</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-gray-900 font-medium mb-2">
                              <MapPin size={18} className="text-emerald-500" />
                              {booking.court?.name || 'Court'}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                {formatDate(booking.booking_date)}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={16} />
                                {booking.start_time} - {booking.end_time}
                              </div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={20} className="text-gray-500" />
                  Réservations passées ({pastBookings.length})
                </h4>
                {pastBookings.length === 0 ? (
                  <p className="text-gray-500 text-sm bg-gray-50 rounded-lg p-4">Aucune réservation passée</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pastBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-75"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                              <MapPin size={18} className="text-gray-400" />
                              {booking.court?.name || 'Court'}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                {formatDate(booking.booking_date)}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={16} />
                                {booking.start_time} - {booking.end_time}
                              </div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
