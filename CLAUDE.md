# GMB Manager - Contexte Projet

## 0. Dépôt Git
https://github.com/Dchirez/GMB_Manager.git

## 1. Description du projet
Application web de gestion et d'optimisation des fiches Google My Business
pour les petits commerces locaux (projet ciblant Rouvroy 62320 initialement).
Permet de gérer les fiches GMB, calculer un score de complétude,
gérer les avis clients et créer des publications.

## 2. Stack technique
- Frontend : Angular 21 (standalone components, signals, @if/@for)
- Backend : Python Flask 3.0
- Auth : Google OAuth 2.0 + JWT tokens (PyJWT)
- API cible : Google Business Profile API v1
- Style : Tailwind CSS

## 3. Flux d'authentification
1. User clique "Se connecter avec Google" → /auth/login
2. Backend génère URL OAuth Google → retourne {auth_url}
3. Frontend redirige → window.location.href = auth_url
4. Google redirige → /auth/callback?code=...
5. Backend échange code contre token Google
6. Backend génère JWT avec {user_id, email, name, google_access_token}
7. Backend redirige → http://localhost:4200/auth/callback?token=JWT
8. Frontend stocke JWT dans localStorage('auth_token')
9. Frontend redirige → /dashboard
10. Toutes les requêtes API incluent : Authorization: Bearer JWT

## 4. Ce qui fonctionne ✅
### Authentification & Sécurité
- Authentification Google OAuth 2.0 complète
- JWT tokens (génération + validation) avec google_access_token inclus
- Auth guard basé sur localStorage
- Auth interceptor (ajoute Bearer token automatiquement)
- Déconnexion avec suppression localStorage

### Intégration Google Business Profile API
- GET /api/gmb/fiches appelle l'API réelle Google Business Profile
  * Récupère les vrais comptes via Account Management API
  * Récupère les locations/fiches via Business Information API
  * Mappe les données Google au format interne
  * Fallback automatique sur fiches démo en cas d'erreur
- Logging détaillé des appels API pour debugging
- Gestion des erreurs (token expiré, API inaccessible, timeouts)
- Scope OAuth : userinfo.email, userinfo.profile, openid, business.manage

### Frontend Angular
- Dashboard avec liste des fiches (vraies ou démo) — responsive mobile/tablette/desktop
- Score de complétude /100 avec barre de progression colorée
  (rouge <40, orange <70, vert ≥70)
- Navigation vers détail d'une fiche (/fiche/:id)
- Affichage détail fiche avec formulaire d'édition
- Sauvegarde fiche PUT /gmb/fiches/:id en mode démo
- Recalcul score après modification fiche
- Page Avis (/avis/:id) :
  * Liste avis avec étoiles, auteur, date, commentaire
  * Note moyenne en haut
  * Réponse inline via textarea + POST /avis/fiches/:id/avis/:avis_id/reponse
- Page Publications (/publications/:id) :
  * Liste publications existantes (titre, contenu, photo, date, statut)
  * Formulaire création avec photo optionnelle + POST /publications/fiches/:id/posts
  * Preview de la photo avant publication, bouton supprimer la sélection
- Navbar global avec cloche notifications (polling 60s)

### Nouvelles Fonctionnalités (mars 2026) ✨
1. **Statistiques avancées** :
   - Composant stats sous onglet dans /fiche/:id
   - Répartition des notes (1★ à 5★) avec barres colorées
   - Évolution mensuelle sur 12 mois
   - Taux de réponse (%) circulaire
   - KPI: note moyenne, total avis, taux de réponse

2. **Notifications** :
   - Icône cloche 🔔 dans navbar avec badge rouge
   - Génération automatique: avis ≤2★ sans réponse, score<40, >3 avis sans réponse
   - Polling toutes les 60s (pas de WebSocket)
   - Panneau déroulant au clic: liste notifications, marquer comme lu
   - Clic notif → navigation fiche + marquage lu

