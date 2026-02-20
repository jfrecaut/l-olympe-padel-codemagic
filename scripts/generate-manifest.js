import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
/*const envPath = join(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;*/


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
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Les variables d\'environnement Supabase sont manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tailles standard des icônes PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateAndUploadIcons(sourceIconUrl) {
  if (!sourceIconUrl) {
    return null;
  }

  console.log('🎨 Génération automatique des icônes PWA...');

  try {
    // Télécharger l'image source
    const response = await fetch(sourceIconUrl);
    if (!response.ok) {
      throw new Error(`Impossible de télécharger l'icône: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Vérifier que l'image peut être traitée par sharp
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`   📐 Image source: ${metadata.width}x${metadata.height} (${metadata.format})`);

    // Créer le dossier icons dans public s'il n'existe pas
    const iconsDir = join(__dirname, '../public/icons');
    if (!existsSync(iconsDir)) {
      mkdirSync(iconsDir, { recursive: true });
    }

    const icons = [];

    // Générer chaque taille
    for (const size of ICON_SIZES) {
      console.log(`   🔄 Génération de l'icône ${size}x${size}...`);

      // Redimensionner l'image
      const resizedBuffer = await sharp(imageBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();

      // Sauvegarder localement dans public/icons
      const fileName = `icon-${size}x${size}.png`;
      const localPath = join(iconsDir, fileName);

      writeFileSync(localPath, resizedBuffer);

      // Créer l'entrée pour le manifest avec le chemin relatif
      icons.push({
        src: `/icons/${fileName}`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: size >= 192 ? 'any maskable' : 'any'
      });

      console.log(`   ✅ Icône ${size}x${size} générée`);
    }

    console.log(`✅ ${icons.length} icônes générées avec succès`);
    return icons;

  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error.message);
    return null;
  }
}

async function generateManifest() {
  try {
    console.log('📝 Récupération des paramètres manifest depuis Supabase...');

    const { data, error } = await supabase
      .from('manifest_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('❌ Erreur lors de la récupération du manifest:', error);
      process.exit(1);
    }

    const settings = data || {};

    // Construction du manifest.json selon le standard PWA
    const manifest = {
      id: settings.start_url || '/',
      dir: settings.dir || 'ltr',
      lang: settings.lang || 'fr',
      name: settings.name || 'Padel Booking',
      scope: settings.scope || '/',
      display: settings.display || 'standalone',
      start_url: settings.start_url || '/',
      short_name: settings.short_name || 'Padel',
      theme_color: settings.theme_color || '#3b82f6',
      description: settings.description || 'Book your padel court easily',
      orientation: settings.orientation || 'any',
      background_color: settings.background_color || '#ffffff',
      related_applications: settings.related_applications || [],
      prefer_related_applications: settings.prefer_related_applications || false,
    };

    // Ajouter les champs optionnels s'ils existent
    if (settings.display_override && settings.display_override.length > 0) {
      manifest.display_override = settings.display_override;
    }

    if (settings.screenshots && settings.screenshots.length > 0) {
      manifest.screenshots = settings.screenshots;
    }

    if (settings.features && settings.features.length > 0) {
      manifest.features = settings.features;
    }

    // Gestion des icônes - Génération automatique si icon_url existe
    let generatedIcons = null;
    if (settings.icon_url) {
      generatedIcons = await generateAndUploadIcons(settings.icon_url);
    }

    if (generatedIcons && generatedIcons.length > 0) {
      manifest.icons = generatedIcons;
    } else if (settings.icons && settings.icons.length > 0) {
      manifest.icons = settings.icons;
    } else if (settings.icon_url) {
      // Fallback: utiliser l'icon_url simple si la génération a échoué
      manifest.icons = [
        {
          src: settings.icon_url,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ];
    }

    if (settings.categories && settings.categories.length > 0) {
      manifest.categories = settings.categories;
    }

    if (settings.launch_handler && Object.keys(settings.launch_handler).length > 0) {
      manifest.launch_handler = settings.launch_handler;
    }

    if (settings.edge_side_panel && Object.keys(settings.edge_side_panel).length > 0) {
      manifest.edge_side_panel = settings.edge_side_panel;
    }

    if (settings.shortcuts && settings.shortcuts.length > 0) {
      manifest.shortcuts = settings.shortcuts;
    }

    console.log('📄 Génération du manifest.json...');

    // Écrire le manifest.json dans le dossier public
    const publicManifestPath = join(__dirname, '../public/manifest.json');
    writeFileSync(publicManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    console.log('✅ Manifest.json généré avec succès !');
    console.log(`   - Nom: ${manifest.name}`);
    console.log(`   - Description: ${manifest.description}`);
    console.log(`   - Langue: ${manifest.lang}`);
    console.log(`   - Icônes: ${manifest.icons ? manifest.icons.length : 0}`);

  } catch (err) {
    console.error('❌ Erreur inattendue:', err);
    process.exit(1);
  }
}

generateManifest();
