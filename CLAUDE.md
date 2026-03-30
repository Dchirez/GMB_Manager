# GMB Manager - Contexte Projet

## 0. Dépôt Git
https://github.com/Dchirez/GMB_Manager.git

---

## 1. Description du projet
Application web de gestion et d'optimisation des fiches Google My Business
pour les petits commerces locaux (projet ciblant Rouvroy 62320 initialement).
Permet de gérer les fiches GMB, calculer un score de complétude,
gérer les avis clients et créer des publications.

---

## 2. Stack technique
- **Frontend** : Angular 21 (standalone components, signals, @if/@for, Tailwind CSS)
- **Backend** : Python Flask 3.0 + SQLAlchemy
- **Database** : PostgreSQL sur Supabase (déployé en production)
- **Auth** : Google OAuth 2.0 + JWT tokens (PyJWT)
- **API cible** : Google Business Profile API v1
- **Déploiement** : Render (backend) + Vercel (frontend)

---

## 3. Flux d'authentification
1. User clique "Se connecter avec Google" → `/auth/login`
2. Backend génère URL OAuth Google → retourne `{auth_url}`
3. Frontend redirige → `window.location.href = auth_url`
4. Google redirige → `/auth/callback?code=...`
5. Backend échange code contre token Google
6. Backend crée/met à jour User en BDD avec `google_id` (string) + génère JWT
7. JWT contient : `{user_id: User.id (integer), email, name, google_access_token}`
8. Backend redirige → `https://gmb-manager.vercel.app/auth/callback?token=JWT`
9. Frontend stocke JWT dans `localStorage('auth_token')`
10. Frontend redirige → `/dashboard`
11. Toutes les requêtes API incluent : `Authorization: Bearer JWT`

---

## 4. Ce qui fonctionne ✅

### Authentification & Sécurité
- ✅ Authentification Google OAuth 2.0 complète (scopes: email, profile, openid, business.manage)
- ✅ JWT tokens avec `google_access_token` inclus
- ✅ Auth guard basé sur `localStorage('auth_token')`
- ✅ Auth interceptor (ajoute Bearer token automatiquement)
- ✅ Déconnexion avec suppression localStorage
- ✅ Décorateur `@token_required` avec conversion string→integer pour backward compatibility

### Base de données
- ✅ PostgreSQL sur Supabase (connecté et fonctionnel)
- ✅ Modèles SQLAlchemy : User (BigInteger ID), Fiche, Avis, Publication
- ✅ User.id : BigInteger (autoincrement)
- ✅ User.google_id : String (clé unique)
- ✅ Fiche.user_id : BigInteger (clé étrangère → User.id)
- ✅ Fallback démo : 3-level cascade (Google API → BDD → Démo)
- ✅ Script seed.py idempotent avec 4 fiches démo de Rouvroy 62320

### Intégration Google Business Profile API
- ✅ GET `/api/gmb/fiches` appelle l'API réelle Google Business Profile
- ✅ Récupère les vrais comptes via Account Management API
- ✅ Récupère les locations/fiches via Business Information API
- ✅ Mappe les données Google au format interne
- ✅ Fallback automatique sur fiches démo en cas d'erreur (token expiré, API inaccessible, timeouts)
- ✅ Logging détaillé pour debugging des appels API
- ⏳ Quota à 0 : demande d'accès en attente via https://support.google.com/business/contact/api_default

### Frontend Angular
- ✅ Dashboard avec liste des fiches + filtre (vraies ou démo)
- ✅ Score de complétude /100 avec barre colorée (rouge <40, orange <70, vert ≥70)
- ✅ Navigation vers détail fiche `/fiche/:id`
- ✅ Formulaire d'édition fiche + sauvegarde PUT `/api/gmb/fiches/:id`
- ✅ Recalcul score après modification
- ✅ Page Avis `/avis/:id` :
  - Liste avis avec étoiles, auteur, date, commentaire
  - Réponses inline via textarea
  - POST `/api/avis/fiches/:id/avis/:avis_id/reponse`
- ✅ Page Publications `/publications/:id` :
  - Liste publications (titre, contenu, date, statut)
  - Formulaire création
  - POST `/api/publications/fiches/:id/posts`