3. **Mode mobile** :
   - Dashboard grille 1 col mobile, 2 col tablette, 3 col desktop
   - Formulaires pleine largeur mobile, flex-col buttons
   - Navbar responsive (logo clickable → /dashboard)
   - Prêt pour PWA (manifest.webmanifest, ngsw-config.json)

4. **Galerie photos** :
   - Composant photos sous onglet dans /fiche/:id
   - Upload multipart/form-data vers Supabase Storage (bucket gmb-photos)
   - Modale de commentaire/caption à l'upload (optionnel)
   - Caption affiché en overlay sur la photo dans la galerie
   - Grille responsive: 1 col mobile, 2 tablette, 3 desktop
   - Lightbox avec navigation précédent/suivant
   - Delete avec confirmation
   - Loader + feedback succès/erreur
   - Création auto des fiches démo en BDD pour les utilisateurs existants (fix "Fiche not found")
   - Headers Supabase corrigés (apikey + Authorization avec service_role key)

5. **Photos dans les publications** (avril 2026) :
   - Upload photo optionnel lors de la création d'une publication
   - Backend : POST multipart/form-data avec champs titre, contenu, file (optionnel)
   - Upload vers Supabase Storage (bucket gmb-photos, sous-dossier publications/)
   - Nouveaux champs Publication : `image_url`, `image_filename` (nullable)
   - Migration idempotente via `run_migrations()` dans app.py (une seule fois par processus)
   - Frontend : bouton "Ajouter une photo" avec preview avant publication
   - Validation fichier : max 5 Mo, formats png/jpg/jpeg/gif/webp
   - Affichage de l'image dans la liste des publications
   - Service Angular : `createPublication()` envoie FormData si fichier, JSON sinon

6. **Migrations BDD idempotentes** (avril 2026) :
   - Fonction `run_migrations()` dans app.py, exécutée une seule fois par processus (flag `_migrations_applied`)
   - Helpers `_column_exists()` et `_column_type()` qui interrogent `information_schema` pour vérifier avant d'altérer
   - Fix: les migrations tournaient à chaque requête HTTP via `@app.before_request`, spammant les logs avec des erreurs `DuplicateColumn`
   - Migrations actives : `users.id → BigInteger`, `publications.image_url/image_filename`

7. **Cache frontend avec TTL** (avril 2026) :
   - Cache mémoire + sessionStorage dans `gmb.service.ts`
   - TTL de 5 minutes, stale-while-revalidate (données périmées affichées instantanément + refresh en arrière-plan)
   - Méthodes cachées : getFiches, getFiche, getAvis, getPublications, getPhotos, getAvisStats, getDashboardStats
   - Notifications exclues du cache (doivent rester fraîches, polling 60s)
   - Invalidation intelligente : updateFiche invalide fiche+fiches, postReponse invalide avis+stats, upload/delete photo invalide photos, createPublication invalide publications
   - `clearCache()` publique appelée au logout (navbar)
   - Persistance cross-refresh via sessionStorage (préfixe `gmb_cache_`)
   - Aucune librairie externe (solution vanilla Angular)

8. **Seed avis démo en BDD** (avril 2026) :
   - Fonction helper `create_demo_fiches_and_avis()` dans app.py
   - Crée fiches ET avis associés en BDD (IDs cohérents)
   - Auto-seed dans `GET /api/avis/fiches/:id/avis` : si fiche existe en BDD sans avis, les avis démo sont créés à la volée
   - Fix: les avis démo utilisaient des clés hardcodées "1"-"4" qui ne matchaient pas les IDs auto-générés en BDD
   - Données démo centralisées dans `DEMO_FICHES_DATA` et `DEMO_AVIS_BY_FICHE_NAME` (plus de duplication)

