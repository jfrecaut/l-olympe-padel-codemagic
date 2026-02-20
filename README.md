# 🎾 Padel Booking System - Guide de Déploiement Self-Hosted

Guide complet pour déployer l'application de réservation de terrains de padel sur votre serveur dédié avec Supabase self-hosted.

## 📋 Prérequis

- Serveur dédié Linux (Ubuntu/Debian recommandé)
- Docker et Docker Compose installés
- Supabase self-hosted déjà installé et accessible
- Node.js 18+ (pour le build local ou sur serveur)
- Accès SSH au serveur
- Nom de domaine configuré avec vhost

---

## 🗄️ Étape 1 : Configuration de Supabase

### 1.1 Récupérer les clés API

Connectez-vous au dashboard Supabase de votre instance :
```
https://votre-domaine.com/project/default/settings/api
```

Récupérez :
- **URL du projet** : `https://votre-domaine.com`
- **anon/public key** : Clé JWT pour le client public
- **service_role key** : Clé JWT pour les opérations admin (à garder secrète !)

### 1.2 Configurer les variables d'environnement locales

Créez un fichier `.env` à la racine du projet :

```bash
VITE_SUPABASE_URL=https://votre-domaine.com
VITE_SUPABASE_ANON_KEY=votre_anon_key_ici
```

**⚠️ Important** : Ne commitez JAMAIS le fichier `.env` avec vos vraies clés !

---

## 🗃️ Étape 2 : Migration de la Base de Données

**C'est simple : un seul fichier SQL à exécuter !**

### Méthode 1 : Via le dashboard Supabase (recommandé)

1. Ouvrez l'éditeur SQL de votre instance Supabase :
   ```
   https://votre-domaine.com/project/default/sql
   ```

2. Ouvrez le fichier `supabase/init_database.sql` (à la racine du projet)

3. Copiez tout son contenu

4. Collez-le dans l'éditeur SQL et cliquez sur **"Run"**

5. ✅ Terminé ! Toute la base de données est créée

### Méthode 2 : Via ligne de commande

```bash
# Connexion à la base et exécution du script
psql "postgresql://postgres:VOTRE_PASSWORD@localhost:5432/postgres" \
  -f supabase/init_database.sql
```

### Vérifier que tout fonctionne

```sql
-- Vérifier que les 6 tables existent
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Devrait afficher : profiles, courts, bookings, settings, opening_hours, holidays

-- Vérifier que les fonctions PostgreSQL sont créées
SELECT proname FROM pg_proc WHERE proname IN ('get_user_email', 'update_user_email');

-- Devrait afficher : get_user_email, update_user_email
```

**Note** : Le fichier `supabase/init_database.sql` regroupe toutes les migrations en un seul script, y compris les fonctions PostgreSQL pour la gestion des emails.

---

## ✅ Fonctionnalités PostgreSQL (compatible self-hosted)

L'application utilise des fonctions PostgreSQL natives pour la gestion des emails, ce qui est **100% compatible avec Supabase self-hosted**.

### Fonctions disponibles

Deux fonctions PostgreSQL sécurisées sont automatiquement créées lors de la migration :

- **`get_user_email(user_id)`** : Récupère l'email d'un utilisateur
  - Réservée aux admins uniquement
  - Accède à la table `auth.users` de manière sécurisée
  - Utilisée dans l'interface admin pour afficher les emails

- **`update_user_email(user_id, new_email)`** : Met à jour l'email d'un utilisateur
  - Réservée aux admins uniquement
  - Valide le format de l'email
  - Vérifie que l'email n'est pas déjà utilisé
  - Met à jour `auth.users` et les métadonnées

### Sécurité

- Les fonctions utilisent `SECURITY DEFINER` pour accéder à `auth.users`
- Vérification automatique que l'appelant est un admin
- Pas besoin d'exposer la `service_role_key` côté client
- Fonctions isolées avec `SET search_path = public`

**Avantage** : Toute la gestion des emails est intégrée dans l'interface admin sans nécessiter d'accès direct à la base de données.

---

## 🏗️ Étape 3 : Build du Frontend

### 3.1 Installer les dépendances

```bash
npm install
```

### 3.2 Vérifier la configuration

Assurez-vous que le fichier `.env` contient les bonnes valeurs pour votre serveur.

### 3.3 Build de production

```bash
npm run build
```

Cela génère le dossier `dist/` avec les fichiers statiques optimisés.

### 3.4 Tester le build localement (optionnel)

```bash
npm run preview
```

---

## 🚀 Étape 4 : Déploiement sur le Serveur

### 4.1 Transférer les fichiers

**Option A : Via SCP**
```bash
# Depuis votre machine locale
scp -r dist/* user@votre-serveur.com:/var/www/padel-app/
```

**Option B : Via Git**
```bash
# Sur le serveur
cd /var/www/
git clone votre-repo.git padel-app
cd padel-app
npm install
npm run build
```

### 4.2 Configuration Apache

Exemple de configuration vhost (`/etc/apache2/sites-available/padel-app.conf`) :

