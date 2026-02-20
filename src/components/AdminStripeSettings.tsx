import { useState, useEffect } from 'react';
import { CreditCard, Save, Eye, EyeOff, CheckCircle, Copy, Check, ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { StripeSettings, PaymentLog } from '../types';
import { stripeService, paymentService, courtService } from '../services';
import { supabase } from '../lib/supabase';

export function AdminStripeSettings() {
  const [settings, setSettings] = useState<StripeSettings[]>([]);
  const [activeEnvironment, setActiveEnvironment] = useState<'staging' | 'production'>('staging');
  const [stagingSettings, setStagingSettings] = useState({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
  });
  const [productionSettings, setProductionSettings] = useState({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
  });
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [showStagingSecrets, setShowStagingSecrets] = useState(false);
  const [showProductionSecrets, setShowProductionSecrets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testingStaging, setTestingStaging] = useState(false);
  const [testingProduction, setTestingProduction] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [courts, setCourts] = useState<any[]>([]);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`;

  useEffect(() => {
    fetchSettings();
    fetchCourts();
  }, []);

  useEffect(() => {
    fetchPaymentLogs();
  }, [currentPage, startDate, endDate, userSearch, selectedCourtId, selectedStatus]);

  const fetchSettings = async () => {
    try {
      const data = await stripeService.getSettings();
      setSettings(data);

      const staging = data.find(s => s.environment === 'staging');
      const production = data.find(s => s.environment === 'production');

      if (staging) {
        setStagingSettings({
          publishable_key: staging.publishable_key,
          secret_key: staging.secret_key,
          webhook_secret: staging.webhook_secret || '',
        });
        if (staging.is_active) setActiveEnvironment('staging');
      }

      if (production) {
        setProductionSettings({
          publishable_key: production.publishable_key,
          secret_key: production.secret_key,
          webhook_secret: production.webhook_secret || '',
        });
        if (production.is_active) setActiveEnvironment('production');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des paramètres');
    }
  };

  const fetchCourts = async () => {
    try {
      const data = await courtService.getAll();
      setCourts(data);
    } catch (err: any) {
      console.error('Error fetching courts:', err);
    }
  };

  const fetchPaymentLogs = async () => {
    try {
      const { data, count } = await paymentService.getFilteredPaymentLogs({
        page: currentPage,
        pageSize,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userSearch: userSearch || undefined,
        courtId: selectedCourtId || undefined,
        status: selectedStatus || undefined,
      });
      setPaymentLogs(data);
      setTotalCount(count);
    } catch (err: any) {
      console.error('Error fetching payment logs:', err);
    }
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setUserSearch('');
    setSelectedCourtId('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  const handleSaveSettings = async (environment: 'staging' | 'production') => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const settingsToSave = environment === 'staging' ? stagingSettings : productionSettings;

      if (!settingsToSave.publishable_key || !settingsToSave.secret_key) {
        throw new Error('Clé publique et clé secrète sont requises');
      }

      if (!settingsToSave.publishable_key.startsWith('pk_')) {
        throw new Error('❌ La clé publique doit commencer par "pk_test_" ou "pk_live_". Vous avez peut-être inversé les clés.');
      }

      if (!settingsToSave.secret_key.startsWith('sk_')) {
        throw new Error('❌ La clé secrète doit commencer par "sk_test_" ou "sk_live_". Vous avez peut-être inversé les clés.');
      }

      const existingSettings = settings.find(s => s.environment === environment);
      const hasActiveSettings = settings.some(s => s.is_active);

      const shouldActivate = !hasActiveSettings || activeEnvironment === environment;

      await stripeService.upsertSettings({
        environment,
        is_active: shouldActivate,
        publishable_key: settingsToSave.publishable_key,
        secret_key: settingsToSave.secret_key,
        webhook_secret: settingsToSave.webhook_secret || undefined,
      });

      if (shouldActivate && activeEnvironment !== environment) {
        await stripeService.setActiveEnvironment(environment);
        setActiveEnvironment(environment);
      }

      setSuccess(`Paramètres ${environment} enregistrés${shouldActivate ? ' et activés' : ''} avec succès`);
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveEnvironment = async (environment: 'staging' | 'production') => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await stripeService.setActiveEnvironment(environment);
      setActiveEnvironment(environment);
      setSuccess(`Environnement ${environment} activé`);
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleTestKeys = async (environment: 'staging' | 'production') => {
    setError('');
    setSuccess('');

    const isTesting = environment === 'staging';
    if (isTesting) {
      setTestingStaging(true);
    } else {
      setTestingProduction(true);
    }

    try {
      const settingsToTest = environment === 'staging' ? stagingSettings : productionSettings;

      if (!settingsToTest.publishable_key || !settingsToTest.secret_key) {
        throw new Error('Veuillez renseigner les clés avant de tester');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-stripe-keys`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            publishable_key: settingsToTest.publishable_key,
            secret_key: settingsToTest.secret_key,
            environment,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Les clés sont invalides');
      }

      setSuccess(result.message);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du test des clés');
    } finally {
      if (isTesting) {
        setTestingStaging(false);
      } else {
        setTestingProduction(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      succeeded: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-700';
  };

  const formatAmount = (amount: number) => {
    return (amount / 100).toFixed(2) + ' €';
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    } catch (err) {
      console.error('Error copying webhook URL:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="text-emerald-500" size={24} />
          Configuration Stripe
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Configurez vos clés Stripe pour les paiements. Vous pouvez basculer entre l'environnement staging et production.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-2">Environnement actif</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleSetActiveEnvironment('staging')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeEnvironment === 'staging'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-600 hover:bg-blue-100'
            }`}
          >
            Staging
          </button>
          <button
            onClick={() => handleSetActiveEnvironment('production')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeEnvironment === 'production'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-600 hover:bg-blue-100'
            }`}
          >
            Production
          </button>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center gap-2">
          <ExternalLink size={20} />
          Configuration du Webhook Stripe
        </h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-orange-900 mb-2">
              1. URL du webhook à configurer dans Stripe :
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-white border border-orange-300 rounded-lg font-mono text-sm"
              />
              <button
                onClick={copyWebhookUrl}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                {copiedWebhookUrl ? (
                  <>
                    <Check size={18} />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copier
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-orange-900 mb-2">
              2. Événements à sélectionner dans Stripe :
            </p>
            <ul className="space-y-1 text-sm text-orange-800 bg-white rounded-lg p-4 border border-orange-200">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <code className="font-mono bg-orange-100 px-2 py-0.5 rounded">payment_intent.succeeded</code>
                <span className="text-gray-600">- Paiement réussi</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <code className="font-mono bg-orange-100 px-2 py-0.5 rounded">payment_intent.payment_failed</code>
                <span className="text-gray-600">- Paiement échoué</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <code className="font-mono bg-orange-100 px-2 py-0.5 rounded">charge.refunded</code>
                <span className="text-gray-600">- Remboursement</span>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-orange-900 mb-2">
              3. Le Signing Secret :
            </p>
            <p className="text-sm text-orange-800 bg-white rounded-lg p-4 border border-orange-200">
              Après avoir créé le webhook dans Stripe, copiez le <strong>Signing Secret</strong> (commence par <code className="font-mono bg-orange-100 px-1 rounded">whsec_</code>) et collez-le dans le champ "Webhook Secret" ci-dessous.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-lg p-4 border border-orange-200">
            <ExternalLink size={18} className="text-orange-600" />
            <a
              href="https://dashboard.stripe.com/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 font-medium underline"
            >
              Ouvrir le Dashboard Stripe pour configurer les webhooks
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Staging</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clé publique <span className="text-emerald-600 font-mono text-xs">(pk_test_...)</span>
              </label>
              <input
                type="text"
                value={stagingSettings.publishable_key}
                onChange={(e) => setStagingSettings({ ...stagingSettings, publishable_key: e.target.value })}
                placeholder="pk_test_..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Commence par "pk_" - Peut être exposée côté client
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clé secrète <span className="text-red-600 font-mono text-xs">(sk_test_...)</span>
              </label>
              <div className="relative">
                <input
                  type={showStagingSecrets ? 'text' : 'password'}
                  value={stagingSettings.secret_key}
                  onChange={(e) => setStagingSettings({ ...stagingSettings, secret_key: e.target.value })}
                  placeholder="sk_test_..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowStagingSecrets(!showStagingSecrets)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showStagingSecrets ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Commence par "sk_" - Ne jamais exposer côté client
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret (optionnel)
              </label>
              <input
                type={showStagingSecrets ? 'text' : 'password'}
                value={stagingSettings.webhook_secret}
                onChange={(e) => setStagingSettings({ ...stagingSettings, webhook_secret: e.target.value })}
                placeholder="whsec_..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleTestKeys('staging')}
                disabled={testingStaging || !stagingSettings.publishable_key || !stagingSettings.secret_key}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
              >
                <CheckCircle size={18} />
                {testingStaging ? 'Test en cours...' : 'Tester les clés'}
              </button>
              <button
                onClick={() => handleSaveSettings('staging')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
              >
                <Save size={18} />
                Enregistrer Staging
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Production</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clé publique <span className="text-emerald-600 font-mono text-xs">(pk_live_...)</span>
              </label>
              <input
                type="text"
                value={productionSettings.publishable_key}
                onChange={(e) => setProductionSettings({ ...productionSettings, publishable_key: e.target.value })}
                placeholder="pk_live_..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Commence par "pk_" - Peut être exposée côté client
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clé secrète <span className="text-red-600 font-mono text-xs">(sk_live_...)</span>
              </label>
              <div className="relative">
                <input
                  type={showProductionSecrets ? 'text' : 'password'}
                  value={productionSettings.secret_key}
                  onChange={(e) => setProductionSettings({ ...productionSettings, secret_key: e.target.value })}
                  placeholder="sk_live_..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowProductionSecrets(!showProductionSecrets)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showProductionSecrets ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Commence par "sk_" - Ne jamais exposer côté client
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret (optionnel)
              </label>
              <input
                type={showProductionSecrets ? 'text' : 'password'}
                value={productionSettings.webhook_secret}
                onChange={(e) => setProductionSettings({ ...productionSettings, webhook_secret: e.target.value })}
                placeholder="whsec_..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleTestKeys('production')}
                disabled={testingProduction || !productionSettings.publishable_key || !productionSettings.secret_key}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
              >
                <CheckCircle size={18} />
                {testingProduction ? 'Test en cours...' : 'Tester les clés'}
              </button>
              <button
                onClick={() => handleSaveSettings('production')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
              >
                <Save size={18} />
                Enregistrer Production
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Logs de paiement</h3>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Nom, prénom ou username..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terrain
              </label>
              <select
                value={selectedCourtId}
                onChange={(e) => {
                  setSelectedCourtId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Tous les terrains</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="succeeded">Réussi</option>
                <option value="failed">Échoué</option>
                <option value="refunded">Remboursé</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Search size={16} />
              Réinitialiser les filtres
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terrain</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Aucun paiement enregistré
                  </td>
                </tr>
              ) : (
                paymentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.profile?.first_name} {log.profile?.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatAmount(log.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.payment_type === 'full' ? 'Complet' : 'Partiel'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(log.status)}`}>
                        {log.status === 'succeeded' ? 'Réussi' :
                         log.status === 'failed' ? 'Échoué' :
                         log.status === 'pending' ? 'En attente' : 'Remboursé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.booking?.court?.name || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Affichage de {((currentPage - 1) * pageSize) + 1} à {Math.min(currentPage * pageSize, totalCount)} sur {totalCount} paiements
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Précédent
              </button>
              <div className="text-sm text-gray-600">
                Page {currentPage} sur {Math.ceil(totalCount / pageSize)}
              </div>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
