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
   - Migration auto `migrate_publications_image()` dans app.py
   - Frontend : bouton "Ajouter une photo" avec preview avant publication
   - Validation fichier : max 5 Mo, formats png/jpg/jpeg/gif/webp
   - Affichage de l'image dans la liste des publications
   - Service Angular : `createPublication()` envoie FormData si fichier, JSON sinon

6. **Seed avis démo en BDD** (avril 2026) :
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
SECRET_KEY=gmb-manager-super-secret-key-2026
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
SECRET_KEY=gmb-manager-super-secret-key-2026
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
