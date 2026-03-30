# GMB Manager

Application web de gestion et d'optimisation des fiches Google My Business pour les petits commerces locaux.

## 🚀 Stack Technique

- **Frontend**: Angular 21 (standalone components, signals, @if/@for)
- **Backend**: Python Flask 3.0
- **Auth**: Google OAuth 2.0 + JWT tokens (PyJWT)
- **Styling**: Tailwind CSS
- **API**: Google Business Profile API v1

## 📋 Fonctionnalités

- ✅ Authentification Google OAuth 2.0
- ✅ Gestion des fiches Google My Business
- ✅ Calcul automatique du score de complétude (0-100)
- ✅ Gestion des avis clients
- ✅ Création et gestion des publications
- ✅ Dashboard avec vue d'ensemble des fiches
- ✅ 4 commerces démo de Rouvroy 62320

## 🛠️ Installation

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Remplir les variables d'environnement
python app.py
```

Le backend démarre sur `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
ng serve
```

Le frontend démarre sur `http://localhost:4200`

## 📚 Architecture

```
GMB_Manager/
├── backend/
│   ├── app.py                 # Application Flask principale
│   ├── requirements.txt       # Dépendances Python
│   ├── .env.example          # Variables d'environnement
│   ├── services/
│   │   ├── auth_service.py    # Service OAuth 2.0
│   │   └── gmb_service.py     # Service GMB
│   └── __init__.py
├── frontend/
│   ├── src/
│   │   ├── main.ts           # Point d'entrée
│   │   ├── index.html        # HTML
│   │   ├── styles.css        # Styles Tailwind
│   │   └── app/
│   │       ├── app.routes.ts
│   │       ├── app.config.ts
│   │       ├── app.component.ts
│   │       ├── components/
│   │       ├── services/
│   │       ├── guards/
│   │       └── interceptors/
│   ├── angular.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── CLAUDE.md
├── README.md
└── .gitignore
```

## 🔐 Variables d'Environnement

Créer un fichier `.env` dans le dossier `backend/`:

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/callback
FRONTEND_URL=http://localhost:4200
SECRET_KEY=gmb-manager-super-secret-key-2026
FLASK_ENV=development
```

## 📊 Données Démo

Le projet inclut 4 vrais commerces de Rouvroy 62320:
- Boulangerie Martin
- Karact'Hair
- Friterie Aux Bonnes Saveurs
- MS Automobiles

## 🔗 Routes API

### Authentification
- `GET /auth/login` - Récupère l'URL Google OAuth
- `GET /auth/callback?code=...` - Callback OAuth
- `GET /auth/me` - Infos utilisateur (requiert JWT)

### Fiches GMB
- `GET /api/gmb/fiches` - Liste toutes les fiches
- `GET /api/gmb/fiches/:id` - Détail d'une fiche
- `PUT /api/gmb/fiches/:id` - Mise à jour fiche

### Avis
- `GET /api/avis/fiches/:id/avis` - Liste des avis
- `POST /api/avis/fiches/:id/avis/:avis_id/reponse` - Ajouter réponse

### Publications
- `GET /api/publications/fiches/:id/posts` - Liste publications
- `POST /api/publications/fiches/:id/posts` - Créer publication

## 📈 Calcul du Score

Le score de complétude se calcule ainsi:
- Nom: 20 pts
- Téléphone: 15 pts
- Adresse: 15 pts
- Site web: 15 pts
- Horaires: 20 pts
- Description: 15 pts

**Total: 100 pts max**

## 🎨 Barre de Progression

- 🔴 Rouge: Score < 40
- 🟠 Orange: Score 40-69
- 🟢 Vert: Score ≥ 70

## 🔄 Flux d'Authentification

1. User clique "Se connecter avec Google"
2. Backend génère URL OAuth Google
3. Google authentifie l'utilisateur
4. Google redirige vers `/auth/callback?code=...`
5. Backend échange le code contre un token Google
6. Backend génère un JWT avec les infos utilisateur
7. Frontend reçoit le JWT et le stocke dans `localStorage('auth_token')`
8. Frontend redirige vers le dashboard
9. Toutes les requêtes API incluent l'header `Authorization: Bearer <JWT>`

## 🚀 Prochaines Étapes

- [ ] Connexion aux vraies données GMB (compte Google Business requis)
- [ ] Persistance des données (base de données)
- [ ] Déploiement (Render + Vercel)
- [ ] Tests unitaires et E2E
- [ ] Documentation API

## 📝 Notes de Développement

- Angular 21 standalone components (PAS de NgModule)
- Signals pour la réactivité
- @if/@for pour les directives
- Imports absolus en Python (`from services.xxx import xxx`)
- `OAUTHLIB_INSECURE_TRANSPORT=1` requis en dev (HTTP local)
- `OAUTHLIB_RELAX_TOKEN_SCOPE=1` requis (Google)

## 📄 Licence

MIT

---

**Auteur**: Dchirez
**Création**: 2026
