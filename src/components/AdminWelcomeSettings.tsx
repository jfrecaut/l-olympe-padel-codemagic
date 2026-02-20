import { useState, useEffect } from 'react';
import { Image, Video, Save, AlertCircle, CheckCircle, Upload, Trash2, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mediaService } from '../services/mediaService';

interface WelcomeSettings {
  welcome_video_url: string;
  welcome_video_mobile_url: string;
  welcome_banner_url: string;
  welcome_banner_mobile_url: string;
  company_logo_url: string;
  company_logo_dark_url: string;
}

export default function AdminWelcomeSettings() {
  const [settings, setSettings] = useState<WelcomeSettings>({
    welcome_video_url: '',
    welcome_video_mobile_url: '',
    welcome_banner_url: '',
    welcome_banner_mobile_url: '',
    company_logo_url: '',
    company_logo_dark_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          welcome_video_url: data.welcome_video_url || '',
          welcome_video_mobile_url: data.welcome_video_mobile_url || '',
          welcome_banner_url: data.welcome_banner_url || '',
          welcome_banner_mobile_url: data.welcome_banner_mobile_url || '',
          company_logo_url: data.company_logo_url || '',
          company_logo_dark_url: data.company_logo_dark_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des paramètres' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    file: File,
    type: 'video-desktop' | 'video-mobile' | 'banner-desktop' | 'banner-mobile' | 'logo-light' | 'logo-dark'
  ) => {
    setUploading(type);
    setMessage(null);

    try {
      let result;
      let oldUrl = '';

      if (type === 'video-desktop') {
        oldUrl = settings.welcome_video_url;
        result = await mediaService.uploadVideo(file, 'desktop');
        setSettings({ ...settings, welcome_video_url: result.url });
      } else if (type === 'video-mobile') {
        oldUrl = settings.welcome_video_mobile_url;
        result = await mediaService.uploadVideo(file, 'mobile');
        setSettings({ ...settings, welcome_video_mobile_url: result.url });
      } else if (type === 'banner-desktop') {
        oldUrl = settings.welcome_banner_url;
        result = await mediaService.uploadBanner(file, 'desktop');
        setSettings({ ...settings, welcome_banner_url: result.url });
      } else if (type === 'banner-mobile') {
        oldUrl = settings.welcome_banner_mobile_url;
        result = await mediaService.uploadBanner(file, 'mobile');
        setSettings({ ...settings, welcome_banner_mobile_url: result.url });
      } else if (type === 'logo-light') {
        oldUrl = settings.company_logo_url;
        result = await mediaService.uploadLogo(file);
        setSettings({ ...settings, company_logo_url: result.url });
      } else if (type === 'logo-dark') {
        oldUrl = settings.company_logo_dark_url;
        result = await mediaService.uploadLogo(file);
        setSettings({ ...settings, company_logo_dark_url: result.url });
      }

      if (oldUrl) {
        const oldPath = mediaService.extractPathFromUrl(oldUrl);
        if (oldPath) {
          try {
            await mediaService.deleteFile(oldPath);
          } catch (err) {
            console.error('Error deleting old file:', err);
          }
        }
      }

      setMessage({ type: 'success', text: 'Fichier uploadé avec succès. N\'oubliez pas d\'enregistrer !' });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setMessage({ type: 'error', text: error.message || "Erreur lors de l'upload du fichier" });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteMedia = async (type: 'video-desktop' | 'video-mobile' | 'banner-desktop' | 'banner-mobile' | 'logo-light' | 'logo-dark') => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) return;

    setMessage(null);

    try {
      let url = '';
      if (type === 'video-desktop') url = settings.welcome_video_url;
      else if (type === 'video-mobile') url = settings.welcome_video_mobile_url;
      else if (type === 'banner-desktop') url = settings.welcome_banner_url;
      else if (type === 'banner-mobile') url = settings.welcome_banner_mobile_url;
      else if (type === 'logo-light') url = settings.company_logo_url;
      else if (type === 'logo-dark') url = settings.company_logo_dark_url;

      if (url) {
        const path = mediaService.extractPathFromUrl(url);
        if (path) {
          await mediaService.deleteFile(path);
        }
      }

      if (type === 'video-desktop') {
        setSettings({ ...settings, welcome_video_url: '' });
      } else if (type === 'video-mobile') {
        setSettings({ ...settings, welcome_video_mobile_url: '' });
      } else if (type === 'banner-desktop') {
        setSettings({ ...settings, welcome_banner_url: '' });
      } else if (type === 'banner-mobile') {
        setSettings({ ...settings, welcome_banner_mobile_url: '' });
      } else if (type === 'logo-light') {
        setSettings({ ...settings, company_logo_url: '' });
      } else if (type === 'logo-dark') {
        setSettings({ ...settings, company_logo_dark_url: '' });
      }

      setMessage({ type: 'success', text: 'Fichier supprimé. N\'oubliez pas d\'enregistrer !' });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la suppression du fichier' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: existingSettings } = await supabase
        .from('settings')
        .select('id')
        .maybeSingle();

      if (existingSettings) {
        const { error } = await supabase
          .from('settings')
          .update({
            welcome_video_url: settings.welcome_video_url || null,
            welcome_video_mobile_url: settings.welcome_video_mobile_url || null,
            welcome_banner_url: settings.welcome_banner_url || null,
            welcome_banner_mobile_url: settings.welcome_banner_mobile_url || null,
            company_logo_url: settings.company_logo_url || null,
            company_logo_dark_url: settings.company_logo_dark_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('settings').insert({
          welcome_video_url: settings.welcome_video_url || null,
          welcome_video_mobile_url: settings.welcome_video_mobile_url || null,
          welcome_banner_url: settings.welcome_banner_url || null,
          welcome_banner_mobile_url: settings.welcome_banner_mobile_url || null,
          company_logo_url: settings.company_logo_url || null,
          company_logo_dark_url: settings.company_logo_dark_url || null,
        });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Paramètres enregistrés avec succès' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: "Erreur lors de l'enregistrement des paramètres" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <Video className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Médias d'accueil</h2>
          <p className="text-slate-600">Personnalisez les logos, vidéos et bannières de votre application</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Logos de l'entreprise
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo thème clair (interface administration)
              </label>
              {settings.company_logo_url ? (
                <div className="space-y-3">
                  <div className="relative w-full h-32 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                    <img
                      src={settings.company_logo_url}
                      alt="Logo entreprise thème clair"
                      className="max-h-28 max-w-full object-contain"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteMedia('logo-light')}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer le logo clair
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'logo-light');
                      e.target.value = '';
                    }}
                    disabled={uploading === 'logo-light'}
                    className="hidden"
                    id="logo-light-upload"
                  />
                  <label
                    htmlFor="logo-light-upload"
                    className={`w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      uploading === 'logo-light' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    {uploading === 'logo-light' ? 'Upload en cours...' : 'Uploader un logo (PNG, SVG, JPG, WebP)'}
                  </label>
                </div>
              )}
              <p className="mt-2 text-sm text-slate-500">
                PNG transparent recommandé, dimensions 200x60px environ, adapté aux fonds clairs
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo thème sombre (interface client)
              </label>
              {settings.company_logo_dark_url ? (
                <div className="space-y-3">
                  <div className="relative w-full h-32 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700">
                    <img
                      src={settings.company_logo_dark_url}
                      alt="Logo entreprise thème sombre"
                      className="max-h-28 max-w-full object-contain"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteMedia('logo-dark')}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer le logo sombre
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'logo-dark');
                      e.target.value = '';
                    }}
                    disabled={uploading === 'logo-dark'}
                    className="hidden"
                    id="logo-dark-upload"
                  />
                  <label
                    htmlFor="logo-dark-upload"
                    className={`w-full px-4 py-3 border-2 border-dashed border-slate-700 bg-slate-900 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      uploading === 'logo-dark' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-5 h-5 text-slate-300" />
                    <span className="text-slate-300">
                      {uploading === 'logo-dark' ? 'Upload en cours...' : 'Uploader un logo (PNG, SVG, JPG, WebP)'}
                    </span>
                  </label>
                </div>
              )}
              <p className="mt-2 text-sm text-slate-500">
                PNG transparent recommandé, dimensions 200x60px environ, adapté aux fonds sombres
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Vidéo page d'accueil (50% hauteur)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Vidéo Desktop
              </label>
              {settings.welcome_video_url ? (
                <div className="space-y-3">
                  <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden">
                    <video
                      src={settings.welcome_video_url}
                      className="w-full h-full object-cover"
                      controls
                      loop
                      muted
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteMedia('video-desktop')}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer la vidéo desktop
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="video/mp4"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'video-desktop');
                      e.target.value = '';
                    }}
                    disabled={uploading === 'video-desktop'}
                    className="hidden"
                    id="video-desktop-upload"
                  />
                  <label
                    htmlFor="video-desktop-upload"
                    className={`w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      uploading === 'video-desktop' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    {uploading === 'video-desktop' ? 'Upload en cours...' : 'Uploader une vidéo (MP4)'}
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Vidéo Mobile (Optionnel)
              </label>
              {settings.welcome_video_mobile_url ? (
                <div className="space-y-3">
                  <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden">
                    <video
                      src={settings.welcome_video_mobile_url}
                      className="w-full h-full object-cover"
                      controls
                      loop
                      muted
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteMedia('video-mobile')}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer la vidéo mobile
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="video/mp4"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'video-mobile');
                      e.target.value = '';
                    }}
                    disabled={uploading === 'video-mobile'}
                    className="hidden"
                    id="video-mobile-upload"
                  />
                  <label
                    htmlFor="video-mobile-upload"
                    className={`w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      uploading === 'video-mobile' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    {uploading === 'video-mobile' ? 'Upload en cours...' : 'Uploader une vidéo mobile (MP4)'}
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Image className="w-5 h-5 text-blue-600" />
            Bannière autres pages (header)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Image Bannière Desktop
              </label>
              {settings.welcome_banner_url ? (
                <div className="space-y-3">
                  <div className="relative w-full h-48 bg-slate-900 rounded-lg overflow-hidden">
                    <img
                      src={settings.welcome_banner_url}
                      alt="Aperçu bannière desktop"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteMedia('banner-desktop')}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer la bannière desktop
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'banner-desktop');
                      e.target.value = '';
                    }}
                    disabled={uploading === 'banner-desktop'}
                    className="hidden"
                    id="banner-desktop-upload"
                  />
                  <label
                    htmlFor="banner-desktop-upload"
                    className={`w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      uploading === 'banner-desktop' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    {uploading === 'banner-desktop' ? 'Upload en cours...' : 'Uploader une image (JPG, PNG, WebP, GIF)'}
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Image Bannière Mobile (Optionnel)
              </label>
              {settings.welcome_banner_mobile_url ? (
                <div className="space-y-3">
                  <div className="relative w-full h-48 bg-slate-900 rounded-lg overflow-hidden">
                    <img
                      src={settings.welcome_banner_mobile_url}
                      alt="Aperçu bannière mobile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteMedia('banner-mobile')}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer la bannière mobile
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'banner-mobile');
                      e.target.value = '';
                    }}
                    disabled={uploading === 'banner-mobile'}
                    className="hidden"
                    id="banner-mobile-upload"
                  />
                  <label
                    htmlFor="banner-mobile-upload"
                    className={`w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      uploading === 'banner-mobile' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    {uploading === 'banner-mobile' ? 'Upload en cours...' : 'Uploader une image mobile (JPG, PNG, WebP, GIF)'}
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Conseils</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>Logo clair :</strong> PNG transparent, dimensions 200x60px, affiché dans l'interface d'administration</li>
          <li><strong>Logo sombre :</strong> PNG transparent, dimensions 200x60px, affiché dans l'interface client</li>
          <li><strong>Vidéo :</strong> Format MP4, durée 10-20 secondes, affichée sur 50% de l'écran d'accueil</li>
          <li><strong>Bannière :</strong> JPG/PNG/WebP/GIF, dimensions recommandées 1920x200px (desktop), 800x300px (mobile)</li>
          <li>Le logo clair s'adapte aux fonds clairs, le logo sombre aux fonds sombres</li>
          <li>La vidéo est pour l'écran d'accueil uniquement</li>
          <li>La bannière apparaît en header des pages réservations</li>
          <li>Taille maximale : 50 MB par fichier</li>
        </ul>
      </div>
    </div>
  );
}