### Déploiement ✅
- ✅ **Backend sur Render** : https://gmb-manager-backend.onrender.com
  - Docker/Gunicorn configuré
  - render.yaml + Procfile
  - Variables d'environnement configurées
- ✅ **Frontend sur Vercel** : https://gmb-manager-oqs8pqphi-dchirezs-projects.vercel.app
  - Build Angular en production
  - Root directory : `frontend`
  - Output directory : `dist/gmb-manager`
- ✅ **Flux OAuth en production** : Google Cloud Console mis à jour

---

## 5. Bugs fixés en session 31/03/2026

### Bug 1 : `datetime.utcnow()` n'existe pas
- **Ligne 342 app.py** : `datetime.utcnow()` → `datetime.now()`
- **Impact** : Erreur lors de la sauvegarde de fiche

### Bug 2 : Mismatch user_id dans JWT
- **Avant** : JWT encodait `google_id` (string) au lieu de `User.id` (integer)
- **Après** : JWT encode toujours `user_id: user.id` (integer)
- **Backward compatibility** : Décorateur `@token_required` convertit les anciennes strings en int

### Bug 3 : Integer overflow PostgreSQL
- **Problème** : `google_id` (111274587522935247512) dépassait Integer max en PostgreSQL
- **Solution** : Migrer colonnes en BIGINT
  - User.id : Integer → BigInteger
  - Fiche.user_id : Integer → BigInteger
- **Migration SQL exécutée sur Supabase** :
  ```sql
  ALTER TABLE users ALTER COLUMN id TYPE BIGINT;
  ALTER TABLE fiches ALTER COLUMN user_id TYPE BIGINT;
  ```

---

## 6. Pas encore implémenté ❌

### Haute priorité
- ❌ **API Google quota** : Demande d'accès "Application for Basic API Access" (https://support.google.com/business/contact/api_default)
- ❌ **Synchronisation fiches** : PUT `/api/gmb/fiches/:id` ne sauvegarde que en BDD, pas sur GMB API
- ❌ **Avis/Publications temps réel** : Actuellement mode démo, pas d'intégration API Google

### Fonctionnalités pertinentes à ajouter
- 📋 **Export données** : CSV/PDF des fiches et avis
- 📊 **Statistiques avancées** : Tendance avis/mois, comparaison avec concurrents
- 🔔 **Notifications** : Alertes pour avis négatifs, tâches à compléter
- 📱 **Mode mobile** : Responsive design + PWA pour gestion en déplacement
- 🔍 **Recherche avancée** : Filtre par catégorie, localité, score
- 💬 **Modération avis** : Système de réponse avec approbation
- 📸 **Galerie photos** : Upload/gestion images des fiches
- 📅 **Calendrier événements** : Événements/promotions directement depuis l'app
- ⚙️ **Settings utilisateur** : Préférences, thème, langue
- 🔐 **2FA** : Authentification double facteur
- 👥 **Gestion équipe** : Rôles/permissions pour petites équipes

---

## 7. Variables d'environnement (.env)

### Backend
```bash
# Google OAuth 2.0
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://gmb-manager-backend.onrender.com/auth/callback

# Flask Configuration
FRONTEND_URL=https://gmb-manager-oqs8pqphi-dchirezs-projects.vercel.app
SECRET_KEY=gmb-manager-super-secret-key-2026
FLASK_ENV=production

# Database Configuration (PostgreSQL/Supabase)
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/gmb_manager
```

### Frontend (environment.prod.ts)
```typescript
apiUrl: 'https://gmb-manager-backend.onrender.com'
```

---

## 8. Points techniques importants

### Architecture
- Imports Python absolus : `from services.xxx import xxx`
- Auth flow : OAuth2 + JWT + localStorage
- Fallback 3 niveaux : Google API → Supabase → Démo data
- BigInteger pour User.id et Fiche.user_id (PostgreSQL limitation)

### Backend
- `OAUTHLIB_INSECURE_TRANSPORT=1` requis en dev (HTTP local) — désactivé en production
- `OAUTHLIB_RELAX_TOKEN_SCOPE=1` requis (Google réorganise les scopes)
- `SESSION_TYPE=filesystem` dans app.py
- Migration `migrate_to_bigint()` appliquée au `@app.before_request`
- Décorateur `@token_required` valide JWT + convertit user_id en int

