import { useState, useEffect } from 'react';
import { Download, FileJson, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mediaService } from '../services/mediaService';

interface ManifestSettings {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  orientation: string;
  scope: string;
  categories: string[];
  lang: string;
  dir: string;
  icon_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  screenshots: any[];
  features: string[];
  icons: any[];
  shortcuts: any[];
  display_override: string[];
  related_applications: any[];
  prefer_related_applications: boolean;
  launch_handler: any;
  edge_side_panel: any;
}

export function AdminManifestSettings() {
  const [settings, setSettings] = useState<ManifestSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const [displayOverrideInput, setDisplayOverrideInput] = useState('');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('manifest_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err: any) {
      console.error('Error fetching manifest settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('manifest_settings')
        .update({
          name: settings.name,
          short_name: settings.short_name,
          description: settings.description,
          start_url: settings.start_url,
          display: settings.display,
          background_color: settings.background_color,
          theme_color: settings.theme_color,
          orientation: settings.orientation,
          scope: settings.scope,
          categories: settings.categories,
          lang: settings.lang,
          dir: settings.dir,
          icon_url: settings.icon_url,
          meta_title: settings.meta_title,
          meta_description: settings.meta_description,
          meta_keywords: settings.meta_keywords,
          favicon_url: settings.favicon_url,
          og_image_url: settings.og_image_url,
          screenshots: settings.screenshots,
          features: settings.features,
          shortcuts: settings.shortcuts,
          display_override: settings.display_override,
          related_applications: settings.related_applications,
          prefer_related_applications: settings.prefer_related_applications,
          launch_handler: settings.launch_handler,
          edge_side_panel: settings.edge_side_panel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;
      setSuccess('Paramètres sauvegardés avec succès');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    setUploadingIcon(true);
    setError('');

    try {
      const url = await mediaService.uploadFile(file, 'pwa-icon');
      setSettings({ ...settings, icon_url: url });
      setSuccess('Icône téléchargée avec succès');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleRemoveIcon = async () => {
    if (!settings?.icon_url) return;

    try {
      const path = mediaService.extractPathFromUrl(settings.icon_url);
      if (path) {
        await mediaService.deleteFile(path);
      }
      setSettings({ ...settings, icon_url: null });
      setSuccess('Icône supprimée avec succès');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    setUploadingFavicon(true);
    setError('');

    try {
      const url = await mediaService.uploadFile(file, 'favicon');
      setSettings({ ...settings, favicon_url: url });
      setSuccess('Favicon téléchargé avec succès');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleRemoveFavicon = async () => {
    if (!settings?.favicon_url) return;

    try {
      const path = mediaService.extractPathFromUrl(settings.favicon_url);
      if (path) {
        await mediaService.deleteFile(path);
      }
      setSettings({ ...settings, favicon_url: null });
      setSuccess('Favicon supprimé avec succès');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    setUploadingOgImage(true);
    setError('');

    try {
      const url = await mediaService.uploadFile(file, 'og-image');
      setSettings({ ...settings, og_image_url: url });
      setSuccess('Image Open Graph téléchargée avec succès');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingOgImage(false);
    }
  };

  const handleRemoveOgImage = async () => {
    if (!settings?.og_image_url) return;

    try {
      const path = mediaService.extractPathFromUrl(settings.og_image_url);
      if (path) {
        await mediaService.deleteFile(path);
      }
      setSettings({ ...settings, og_image_url: null });
      setSuccess('Image Open Graph supprimée avec succès');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDownloadManifest = async () => {
    try {
      // Télécharger le manifest.json généré depuis le build
      const response = await fetch('/manifest.json');
      if (!response.ok) {
        throw new Error('Manifest non trouvé. Veuillez effectuer un build pour le générer.');
      }

      const manifestData = await response.json();
      const blob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'manifest.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddCategory = () => {
    if (!categoryInput.trim() || !settings) return;
    setSettings({
      ...settings,
      categories: [...settings.categories, categoryInput.trim()]
    });
    setCategoryInput('');
  };

  const handleRemoveCategory = (index: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      categories: settings.categories.filter((_, i) => i !== index)
    });
  };

  const handleAddFeature = () => {
    if (!featureInput.trim() || !settings) return;
    setSettings({
      ...settings,
      features: [...(settings.features || []), featureInput.trim()]
    });
    setFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      features: settings.features.filter((_, i) => i !== index)
    });
  };

  const handleAddDisplayOverride = () => {
    if (!displayOverrideInput.trim() || !settings) return;
    setSettings({
      ...settings,
      display_override: [...(settings.display_override || []), displayOverrideInput.trim()]
    });
    setDisplayOverrideInput('');
  };

  const handleRemoveDisplayOverride = (index: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      display_override: settings.display_override.filter((_, i) => i !== index)
    });
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    setUploadingScreenshot(true);
    setError('');

    try {
      const url = await mediaService.uploadFile(file, 'screenshots');

      const img = new Image();
      img.onload = () => {
        const newScreenshot = {
          src: url,
          sizes: `${img.width}x${img.height}`,
          type: file.type,
          form_factor: img.width > img.height ? 'wide' : 'narrow'
        };

        setSettings({
          ...settings,
          screenshots: [...(settings.screenshots || []), newScreenshot]
        });
        setSuccess('Screenshot ajouté avec succès');
        setUploadingScreenshot(false);
      };

      img.onerror = () => {
        setError('Erreur lors du chargement de l\'image');
        setUploadingScreenshot(false);
      };

      img.src = url;
    } catch (err: any) {
      setError(err.message);
      setUploadingScreenshot(false);
    }
  };

  const handleRemoveScreenshot = async (index: number) => {
    if (!settings) return;

    const screenshot = settings.screenshots[index];
    if (screenshot?.src) {
      try {
        const path = mediaService.extractPathFromUrl(screenshot.src);
        if (path) {
          await mediaService.deleteFile(path);
        }
      } catch (err: any) {
        console.error('Error deleting screenshot:', err);
      }
    }

    setSettings({
      ...settings,
      screenshots: settings.screenshots.filter((_, i) => i !== index)
    });
    setSuccess('Screenshot supprimé avec succès');
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileJson className="text-blue-600" size={24} />
              Configuration du Manifest PWA
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configurez les paramètres de votre application pour la publier sur iOS et Android
            </p>
          </div>
          <button
            onClick={handleDownloadManifest}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            Télécharger manifest.json
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800 mb-1">
                Rebuild nécessaire après modification
              </h3>
              <p className="text-sm text-amber-700">
                Les modifications apportées aux meta tags, icônes et screenshots nécessitent un rebuild de l'application pour être prises en compte.
                Après avoir sauvegardé vos modifications, vous devrez lancer la commande <code className="bg-amber-100 px-2 py-0.5 rounded font-mono text-xs">npm run build</code> sur le serveur et redéployer l'application.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-lg text-sm mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Meta Tags SEO</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ces informations apparaissent dans les résultats de recherche et lors du partage sur les réseaux sociaux.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre de la page (Title Tag)
                </label>
                <input
                  type="text"
                  value={settings.meta_title || ''}
                  onChange={(e) => setSettings({ ...settings, meta_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Réservation Padel - Votre Club"
                />
                <p className="text-xs text-gray-500 mt-1">Affiché dans l'onglet du navigateur et les résultats Google</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  value={settings.meta_description || ''}
                  onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Ex: Réservez votre court de padel en ligne facilement"
                />
                <p className="text-xs text-gray-500 mt-1">Description affichée dans les résultats de recherche (155 caractères max recommandé)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mots-clés (Keywords)
                </label>
                <input
                  type="text"
                  value={settings.meta_keywords || ''}
                  onChange={(e) => setSettings({ ...settings, meta_keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: padel, réservation, court, sport"
                />
                <p className="text-xs text-gray-500 mt-1">Mots-clés séparés par des virgules</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Favicon
                  </label>
                  {settings.favicon_url ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={settings.favicon_url}
                        alt="Favicon"
                        className="w-8 h-8 object-cover rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveFavicon}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                      <div className="flex flex-col items-center">
                        <Upload className="w-5 h-5 mb-1 text-gray-500" />
                        <p className="text-xs text-gray-500">PNG 32x32px</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFaviconUpload}
                        disabled={uploadingFavicon}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Open Graph
                  </label>
                  {settings.og_image_url ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={settings.og_image_url}
                        alt="OG Image"
                        className="w-20 h-10 object-cover rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveOgImage}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                      <div className="flex flex-col items-center">
                        <Upload className="w-5 h-5 mb-1 text-gray-500" />
                        <p className="text-xs text-gray-500">PNG 1200x630px</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleOgImageUpload}
                        disabled={uploadingOgImage}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration PWA</h3>
            <p className="text-sm text-gray-600 mb-4">
              Paramètres pour l'installation de l'application sur mobile.
            </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet de l'application
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom court (écran d'accueil)
              </label>
              <input
                type="text"
                value={settings.short_name}
                onChange={(e) => setSettings({ ...settings, short_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={12}
              />
              <p className="text-xs text-gray-500 mt-1">Maximum 12 caractères</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL de démarrage
              </label>
              <input
                type="text"
                value={settings.start_url}
                onChange={(e) => setSettings({ ...settings, start_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scope
              </label>
              <input
                type="text"
                value={settings.scope}
                onChange={(e) => setSettings({ ...settings, scope: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode d'affichage
              </label>
              <select
                value={settings.display}
                onChange={(e) => setSettings({ ...settings, display: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="standalone">Standalone (recommandé)</option>
                <option value="fullscreen">Plein écran</option>
                <option value="minimal-ui">Minimal UI</option>
                <option value="browser">Navigateur</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Orientation
              </label>
              <select
                value={settings.orientation}
                onChange={(e) => setSettings({ ...settings, orientation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="any">Toutes</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Paysage</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur de fond
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.background_color}
                  onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                  className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.background_color}
                  onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur du thème
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.theme_color}
                  onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                  className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.theme_color}
                  onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Langue
              </label>
              <input
                type="text"
                value={settings.lang}
                onChange={(e) => setSettings({ ...settings, lang: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="fr"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Direction du texte
              </label>
              <select
                value={settings.dir}
                onChange={(e) => setSettings({ ...settings, dir: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ltr">Gauche à droite (LTR)</option>
                <option value="rtl">Droite à gauche (RTL)</option>
                <option value="auto">Automatique</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégories
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ajouter une catégorie (ex: sports, lifestyle)"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.categories.map((category, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(index)}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Icône de l'application PWA</h3>
            <p className="text-sm text-gray-600 mb-2">
              Téléchargez une icône dédiée pour votre application mobile. Format PNG recommandé, taille minimum 512x512px.
            </p>
            <p className="text-sm text-emerald-600 font-medium mb-4">
              Lors du build, 8 tailles d'icônes seront automatiquement générées à partir de cette image.
            </p>

            {settings.icon_url ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={settings.icon_url}
                    alt="Icône PWA"
                    className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveIcon}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <X size={18} />
                    Supprimer l'icône
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-medium">Cliquez pour télécharger</span> ou glissez-déposez
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG (512x512px recommandé)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleIconUpload}
                    disabled={uploadingIcon}
                  />
                </label>
                {uploadingIcon && (
                  <div className="flex items-center justify-center mt-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Téléchargement...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres Avancés PWA</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configuration avancée pour les fonctionnalités PWA supplémentaires.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Features (caractéristiques de l'app)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Cross Platform, low-latency, AI"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.features?.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {feature}
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="text-green-700 hover:text-green-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Override (modes d'affichage prioritaires)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={displayOverrideInput}
                    onChange={(e) => setDisplayOverrideInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDisplayOverride())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: window-controls-overlay, standalone"
                  />
                  <button
                    type="button"
                    onClick={handleAddDisplayOverride}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.display_override?.map((mode, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {mode}
                      <button
                        type="button"
                        onClick={() => handleRemoveDisplayOverride(index)}
                        className="text-purple-700 hover:text-purple-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Screenshots de l'application
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Ajoutez des captures d'écran de votre application. Elles seront affichées dans les stores d'applications.
                </p>
                <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
                  <strong>Automatique:</strong> Les screenshots uploadés ici seront automatiquement inclus dans le manifest.json lors du build.
                </div>

                <div className="space-y-3">
                  {settings.screenshots && settings.screenshots.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {settings.screenshots.map((screenshot: any, index: number) => (
                        <div key={index} className="relative group">
                          <img
                            src={screenshot.src}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute top-1 right-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveScreenshot(index)}
                              className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {screenshot.sizes} • {screenshot.form_factor || 'standard'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-medium">Cliquez pour ajouter un screenshot</span>
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG (recommandé 1280x720 ou 750x1334)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      disabled={uploadingScreenshot}
                    />
                  </label>

                  {uploadingScreenshot && (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Upload en cours...</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shortcuts (JSON Array)
                </label>
                <textarea
                  value={JSON.stringify(settings.shortcuts || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setSettings({ ...settings, shortcuts: parsed });
                    } catch {}
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  rows={8}
                  placeholder='[{"name": "Action", "url": "/action", "icons": [{"src": "/icon.png", "sizes": "96x96"}]}]'
                />
                <p className="text-xs text-gray-500 mt-1">Format: array d'objets avec name, url, icons</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Launch Handler (JSON Object)
                  </label>
                  <textarea
                    value={JSON.stringify(settings.launch_handler || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setSettings({ ...settings, launch_handler: parsed });
                      } catch {}
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={3}
                    placeholder='{"client_mode": "navigate-existing"}'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Related Applications (JSON Array)
                  </label>
                  <textarea
                    value={JSON.stringify(settings.related_applications || [], null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setSettings({ ...settings, related_applications: parsed });
                      } catch {}
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={3}
                    placeholder='[]'
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prefer_related"
                  checked={settings.prefer_related_applications || false}
                  onChange={(e) => setSettings({ ...settings, prefer_related_applications: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="prefer_related" className="text-sm text-gray-700">
                  Préférer les applications natives associées
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
