import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MetaSettings {
  site_title: string;
  site_description: string;
  site_keywords: string;
  site_favicon_url: string;
  site_og_image_url: string;
  site_theme_color: string;
}

const DEFAULT_SETTINGS: MetaSettings = {
  site_title: 'Réservation Padel',
  site_description: 'Réservez votre court de padel en ligne',
  site_keywords: 'padel, réservation, court, sport',
  site_favicon_url: '/vite.svg',
  site_og_image_url: '',
  site_theme_color: '#10b981',
};

export function useMetaTags() {
  useEffect(() => {
    const loadAndApplyMetaTags = async () => {
      try {
        const { data } = await supabase
          .from('manifest_settings')
          .select('meta_title, meta_description, meta_keywords, favicon_url, og_image_url, theme_color, name, description')
          .maybeSingle();

        const settings: MetaSettings = {
          site_title: data?.meta_title || data?.name || DEFAULT_SETTINGS.site_title,
          site_description: data?.meta_description || data?.description || DEFAULT_SETTINGS.site_description,
          site_keywords: data?.meta_keywords || DEFAULT_SETTINGS.site_keywords,
          site_favicon_url: data?.favicon_url || DEFAULT_SETTINGS.site_favicon_url,
          site_og_image_url: data?.og_image_url || DEFAULT_SETTINGS.site_og_image_url,
          site_theme_color: data?.theme_color || DEFAULT_SETTINGS.site_theme_color,
        };

        updateMetaTags(settings);
      } catch (error) {
        console.error('Error loading meta tags:', error);
        updateMetaTags(DEFAULT_SETTINGS);
      }
    };

    loadAndApplyMetaTags();
  }, []);
}

function updateMetaTags(settings: MetaSettings) {
  document.title = settings.site_title;
  updateOrCreateMetaTag('og:title', settings.site_title);

  updateOrCreateMetaTag('description', settings.site_description);
  updateOrCreateMetaTag('og:description', settings.site_description);

  updateOrCreateMetaTag('keywords', settings.site_keywords);
  updateOrCreateMetaTag('theme-color', settings.site_theme_color);

  updateFavicon(settings.site_favicon_url);

  if (settings.site_og_image_url) {
    updateOrCreateMetaTag('og:image', settings.site_og_image_url);
  }

  updateOrCreateMetaTag('og:type', 'website');
  updateOrCreateMetaTag('og:url', window.location.href);
  updateOrCreateMetaTag('twitter:card', 'summary_large_image');
}

function updateOrCreateMetaTag(name: string, content: string) {
  const isOpenGraph = name.startsWith('og:');
  const isTwitter = name.startsWith('twitter:');
  const attribute = isOpenGraph || isTwitter ? 'property' : 'name';

  let metaTag = document.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${name}"]`
  );

  if (metaTag) {
    metaTag.content = content;
  } else {
    metaTag = document.createElement('meta');
    metaTag.setAttribute(attribute, name);
    metaTag.content = content;
    document.head.appendChild(metaTag);
  }
}

function updateFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.href = url;

  const type = url.endsWith('.svg') ? 'image/svg+xml' : url.endsWith('.png') ? 'image/png' : 'image/x-icon';
  link.type = type;
}