### Mode démo avec 4 vrais commerces de Rouvroy
- Boulangerie Martin (score: 30/100)
- Karact'Hair (score: 70/100)
- Friterie Aux Bonnes Saveurs (score: 30/100)
- MS Automobiles (score: 30/100)
- Accessible si pas de vraies fiches GMB disponibles
- Chaque fiche inclut des avis démo seedés en BDD

## 5. Lier le dépôt distant et pousser
```bash
git remote add origin https://github.com/Dchirez/GMB_Manager.git
git branch -M main
git push -u origin main
```

## 6. Persistance base de données ✅
- PostgreSQL via SQLAlchemy (migrations vers Supabase)
- Modèles : User, Fiche, Avis, Publication
- Fallback démo si base de données vide (3-level cascade: Google API → BDD → Démo)
- Seed script idempotent pour population des données démo

## 6b. Nouvelles tables BDD (mars 2026) ✅
- `Notification` : id, user_id, fiche_id, type, message, lu, created_at
- `Photo` : id, fiche_id, filename, url, caption, uploaded_at
- Relationships: User.notifications, Fiche.photos

## 6c. Routes API des nouvelles fonctionnalités (mars 2026) ✅

### Statistiques (`GET /api/stats/...`)
- `GET /api/stats/fiches/<fiche_id>/avis` — Stats avis (total, moyenne, répartition, évolution 12m, taux réponse)
- `GET /api/stats/dashboard` — Stats dashboard (nombre fiches, score moyen, meilleure/pire fiche, total avis)

### Notifications (`GET/PUT /api/notifications/...`)
- `GET /api/notifications` — Liste notifications non lues + génération auto
- `PUT /api/notifications/<id>/lire` — Marquer une notif comme lue
- `PUT /api/notifications/lire-tout` — Marquer toutes comme lues

### Photos (`GET/POST/DELETE /api/photos/...`)
- `GET /api/photos/fiches/<fiche_id>/photos` — Liste photos de la fiche
- `POST /api/photos/fiches/<fiche_id>/photos` — Upload (multipart/form-data: file, caption optionnel)
- `DELETE /api/photos/fiches/<fiche_id>/photos/<photo_id>` — Supprimer photo

### Service Angular (gmb.service.ts) - Nouvelles méthodes
- `getAvisStats(ficheId)` → `Observable<AvisStats>`
- `getDashboardStats()` → `Observable<DashboardStats>`
- `getNotifications()` → `Observable<Notification[]>`
- `markNotificationAsRead(id)` → `Observable<Notification>`
- `markAllNotificationsAsRead()` → `Observable<{message}>`
- `getPhotos(ficheId)` → `Observable<Photo[]>`
- `uploadPhoto(ficheId, file, caption?)` → `Observable<Photo>`
- `deletePhoto(ficheId, photoId)` → `Observable<{message}>`
- `createPublication(ficheId, titre, contenu, file?)` → `Observable<Publication>` (FormData si file, JSON sinon)

## 6d. Pas encore implémenté ❌
- Synchronisation des éditions avec l'API Google Business Profile
- Gestion des avis & publications en temps réel via API Google
- PWA (service workers) — structure en place, reste `ng add @angular/pwa` + ngsw-config.json

## 7. Variables d'environnement requises (.env)

### Production (Render) ✅
```
# Google OAuth 2.0
GOOGLE_CLIENT_ID=<voir .env ou Render dashboard>
GOOGLE_CLIENT_SECRET=<voir .env ou Render dashboard>
GOOGLE_REDIRECT_URI=https://gmb-backend.dchirez.fr/auth/callback

# Flask Configuration
FRONTEND_URL=https://gmb.dchirez.fr
SECRET_KEY=<voir Render dashboard / générer via `python -c "import secrets; print(secrets.token_urlsafe(64))"`>
FLASK_ENV=production

# Database Configuration (PostgreSQL/Supabase)
DATABASE_URL=<voir .env ou Render dashboard>
RESET_DB=false

# Supabase (for photo storage)
SUPABASE_URL=<voir .env ou Render dashboard>
SUPABASE_SERVICE_KEY=<voir .env ou Render dashboard>
```