```apache
<VirtualHost *:80>
    ServerName votre-domaine.com
    DocumentRoot /var/www/padel-app/dist

    <Directory /var/www/padel-app/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Gestion du routing React (SPA)
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Cache pour les assets statiques
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
        Header set Cache-Control "max-age=31536000, public, immutable"
    </FilesMatch>

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/padel-app-error.log
    CustomLog ${APACHE_LOG_DIR}/padel-app-access.log combined
</VirtualHost>
```

### 4.3 Activer le site et les modules Apache

```bash
# Activer les modules nécessaires
sudo a2enmod rewrite
sudo a2enmod headers

# Activer le site
sudo a2ensite padel-app.conf

# Vérifier et recharger Apache
sudo apache2ctl configtest
sudo systemctl reload apache2
```

### 4.4 Configuration SSL (HTTPS) avec Let's Encrypt

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d votre-domaine.com
```

---

## 🎯 Étape 5 : Initialisation de l'Application

### 5.1 Créer le premier compte admin

1. Accédez à votre application : `https://votre-domaine.com`
2. Créez un compte via l'interface d'inscription
3. Connectez-vous au dashboard Supabase
4. Dans la table `profiles`, changez le `role` de votre compte en `'admin'` :

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'votre@email.com';
```

### 5.2 Configuration initiale

En tant qu'admin, configurez :
- Les horaires d'ouverture dans "Paramètres" > "Horaires"
- Les terrains disponibles
- Les prix et durées de réservation
- Le délai de réservation minimum

---

## 🔄 Mise à Jour de l'Application

### Déploiement d'une nouvelle version

```bash
# Sur votre machine locale
git pull
npm install  # Si nouvelles dépendances
npm run build

# Transférer les fichiers
scp -r dist/* user@votre-serveur.com:/var/www/padel-app/

# Ou via Git sur le serveur
ssh user@votre-serveur.com
cd /var/www/padel-app
git pull
npm install
npm run build
sudo systemctl reload apache2
```

### Nouvelles migrations

Si de nouvelles migrations sont ajoutées :

```bash
# Exécuter les nouvelles migrations via psql ou le dashboard
psql "postgresql://..." -f supabase/migrations/nouvelle_migration.sql
```

---

## 🐛 Dépannage

### L'application ne se connecte pas à Supabase

1. Vérifiez les variables d'environnement dans `.env`
2. Vérifiez que Supabase est bien accessible : `curl https://votre-domaine.com/rest/v1/`
3. Vérifiez les CORS dans la config Supabase

### Erreur lors de la modification d'un email

Si vous rencontrez des erreurs :
1. Vérifiez que l'utilisateur connecté a bien le rôle `admin` dans la table `profiles`
2. Vérifiez que le nouvel email n'est pas déjà utilisé par un autre compte
3. Vérifiez les logs de Supabase pour voir les messages d'erreur détaillés

### Erreurs 404 lors du routing

Vérifiez la configuration Apache, notamment les règles RewriteRule pour le routing SPA

### Problèmes de permissions base de données

Vérifiez les Row Level Security (RLS) policies :
```sql
SELECT * FROM pg_policies;
```

---

## 📊 Architecture du Projet

```
.
├── src/
│   ├── components/         # Composants React
│   │   ├── Auth.tsx        # Authentification
│   │   ├── AdminDashboard.tsx
│   │   ├── PlayerDashboard.tsx
│   │   └── BookingCalendar.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx # Gestion de l'authentification
│   ├── lib/
│   │   └── supabase.ts     # Client Supabase
│   └── types.ts            # Types TypeScript
├── supabase/
│   ├── migrations/         # Migrations SQL (incluant fonctions PostgreSQL)
│   └── init_database.sql   # Script d'initialisation complet
├── dist/                   # Build de production (généré)
└── .env                    # Variables d'environnement (à créer)
```

---

## 📝 Sécurité

### Bonnes pratiques

1. ✅ **Ne jamais exposer la `service_role` key** côté client
2. ✅ Utiliser HTTPS en production (Let's Encrypt)
3. ✅ Gardez Supabase et les dépendances à jour
4. ✅ Sauvegardez régulièrement la base de données
5. ✅ Utilisez des mots de passe forts pour la DB

### Sauvegardes

```bash
# Backup de la base de données
pg_dump "postgresql://postgres:PASSWORD@localhost:5432/postgres" > backup_$(date +%Y%m%d).sql

# Restauration
psql "postgresql://postgres:PASSWORD@localhost:5432/postgres" < backup_20260107.sql
```

---

## 📞 Support

- Documentation Supabase : https://supabase.com/docs
- Self-hosting guide : https://supabase.com/docs/guides/self-hosting

---

## ✅ Checklist Complète

- [ ] Supabase installé et accessible
- [ ] Variables d'environnement configurées
- [ ] Migrations exécutées
- [ ] Frontend buildé
- [ ] Apache configuré
- [ ] SSL/HTTPS activé
- [ ] Premier compte admin créé
- [ ] Configuration initiale (horaires, terrains, prix)
- [ ] Tests de réservation
- [ ] Sauvegarde configurée

**Note** : L'application utilise des fonctions PostgreSQL natives, 100% compatible avec le self-hosting.

---

**Bon déploiement ! 🚀**
