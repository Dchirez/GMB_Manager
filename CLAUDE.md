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
- Authentification Google OAuth 2.0 complète
- JWT tokens (génération + validation)
- Auth guard basé sur localStorage
- Auth interceptor (ajoute Bearer token automatiquement)
- Dashboard avec liste des 4 fiches démo de Rouvroy
- Score de complétude /100 avec barre de progression colorée
  (rouge <40, orange <70, vert ≥70)
- Navigation vers détail d'une fiche (/fiche/:id)
- Affichage détail fiche avec formulaire d'édition
- Sauvegarde fiche PUT /gmb/fiches/:id en mode démo
- Redirection vers /dashboard après sauvegarde fiche ✅
- Recalcul score après modification fiche ✅
- Déconnexion avec suppression localStorage
- Page Avis (/avis/:id) :
  * Liste avis avec étoiles, auteur, date, commentaire
  * Note moyenne en haut
  * Réponse inline via textarea + POST /avis/fiches/:id/avis/:avis_id/reponse
- Page Publications (/publications/:id) :
  * Liste publications existantes (titre, contenu, date, statut)
  * Formulaire création + POST /publications/fiches/:id/posts
- Mode démo avec 4 vrais commerces de Rouvroy :
  * Boulangerie Martin (score: 30/100)
  * Karact'Hair (score: 70/100)
  * Friterie Aux Bonnes Saveurs (score: 30/100)
  * MS Automobiles (score: 30/100)

## 5. Lier le dépôt distant et pousser
```bash
git remote add origin https://github.com/Dchirez/GMB_Manager.git
git branch -M main
git push -u origin main
```

## 6. Pas encore implémenté ❌
- Connexion aux vraies données GMB (nécessite compte Google Business)
- Persistance des données (base de données) — actuellement tout en mémoire

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

## 10. Prochaines étapes prioritaires
1. Connecter les vraies données GMB (compte Google Business requis)
2. Ajouter une base de données (SQLite ou PostgreSQL) pour persister les données
3. Déploiement (Render pour le backend, Vercel pour le frontend)
