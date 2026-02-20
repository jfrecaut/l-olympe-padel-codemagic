import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/*function loadEnv() {
  const envPath = join(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });

  return env;
}*/

function loadEnv() {
  const envPath = join(__dirname, '../.env');
  const env = {};

  if (!existsSync(envPath)) {
    console.log('.env file not found, using process.env only');
    return env;
  }

  const envContent = readFileSync(envPath, 'utf-8');

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });

  return env;
}

const env = loadEnv();
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateMetaTags() {
  try {
    console.log('📝 Récupération des meta tags depuis Supabase...');

    const { data, error } = await supabase
      .from('manifest_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('❌ Erreur lors de la récupération des meta tags:', error);
      process.exit(1);
    }

    const settings = data || {};

    const metaTitle = settings.meta_title || settings.name || 'Padel Booking';
    const metaDescription = settings.meta_description || settings.description || 'Réservez votre court de padel en ligne';
    const metaKeywords = settings.meta_keywords || 'padel, réservation, court, sport';
    const ogImage = settings.og_image_url || '';
    const themeColor = settings.theme_color || '#10b981';
    const faviconUrl = settings.favicon_url || '';

    console.log('📄 Mise à jour de index.html...');

    const indexPath = join(__dirname, '../index.html');
    let html = readFileSync(indexPath, 'utf-8');

    // Mise à jour ou ajout des meta tags
    const metaTags = `<!-- META_TAGS_START -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${metaTitle}</title>
    <meta name="description" content="${metaDescription}" />
    <meta name="keywords" content="${metaKeywords}" />
    <meta name="theme-color" content="${themeColor}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${metaTitle}" />
    <meta property="og:description" content="${metaDescription}" />${ogImage ? `\n    <meta property="og:image" content="${ogImage}" />` : ''}

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${metaTitle}" />
    <meta name="twitter:description" content="${metaDescription}" />${ogImage ? `\n    <meta name="twitter:image" content="${ogImage}" />` : ''}${faviconUrl ? `\n\n    <!-- Favicon -->\n    <link rel="icon" type="image/png" href="${faviconUrl}" />` : ''}
    <!-- META_TAGS_END -->`;

    // Vérifier si les balises META_TAGS existent déjà
    if (html.includes('<!-- META_TAGS_START -->')) {
      // Remplacer le contenu existant
      html = html.replace(/<!-- META_TAGS_START -->[\s\S]*?<!-- META_TAGS_END -->/, metaTags);
    } else {
      // Insérer les nouvelles meta tags après <head>
      html = html.replace(
        /(<head>)/,
        `$1\n    ${metaTags}`
      );
    }

    writeFileSync(indexPath, html, 'utf-8');

    console.log('✅ Meta tags générés avec succès !');
    console.log(`   - Titre: ${metaTitle}`);
    console.log(`   - Description: ${metaDescription}`);
    console.log(`   - Theme: ${themeColor}`);
    if (ogImage) console.log(`   - Image OG: ${ogImage}`);
    if (faviconUrl) console.log(`   - Favicon: ${faviconUrl}`);

  } catch (error) {
    console.error('❌ Erreur lors de la génération des meta tags:', error);
    process.exit(1);
  }
}

generateMetaTags();
