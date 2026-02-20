import { useState, useEffect } from 'react';
import { Save, Mail, RefreshCw, Copy, Check, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BrevoSettings {
  id: string;
  api_key: string;
  template_account_created: number | null;
  template_booking_created: number | null;
  template_booking_cancelled: number | null;
  template_participant_added: number | null;
  template_participant_accepted: number | null;
  template_participant_declined: number | null;
  template_refund_approved: number | null;
  template_refund_rejected: number | null;
  template_password_reset: number | null;
  sender_email: string;
  sender_name: string;
}

interface BrevoTemplate {
  id: number;
  name: string;
  subject: string;
}

interface TemplateVariables {
  [key: string]: string[];
}

const templateVariables: TemplateVariables = {
  template_account_created: ['username', 'first_name', 'last_name'],
  template_booking_created: ['court_name', 'booking_date', 'start_time', 'end_time', 'first_name', 'last_name'],
  template_booking_cancelled: ['court_name', 'booking_date', 'start_time', 'end_time', 'first_name', 'last_name'],
  template_participant_added: ['court_name', 'booking_date', 'start_time', 'end_time', 'organizer_first_name', 'organizer_last_name', 'participant_first_name', 'participant_last_name'],
  template_participant_accepted: ['court_name', 'booking_date', 'start_time', 'end_time', 'organizer_first_name', 'organizer_last_name', 'participant_first_name', 'participant_last_name'],
  template_participant_declined: ['court_name', 'booking_date', 'start_time', 'end_time', 'organizer_first_name', 'organizer_last_name', 'participant_first_name', 'participant_last_name'],
  template_refund_approved: ['first_name', 'last_name', 'booking_date', 'start_time', 'end_time', 'court_name', 'amount'],
  template_refund_rejected: ['first_name', 'last_name', 'booking_date', 'start_time', 'end_time', 'court_name', 'amount', 'rejection_reason'],
  template_password_reset: ['first_name', 'last_name', 'username', 'temporary_password'],
};

export function AdminBrevoSettings() {
  const [settings, setSettings] = useState<BrevoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [templates, setTemplates] = useState<BrevoTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testEventType, setTestEventType] = useState('account_created');
  const [sendingTest, setSendingTest] = useState(false);

  const [formData, setFormData] = useState({
    api_key: '',
    template_account_created: '',
    template_booking_created: '',
    template_booking_cancelled: '',
    template_participant_added: '',
    template_participant_accepted: '',
    template_participant_declined: '',
    template_refund_approved: '',
    template_refund_rejected: '',
    template_password_reset: '',
    sender_email: '',
    sender_name: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('brevo_settings')
        .select('*')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings(data);
        setFormData({
          api_key: data.api_key || '',
          template_account_created: data.template_account_created?.toString() || '',
          template_booking_created: data.template_booking_created?.toString() || '',
          template_booking_cancelled: data.template_booking_cancelled?.toString() || '',
          template_participant_added: data.template_participant_added?.toString() || '',
          template_participant_accepted: data.template_participant_accepted?.toString() || '',
          template_participant_declined: data.template_participant_declined?.toString() || '',
          template_refund_approved: data.template_refund_approved?.toString() || '',
          template_refund_rejected: data.template_refund_rejected?.toString() || '',
          template_password_reset: data.template_password_reset?.toString() || '',
          sender_email: data.sender_email || '',
          sender_name: data.sender_name || '',
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const updateData = {
        api_key: formData.api_key,
        template_account_created: formData.template_account_created ? parseInt(formData.template_account_created) : null,
        template_booking_created: formData.template_booking_created ? parseInt(formData.template_booking_created) : null,
        template_booking_cancelled: formData.template_booking_cancelled ? parseInt(formData.template_booking_cancelled) : null,
        template_participant_added: formData.template_participant_added ? parseInt(formData.template_participant_added) : null,
        template_participant_accepted: formData.template_participant_accepted ? parseInt(formData.template_participant_accepted) : null,
        template_participant_declined: formData.template_participant_declined ? parseInt(formData.template_participant_declined) : null,
        template_refund_approved: formData.template_refund_approved ? parseInt(formData.template_refund_approved) : null,
        template_refund_rejected: formData.template_refund_rejected ? parseInt(formData.template_refund_rejected) : null,
        template_password_reset: formData.template_password_reset ? parseInt(formData.template_password_reset) : null,
        sender_email: formData.sender_email,
        sender_name: formData.sender_name,
      };

      if (settings) {
        const { error: updateError } = await supabase
          .from('brevo_settings')
          .update(updateData)
          .eq('id', settings.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('brevo_settings')
          .insert(updateData);

        if (insertError) throw insertError;
      }

      setSuccess('Configuration Brevo enregistrée avec succès');
      await fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = async (variable: string) => {
    try {
      await navigator.clipboard.writeText(`{{ params.${variable} }}`);
      setCopiedVariable(variable);
      setTimeout(() => setCopiedVariable(null), 2000);
    } catch (err) {
    }
  };

  const loadTemplates = async () => {
    if (!formData.api_key) {
      setError('Veuillez d\'abord entrer votre clé API Brevo');
      return;
    }

    setLoadingTemplates(true);
    setError('');

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/templates', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': formData.api_key,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la récupération des templates');
      }

      const data = await response.json();
      const templateList = data.templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        subject: t.subject || '',
      }));

      setTemplates(templateList);
      setSuccess(`${templateList.length} templates chargés avec succès`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération des templates');
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setError('Veuillez entrer une adresse email');
      return;
    }

    setSendingTest(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Session expirée');
      }

      const testParams = {
        username: 'test_user',
        first_name: 'Test',
        last_name: 'User',
        court_name: 'Court Central',
        booking_date: '2024-01-15',
        start_time: '14:00',
        end_time: '15:30',
        organizer_first_name: 'John',
        organizer_last_name: 'Doe',
        participant_first_name: 'Jane',
        participant_last_name: 'Smith',
        amount: '25.00',
        rejection_reason: 'Délai de remboursement dépassé',
        temporary_password: 'TempPass123',
      };

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          eventType: testEventType,
          params: testParams,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'envoi du mail de test');
      }

      setSuccess(`Email de test envoyé avec succès à ${testEmail}`);
      setTestEmail('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi du mail de test');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuration Brevo</h2>
            <p className="text-sm text-gray-600">Configurez l'envoi d'emails via Brevo</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Paramètres de connexion</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clé API Brevo *
              </label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => handleChange('api_key', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="xkeysib-..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Trouvez votre clé API dans votre compte Brevo : Paramètres → Clés API
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email expéditeur *
                </label>
                <input
                  type="email"
                  value={formData.sender_email}
                  onChange={(e) => handleChange('sender_email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="noreply@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom expéditeur *
                </label>
                <input
                  type="text"
                  value={formData.sender_name}
                  onChange={(e) => handleChange('sender_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Padel Club"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Templates Brevo</h3>
                <p className="text-sm text-gray-600">
                  Associez un template Brevo à chaque type d'email. Laissez vide pour désactiver l'envoi.
                </p>
              </div>
              <button
                type="button"
                onClick={loadTemplates}
                disabled={loadingTemplates || !formData.api_key}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={loadingTemplates ? 'animate-spin' : ''} />
                {loadingTemplates ? 'Chargement...' : 'Charger les templates'}
              </button>
            </div>

            <div className="grid gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Création de compte client
                </label>
                <select
                  value={formData.template_account_created}
                  onChange={(e) => handleChange('template_account_created', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Aucun template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} - {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Envoyé au nouveau joueur lors de la création de son compte
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Variables disponibles :</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVariables.template_account_created.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyToClipboard(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition border border-blue-200"
                      >
                        <code className="font-mono">{`{{ params.${variable} }}`}</code>
                        {copiedVariable === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Réservation de court
                </label>
                <select
                  value={formData.template_booking_created}
                  onChange={(e) => handleChange('template_booking_created', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Aucun template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} - {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Envoyé à l'organisateur lors de la création d'une réservation
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Variables disponibles :</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVariables.template_booking_created.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyToClipboard(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition border border-blue-200"
                      >
                        <code className="font-mono">{`{{ params.${variable} }}`}</code>
                        {copiedVariable === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annulation de réservation
                </label>
                <select
                  value={formData.template_booking_cancelled}
                  onChange={(e) => handleChange('template_booking_cancelled', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Aucun template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} - {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Envoyé à l'organisateur et aux participants lors de l'annulation d'une réservation
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Variables disponibles :</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVariables.template_booking_cancelled.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyToClipboard(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition border border-blue-200"
                      >
                        <code className="font-mono">{`{{ params.${variable} }}`}</code>
                        {copiedVariable === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ajout d'un participant
                </label>
                <select
                  value={formData.template_participant_added}
                  onChange={(e) => handleChange('template_participant_added', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Aucun template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} - {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Envoyé au participant lorsqu'il est ajouté à une réservation
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Variables disponibles :</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVariables.template_participant_added.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyToClipboard(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition border border-blue-200"
                      >
                        <code className="font-mono">{`{{ params.${variable} }}`}</code>
                        {copiedVariable === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acceptation de participant
                </label>
                <select
                  value={formData.template_participant_accepted}
                  onChange={(e) => handleChange('template_participant_accepted', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Aucun template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} - {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Envoyé à l'organisateur lorsqu'un participant accepte l'invitation
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Variables disponibles :</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVariables.template_participant_accepted.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyToClipboard(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition border border-blue-200"
                      >
                        <code className="font-mono">{`{{ params.${variable} }}`}</code>
                        {copiedVariable === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refus de participant
                </label>
                <select
                  value={formData.template_participant_declined}
                  onChange={(e) => handleChange('template_participant_declined', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Aucun template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} - {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Envoyé à l'organisateur lorsqu'un participant refuse l'invitation
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Variables disponibles :</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVariables.template_participant_declined.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyToClipboard(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition border border-blue-200"
                      >
                        <code className="font-mono">{`{{ params.${variable} }}`}</code>
                        {copiedVariable === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remboursement approuvé
                </label>
                <select
                  value={formData.template_refund_approved}
                  onChange={(e) => handleChange('template_refund_approved', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Aucun template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} - {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Envoyé à l'organisateur lorsque sa demande de remboursement est approuvée
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Variables disponibles :</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVariables.template_refund_approved.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyToClipboard(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition border border-blue-200"
                      >
                        <code className="font-mono">{`{{ params.${variable} }}`}</code>
                        {copiedVariable === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remboursement refusé
                </label>
                <select
                  value={formData.template_refund_rejected}
                  onChange={(e) => handleChange('template_refund_rejected', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Aucun template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} - {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Envoyé à l'organisateur lorsque sa demande de remboursement est refusée
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Variables disponibles :</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVariables.template_refund_rejected.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyToClipboard(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition border border-blue-200"
                      >
                        <code className="font-mono">{`{{ params.${variable} }}`}</code>
                        {copiedVariable === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Réinitialisation de mot de passe
                </label>
                <select
                  value={formData.template_password_reset}
                  onChange={(e) => handleChange('template_password_reset', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Aucun template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} - {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Envoyé au joueur lorsqu'il demande un nouveau mot de passe
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Variables disponibles :</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVariables.template_password_reset.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyToClipboard(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100 transition border border-blue-200"
                      >
                        <code className="font-mono">{`{{ params.${variable} }}`}</code>
                        {copiedVariable === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Tester l'envoi d'email</h3>
              <p className="text-sm text-gray-600 mb-4">
                Envoyez un email de test pour vérifier votre configuration Brevo
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse email de test
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'email à tester
                  </label>
                  <select
                    value={testEventType}
                    onChange={(e) => setTestEventType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="account_created">Création de compte</option>
                    <option value="booking_created">Réservation créée</option>
                    <option value="booking_cancelled">Réservation annulée</option>
                    <option value="participant_added">Participant ajouté</option>
                    <option value="participant_accepted">Participant accepté</option>
                    <option value="participant_declined">Participant refusé</option>
                    <option value="refund_approved">Remboursement approuvé</option>
                    <option value="refund_rejected">Remboursement refusé</option>
                    <option value="password_reset">Réinitialisation de mot de passe</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={sendTestEmail}
                  disabled={sendingTest || !testEmail || !settings}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  {sendingTest ? 'Envoi en cours...' : 'Envoyer l\'email de test'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
