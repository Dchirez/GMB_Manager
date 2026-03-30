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

### Intégration Google Business Profile API (NEW)
- GET /api/gmb/fiches appelle maintenant l'API réelle Google Business Profile
  * Récupère les vrais comptes via Account Management API
  * Récupère les locations/fiches via Business Information API
  * Mappe les données Google au format interne
  * Fallback automatique sur fiches démo en cas d'erreur
- Logging détaillé des appels API pour debugging
- Gestion des erreurs (token expiré, API inaccessible, timeouts)
- Scope OAuth : userinfo.email, userinfo.profile, openid, business.manage

### Frontend Angular
- Dashboard avec liste des fiches (vraies ou démo)
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
  * Liste publications existantes (titre, contenu, date, statut)
  * Formulaire création + POST /publications/fiches/:id/posts

### Mode démo avec 4 vrais commerces de Rouvroy
- Boulangerie Martin (score: 30/100)
- Karact'Hair (score: 70/100)
- Friterie Aux Bonnes Saveurs (score: 30/100)
- MS Automobiles (score: 30/100)
- Accessible si pas de vraies fiches GMB disponibles

## 5. Lier le dépôt distant et pousser
```bash
git remote add origin https://github.com/Dchirez/GMB_Manager.git
git branch -M main
git push -u origin main
```

## 6. Pas encore implémenté ❌
- Persistance des modifications de fiches (base de données) — actuellement en mémoire
- Synchronisation des éditions avec l'API Google Business Profile
- Gestion des avis & publications en temps réel via API Google

## 7. Variables d'environnement requises (.env)
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/callback
FRONTEND_URL=http://localhost:4200
SECRET_KEY=gmb-manager-super-secret-key-2026
FLASK_ENV=development
```

## 8. Points techniques importants
- OAUTHLIB_INSECURE_TRANSPORT=1 requis en dev (HTTP local)
- OAUTHLIB_RELAX_TOKEN_SCOPE=1 requis (Google réorganise les scopes)
- localStorage key : 'auth_token' (uniforme partout)
- Imports Python absolus (from services.xxx import xxx)
- SESSION_TYPE=filesystem dans app.py

## 9. Lancer le projet

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # remplir les vraies valeurs
python app.py
```

### Frontend
```bash
cd frontend
npm install
ng serve
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

## 10. Prochaines étapes prioritaires
1. Tester avec un vrai compte Google Business (vérifier appels API réussis)
2. Implémenter PUT /gmb/fiches/:id pour synchroniser les éditions avec Google Business Profile API
3. Ajouter une base de données (SQLite ou PostgreSQL) pour persister les modifications locales
4. Intégrer l'API GMB pour les avis et publications (lecture et écriture)
5. Déploiement (Render pour le backend, Vercel pour le frontend)