**Note:** Toutes les variables d'environnement sont configurées dans Render dashboard.
Pour dev local, voir le fichier `.env` (voir `.env.example` pour la structure).

### Développement local
```
# Google OAuth 2.0
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/callback

# Flask Configuration
FRONTEND_URL=http://localhost:4200
SECRET_KEY=<voir Render dashboard / générer via `python -c "import secrets; print(secrets.token_urlsafe(64))"`>
FLASK_ENV=development

# Database Configuration (PostgreSQL/Supabase)
DATABASE_URL=postgresql://user:password@localhost:5432/gmb_manager

# Supabase (for photo storage - optional but needed for gallery feature)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

## 8. Points techniques importants
- OAUTHLIB_INSECURE_TRANSPORT=1 requis en dev (HTTP local)
- OAUTHLIB_RELAX_TOKEN_SCOPE=1 requis (Google réorganise les scopes)
- localStorage key : 'auth_token' (uniforme partout)
- Imports Python absolus (from services.xxx import xxx)
- SESSION_TYPE=filesystem dans app.py

## 9. Lancer le projet

### Backend (avec database)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # remplir DATABASE_URL et vraies valeurs Google
python app.py
```

À la première exécution, les tables SQLAlchemy seront créées automatiquement.
Pour peupler avec les données démo :
```bash
python seed.py
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

### Build production frontend
```bash
ng build --configuration=production
# Produit dans frontend/dist/ prêt pour Vercel
```

## 9b. Testing l'intégration Google Business Profile API

### Logs en backend
Lors du GET /api/gmb/fiches, le backend log:
```
Récupération des fiches pour l'utilisateur user@example.com
Récupération des comptes GMB...
Trouvé X compte(s) GMB
Récupération des locations du compte accounts/123...
Trouvé Y location(s) pour le compte accounts/123
Récupération réussie: Z fiche(s)
```

### Fallback sur démo
Si erreur API (token expiré, pas de fiches, timeout):
```
Impossible de récupérer les fiches GMB, fallback sur démo
Utilisation des fiches démo
```

### Debugging
1. Vérifier que le google_access_token est bien inclus dans le JWT:
   ```bash
   # Décoder le token stocké dans localStorage('auth_token')
   ```

2. Vérifier les scopes demandés dans auth_service.py:
   ```python
   SCOPES = ['userinfo.email', 'userinfo.profile', 'openid', 'business.manage']
   ```

3. Vérifier les réponses API avec les logs Flask (lancement avec DEBUG=1)

## 10. Déploiement en production ✅

### Statut (mars 2026)
- **Frontend:** https://gmb.dchirez.fr ✅ (déployé sur Render)
- **Backend:** https://gmb-backend.dchirez.fr ✅ (déployé sur Render)
- **Authentification Google:** Configurée et testée ✅
- **Route /health:** Ajoutée pour monitoring ✅

### Étapes complétées:
1. **Mise à jour des domaines** :
   - `environment.ts` et `environment.prod.ts` pointent vers `gmb-backend.dchirez.fr`
   - `GOOGLE_REDIRECT_URI` mis à jour dans Google Cloud Console
   - `FRONTEND_URL` et `GOOGLE_REDIRECT_URI` configurés dans `.env` et Render

2. **Configuration Google OAuth Console** :
   - Authorized redirect URIs: `https://gmb-backend.dchirez.fr/auth/callback`
   - Authorized JavaScript origins: `https://gmb.dchirez.fr`

3. **Déploiement Render** :
   - Backend: auto-deploy via git push sur `main`
   - Frontend: auto-deploy via git push sur `main`
   - Variables d'environnement configurées sur Render dashboard

4. **Health check** :
   - Route `GET /health` ajoutée au backend
   - Endpoint accessible pour monitoring: `https://gmb-backend.dchirez.fr/health`

