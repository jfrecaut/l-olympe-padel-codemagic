import { useState, useEffect } from 'react';
import { User, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfileSettingsProps {
  onClose: () => void;
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!profile) throw new Error('Profile not found');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username,
          first_name: firstName,
          last_name: lastName,
          phone,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      if (email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email,
        });
        if (emailError) throw emailError;
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        if (newPassword.length < 6) {
          throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) throw passwordError;

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      await refreshProfile();
      setSuccess('Profil mis à jour avec succès');

      setTimeout(() => {
        refreshProfile();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 rounded-xl shadow-lg p-6 border border-neutral-800">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <User className="text-[#c4ab63]" size={24} />
        Mes informations
      </h2>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Informations personnelles</h3>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Numéro de téléphone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-neutral-800">
            <h3 className="text-lg font-semibold text-white">Changer le mot de passe</h3>
            <p className="text-sm text-neutral-400">Laisser vide pour conserver le mot de passe actuel</p>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent"
                minLength={6}
                placeholder="Entrez le nouveau mot de passe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent"
                minLength={6}
                placeholder="Confirmez le nouveau mot de passe"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 text-red-300 px-4 py-3 rounded-lg text-sm border border-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-[#866733]/30 text-[#ecd88e] px-4 py-3 rounded-lg text-sm border border-[#866733]">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#866733] via-[#c4ab63] to-[#ecd88e] text-black py-3 rounded-lg font-semibold hover:from-[#6b5229] hover:via-[#866733] hover:to-[#c4ab63] shadow-lg hover:shadow-[#c4ab63]/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
    </div>
  );
}
