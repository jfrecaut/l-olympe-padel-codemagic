import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Template HTML de base
const DEFAULT_HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    {{META_TAGS}}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Charger les settings depuis la base de données
    const { data: settings } = await supabase
      .from("settings")
      .select("site_title, site_description, site_keywords, site_favicon_url, site_og_image_url, site_theme_color")
      .maybeSingle();

    // Valeurs par défaut
    const title = settings?.site_title || "Réservation Padel";
    const description = settings?.site_description || "Réservez votre court de padel en ligne";
    const keywords = settings?.site_keywords || "padel, réservation, court, sport";
    const themeColor = settings?.site_theme_color || "#10b981";
    const faviconUrl = settings?.site_favicon_url || "/vite.svg";
    const ogImageUrl = settings?.site_og_image_url || "";

    // Construire les meta tags
    let metaTags = `<title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="keywords" content="${escapeHtml(keywords)}" />
    <meta name="theme-color" content="${escapeHtml(themeColor)}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />`;

    if (ogImageUrl) {
      metaTags += `\n    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`;
    }

    metaTags += `\n
    <meta name="twitter:card" content="summary_large_image" />`;

    // Remplacer le placeholder dans le HTML
    const html = DEFAULT_HTML.replace("{{META_TAGS}}", metaTags);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600", // Cache 5 min client, 10 min CDN
      },
    });
  } catch (error: any) {
    console.error("Error serving HTML:", error);

    // En cas d'erreur, retourner le HTML avec les valeurs par défaut
    const defaultMetaTags = `<title>Réservation Padel</title>
    <meta name="description" content="Réservez votre court de padel en ligne" />
    <meta name="keywords" content="padel, réservation, court, sport" />
    <meta name="theme-color" content="#10b981" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="Réservation Padel" />
    <meta property="og:description" content="Réservez votre court de padel en ligne" />

    <meta name="twitter:card" content="summary_large_image" />`;

    const html = DEFAULT_HTML.replace("{{META_TAGS}}", defaultMetaTags);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
});

// Fonction utilitaire pour échapper le HTML et éviter les injections
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