5. **Tests en production** :
   - Authentification Google fonctionnelle ✅
   - Flux complet: login → dashboard → fiches ✅
   - CORS configuré correctement ✅

## 11. Prochaines étapes prioritaires
1. **Supabase Storage (galerie photos)** ✅ :
   - Bucket `gmb-photos` créé dans Supabase
   - SUPABASE_URL et SUPABASE_SERVICE_KEY (service_role) configurés dans Render
   - Upload, affichage et suppression de photos fonctionnels en production
   - Modale de commentaire/caption à l'upload

2. **PWA (optionnel, structure prête)** :
   - `ng add @angular/pwa`
   - Configurer ngsw-config.json pour cache stratégies
   - Tester sur mobile: "Ajouter à l'écran d'accueil"

3. **Monitoring & Logs** :
   - Configurer alertes Render pour redéploiements/erreurs
   - Vérifier les logs Render régulièrement
   - Mettre en place un dashboard de monitoring

4. **Futures améliorations** :
   - Synchronisation éditions avec l'API Google Business Profile (PUT /gmb/fiches/:id → API Google)
   - Avis & publications temps réel via API Google
   - GraphQL pour requêtes complexes
   - Tests unitaires (Jest/Karma)
   - CI/CD avec GitHub Actions

## 12. Sécurisation (audit avril 2026) 🔒

Audit de sécurité statique complet réalisé sur toute la stack (Flask + Angular + Supabase).
21 vulnérabilités identifiées, 18 corrigées automatiquement, 3 nécessitent une action humaine.

### 12a. Corrections appliquées ✅

#### Authentification & JWT
- **SECRET_KEY** : suppression du fallback hardcodé `gmb-manager-super-secret-key-2026`.
  Le backend lève une `RuntimeError` si `SECRET_KEY` absente en production, ou génère
  une clé éphémère aléatoire en dev. Longueur minimale forcée à 32 caractères.
- **JWT expiration** : claims `iat`, `nbf`, `exp` (1 h) ajoutés à la génération.
  Décodage strict avec `options={'require': ['exp', 'iat']}` — rejet des tokens
  malformés ou sans expiration.
- **google_access_token retiré du payload JWT** : stocké uniquement en BDD
  (`User.google_access_token`) et rechargé par le décorateur `@token_required`
  via `user_id`. Permet la révocation serveur-side.
- **OAuth `state`** : paramètre `state` aléatoire (`secrets.token_urlsafe(32)`) généré
  dans `/auth/login`, persisté en session signée, vérifié avec `secrets.compare_digest`
  dans `/auth/callback` (protection login CSRF).
- **JWT dans URL fragment** : la redirection post-OAuth utilise maintenant
  `#token=JWT` au lieu de `?token=JWT` (les fragments ne sont jamais envoyés dans les
  headers Referer ni loggués côté serveur). `AuthCallbackComponent` lit le fragment.
- **Guard Angular** : `auth.guard.ts` réécrit proprement avec `inject()`, décode le
  JWT côté client et vérifie l'expiration (`exp`). Redirection automatique vers
  `/login` si token expiré, avec `authService.logout()`.

#### IDOR (Insecure Direct Object References) — CWE-639
Toutes les routes prenant un `fiche_id` en paramètre vérifient maintenant
l'ownership de la fiche par l'utilisateur authentifié avant toute lecture/écriture :
- `GET /api/avis/fiches/<id>/avis`
- `POST /api/avis/fiches/<id>/avis/<avis_id>/reponse`
- `GET /api/publications/fiches/<id>/posts`
- `POST /api/publications/fiches/<id>/posts`
- `GET /api/stats/fiches/<id>/avis`
- `PUT /api/gmb/fiches/<id>` (ownership déjà présent, fallback FICHES_DEMO supprimé
  car il mutait un dict global partagé entre tous les users — cross-user pollution).

Helper `owned_fiche_or_403(fiche_id, user_id)` ajouté dans `utils/decorators.py`.

