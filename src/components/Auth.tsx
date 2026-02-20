import { useState, useEffect } from 'react';
import { LogIn, UserPlus, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('company_logo_dark_url')
          .single();

        if (data?.company_logo_dark_url) {
          setLogoUrl(data.company_logo_dark_url);
        }
      } catch (err) {
      }
    };

    fetchLogo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Email ou mot de passe incorrect');
          }
          throw error;
        }
      } else {
        if (!username || !firstName || !lastName || !phone) {
          throw new Error('Tous les champs sont requis');
        }
        const { error } = await signUp(email, password, username, firstName, lastName, phone);
        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('Cet email est déjà utilisé');
          }
          throw error;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-password-reset`;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.status === 429) {
        throw new Error(data.error || 'Vous devez attendre 10 minutes entre chaque demande');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      setSuccess('Si cet email existe, un nouveau mot de passe a été envoyé');
      setEmail('');
      setTimeout(() => {
        setIsForgotPassword(false);
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-neutral-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-auto"
              />
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#866733]/30 to-[#c4ab63]/30 rounded-full ring-2 ring-[#866733]/50">
                <span className="text-3xl">🎾</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Réservation Padel</h1>
          <p className="text-neutral-400">
            {isForgotPassword
              ? 'Réinitialisez votre mot de passe'
              : isLogin
              ? 'Connectez-vous pour réserver votre court'
              : 'Créez votre compte joueur'}
          </p>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-neutral-300 mb-1">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-[#c4ab63] transition"
                placeholder="votre@email.com"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 text-red-300 px-4 py-3 rounded-lg text-sm border border-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-900/30 text-green-300 px-4 py-3 rounded-lg text-sm border border-green-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#866733] via-[#c4ab63] to-[#ecd88e] hover:from-[#6b5229] hover:via-[#866733] hover:to-[#c4ab63] text-black py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-[#866733]/30 hover:shadow-2xl hover:shadow-[#866733]/50"
            >
              {loading ? (
                'Envoi en cours...'
              ) : (
                <>
                  <KeyRound size={20} />
                  Réinitialiser le mot de passe
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError('');
                setSuccess('');
                setEmail('');
              }}
              className="w-full text-neutral-400 hover:text-neutral-300 py-2 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Retour à la connexion
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-neutral-300 mb-1">
                  Nom d'utilisateur
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-[#c4ab63] transition"
                  required={!isLogin}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-neutral-300 mb-1">
                    Prénom
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-[#c4ab63] transition"
                    required={!isLogin}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-neutral-300 mb-1">
                    Nom
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-[#c4ab63] transition"
                    required={!isLogin}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-300 mb-1">
                  Numéro de téléphone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-[#c4ab63] transition"
                  required={!isLogin}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-900/30 text-red-300 px-4 py-3 rounded-lg text-sm border border-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#866733] via-[#c4ab63] to-[#ecd88e] hover:from-[#6b5229] hover:via-[#866733] hover:to-[#c4ab63] text-black py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-[#866733]/30 hover:shadow-2xl hover:shadow-[#866733]/50"
          >
            {loading ? (
              'Chargement...'
            ) : isLogin ? (
              <>
                <LogIn size={20} />
                Se connecter
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Créer un compte
              </>
            )}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(true);
                setError('');
                setSuccess('');
              }}
              className="w-full text-neutral-400 hover:text-neutral-300 text-sm transition"
            >
              Mot de passe oublié ?
            </button>
          )}
        </form>
        )}

        {!isForgotPassword && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              className="text-[#ecd88e] hover:text-[#c4ab63] font-medium transition"
            >
              {isLogin ? "Vous n'avez pas de compte ? Inscrivez-vous" : 'Vous avez déjà un compte ? Connectez-vous'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