### Frontend
- localStorage key uniforme : `'auth_token'`
- Angular 21 standalone components + signals
- Interceptor ajoute `Authorization: Bearer` automatiquement
- environment.ts (dev) vs environment.prod.ts (prod)

### Database
- PostgreSQL Supabase avec colonnes BIGINT pour user_id
- Relations cascade : delete User → delete ses Fiches, Avis, Publications
- Scripts idempotents pour seed (safe à rejouer)

---

## 9. Lancer le projet

### Backend (développement)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Remplir : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DATABASE_URL
python app.py
```

Tables SQLAlchemy créées automatiquement. Pour peupler démo :
```bash
python seed.py
```

### Backend (production sur Render)
```bash
# Push code sur GitHub
# Render redéploie automatiquement avec env vars configurées
# Vérifier logs : https://dashboard.render.com → gmb-manager-backend → Logs
```

### Frontend (développement)
```bash
cd frontend
npm install
ng serve  # Port 4200
```

### Frontend (production sur Vercel)
```bash
ng build --configuration=production
# Déploie automatiquement depuis GitHub
# URL : https://gmb-manager-oqs8pqphi-dchirezs-projects.vercel.app
```

---

## 10. Routes API

### Authentication
- `GET /auth/login` — Retourne URL OAuth Google
- `GET /auth/callback?code=...` — Exchange code pour JWT
- `GET /auth/me` — Infos utilisateur (requires JWT)

### Fiches GMB
- `GET /api/gmb/fiches` — Liste fiches (vraies ou démo)
- `GET /api/gmb/fiches/:id` — Détail une fiche
- `PUT /api/gmb/fiches/:id` — Éditer fiche (BDD seulement, pas GMB API)
- `GET /api/gmb/debug` — Debug API Google (logs détaillés)

### Avis
- `GET /api/avis/fiches/:fiche_id/avis` — Liste avis fiche
- `POST /api/avis/fiches/:fiche_id/avis/:avis_id/reponse` — Répondre avis

### Publications
- `GET /api/publications/fiches/:fiche_id/posts` — Liste publications
- `POST /api/publications/fiches/:fiche_id/posts` — Créer publication

---

## 11. Debugging

### Vérifier JWT en localStorage
```javascript
// Dans console browser
JSON.parse(atob(localStorage.getItem('auth_token').split('.')[1]))
```

### Vérifier appels API backend
```bash
# Logs Render
curl https://gmb-manager-backend.onrender.com/api/gmb/debug -H "Authorization: Bearer JWT"
```

### Vérifier variables d'env Render
```
Dashboard Render → gmb-manager-backend → Settings → Environment
```

### Reset base de données (développement)
```python
# app.py : __main__
db.drop_all()
db.create_all()
# Puis python seed.py
```

---

## 12. Prochaines étapes prioritaires

1. ✅ **Déploiement complet** (31/03/2026)
   - ✅ Backend sur Render
   - ✅ Frontend sur Vercel
   - ✅ OAuth en production
   - ✅ BDD Supabase

2. ⏳ **Débloquer API Google Business Profile** (~1-2 semaines)
   - Soumettre demande via https://support.google.com/business/contact/api_default
   - Vérifier quota & scopes une fois approuvé
   - Tester vraies données

3. 📋 **Features prioritaires après approval Google**
   - Synchronisation vraies fiches (PUT /api/gmb/fiches/:id → GMB API)
   - Gestion avis/publications temps réel
   - Export données (CSV/PDF)

4. 📊 **Optimisations**
   - Analytics (qui accède, quand, quoi)
   - Caching API Google (TTL 1h)
   - Monitoring production (uptime, errors)

---

## 13. Contacts & Resources

- **Google Business Profile API** : https://developers.google.com/my-business/content/rest-api-overview
- **Supabase docs** : https://supabase.com/docs
- **Angular 21 docs** : https://angular.io/docs
- **Flask docs** : https://flask.palletsprojects.com
- **Render docs** : https://render.com/docs
- **Vercel docs** : https://vercel.com/docs

---

**Dernière mise à jour** : 31/03/2026 — Session déploiement complet + bug fixes production