#### Upload de fichiers (CWE-434 / CWE-400)
- `app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024` (cap global à 5 Mo).
- Validation stricte : extension **ET** `content_type` doivent être dans les
  allowlists `{png,jpg,jpeg,gif,webp}` / `{image/png,image/jpeg,image/gif,image/webp}`.
- `Content-Type` forcé côté serveur lors de l'upload à Supabase (on ne fait plus
  confiance à celui envoyé par le client).
- Nom de fichier stocké = UUID serveur (pas le filename utilisateur).
- Cap par fichier : 5 Mo en plus de `MAX_CONTENT_LENGTH`.
- Caption bornée à 255 caractères.

#### CORS & headers HTTP
- **CORS strict** : raise si `FRONTEND_URL` absent en production (plus de fallback
  permissif sur `http://localhost:4200`).
- **Security headers** injectés via `@app.after_request` :
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (prod only)
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` (API JSON)
- **Session cookies** : `HTTPONLY=True`, `SECURE=True` en prod, `SAMESITE=Lax`.
- **vercel.json** : CSP stricte pour le frontend, HSTS, X-Frame-Options, permissions
  policy. `connect-src` whitelist `gmb-backend.dchirez.fr` et `accounts.google.com`,
  `img-src` autorise `*.supabase.co` pour la galerie.

#### Rate limiting (CWE-307 / CWE-770)
- `Flask-Limiter==3.8.0` ajouté dans `requirements.txt`.
- Défaults globaux : `200/hour`, `60/minute`.
- Limite spécifique sur `/auth/login` : `20/minute` (protection brute force du flow OAuth).
- Storage in-memory (suffisant pour un seul worker gunicorn ; passer à Redis si scale horizontal).

#### Fuite d'erreurs & logs (CWE-209 / CWE-532)
- Plus aucun `jsonify({'error': str(e)})` renvoyé au client. Helper `_safe_error()`
  dans `app.py`, messages génériques (`'Internal error'`, `'Invalid token'`, etc.).
- Le stacktrace est loggé côté serveur mais jamais exposé.
- Endpoint debug `/api/gmb/debug` :
  - Désactivé (retourne 404) en production.
  - Les fragments de token Google (`token[:30]`) ne sont plus loggés ni renvoyés
    dans le JSON de réponse.
- Flask debug mode (`app.run(debug=True)`) désactivé par défaut — activable
  uniquement via `FLASK_ENV=development` **ET** `FLASK_DEBUG=1` (protection
  Werkzeug debugger RCE).

#### Validation des inputs (CWE-20)
Longueurs max appliquées sur tous les champs texte des routes POST/PUT :
- `titre` publication : 255 caractères
- `contenu` publication : 5000 caractères
- `reponse` avis : 2000 caractères
- Champs fiche (`nom`, `telephone`, `adresse`, `site_web`, `horaires`, `description`) : 2000 caractères chacun

#### Initialisation BDD (CWE-732 / CWE-400)
- `db.create_all()` et `run_migrations()` ne tournent plus dans un `@app.before_request`
  (qui s'exécutait à chaque requête HTTP, même non-authentifiée, offrant une surface
  d'attaque DDL). L'init est maintenant fait **une seule fois** au démarrage du
  processus via `with app.app_context()`.
- `/api/health` ne trigger plus `db.create_all()` — c'est un simple endpoint read-only.

### 12b. Actions humaines requises ⚠️

1. **🔴 ROTATION DE `SECRET_KEY` SUR RENDER** (CRITIQUE)
   - L'ancienne valeur `gmb-manager-super-secret-key-2026` est dans l'historique git.
     Considérer la clé comme **compromise à vie**.
   - Générer une nouvelle clé : `python -c "import secrets; print(secrets.token_urlsafe(64))"`
   - Mettre à jour `SECRET_KEY` dans le dashboard Render.
   - Conséquence : tous les JWT actuels deviendront invalides → les utilisateurs
     devront se reconnecter (normal).

2. **🟠 Installer Flask-Limiter sur Render**
   - Le redéploiement doit `pip install -r requirements.txt` (auto via Render).
   - Sans cette lib, `_HAS_LIMITER=False` et le rate limiting est désactivé avec un
     warning dans les logs.

3. **🟡 Tester le flow complet après déploiement**
   - Login Google → vérifier que le state OAuth est généré/vérifié (logs)
   - Vérifier que le JWT arrive en `#token=` dans l'URL de callback
   - Essayer d'accéder à une fiche d'un autre user → doit retourner 404
   - Tester un upload > 5 Mo → doit retourner 413

### 12c. Risques résiduels connus (non corrigés dans cet audit)

Les points suivants ont été identifiés mais **non corrigés** car trop lourds ou
non prioritaires. À traiter ultérieurement :

- **M-1 Token JWT dans `localStorage`** (CWE-922) : vulnérable au XSS.
  Migration idéale → cookie `HttpOnly; Secure; SameSite=Lax` côté backend +
  suppression de l'interceptor Angular qui injecte `Authorization: Bearer`.
  Refacto significatif.
- **M-5 `id_token` Google non vérifié cryptographiquement** (CWE-295) :
  aujourd'hui on fait confiance à l'endpoint `userinfo` ; à terme utiliser
  `google.oauth2.id_token.verify_oauth2_token(id_token, Request(), CLIENT_ID)`
  pour valider la signature Google directement.
- **Chiffrement at-rest des tokens Google en BDD** (CWE-522) :
  `User.google_access_token` et `google_refresh_token` stockés en clair.
  Idéalement chiffrer via `cryptography.Fernet` avec une clé dédiée dans l'env.

### 12d. Checklist de déploiement sécurisé

- [x] SECRET_KEY sans fallback hardcodé
- [ ] **SECRET_KEY rotée sur Render** ← à faire manuellement (cf. 12b.1)
- [x] FLASK_ENV=production sur Render
- [x] CORS strict (raise si FRONTEND_URL manquant)
- [x] `.env` dans `.gitignore` (vérifié)
- [x] Flask debug mode désactivé
- [x] Rate limiting configuré
- [x] Headers HTTP de sécurité (backend + Vercel)
- [x] JWT avec `exp`, signature vérifiée strictement
- [x] IDOR fermés sur toutes les routes paramétrées
- [x] OAuth `state` vérifié (login CSRF)
- [x] Upload photos : taille + MIME + extension whitelistés
- [x] Erreurs génériques côté client, stacktraces loggés serveur
- [x] Endpoint `/api/gmb/debug` désactivé en prod
- [x] Initialisation BDD retirée de `before_request`

### 12e. Fichiers modifiés lors de l'audit sécurité

**Backend :**
- `backend/app.py` (core hardening : SECRET_KEY, JWT, CORS, headers, rate limit, IDOR)
- `backend/utils/decorators.py` (JWT strict + helper `owned_fiche_or_403`)
- `backend/services/auth_service.py` (support du paramètre `state` OAuth)
- `backend/routes/stats.py` (IDOR + erreurs génériques)
- `backend/routes/photos.py` (upload sécurisé + MIME + taille)
- `backend/routes/notifications.py` (erreurs génériques)
- `backend/requirements.txt` (ajout `Flask-Limiter==3.8.0`)
- `backend/.env.example` (suppression de la SECRET_KEY leakée)

**Frontend :**
- `frontend/src/app/guards/auth.guard.ts` (réécriture + vérif `exp` côté client)
- `frontend/src/app/components/auth-callback/auth-callback.component.ts` (lecture du fragment `#token=`)
- `frontend/vercel.json` (CSP + HSTS + X-Frame-Options + Permissions-Policy)

**Documentation :**
- `CLAUDE.md` (section 12 + scrub SECRET_KEY des exemples .env)
