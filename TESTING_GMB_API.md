# Guide de Test - Google Business Profile API

## Objectif
Valider que l'intégration Google Business Profile API fonctionne correctement.

## Prérequis
1. ✅ Configuration des credentials Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET dans .env)
2. ✅ Un compte Google avec Google Business Profile
3. ✅ Permissions : La personne connectée doit être propriétaire ou manager d'au moins une fiche GMB
4. ✅ Backend Flask démarré sur http://localhost:5000
5. ✅ Frontend Angular démarré sur http://localhost:4200

## Étapes du test

### 1. Lancer le backend en mode debug
```bash
cd backend
export FLASK_ENV=development  # Linux/Mac
# ou
set FLASK_ENV=development     # Windows CMD

python app.py
```

Vérifier que le backend démarre sans erreur et expose:
- POST /auth/login
- GET /auth/callback
- GET /api/gmb/fiches
- GET /api/gmb/fiches/:id

### 2. Lancer le frontend
```bash
cd frontend
ng serve
```

Naviguer vers http://localhost:4200

### 3. Tester l'authentification Google

1. Cliquer sur le bouton "Se connecter avec Google"
2. Choisir un compte avec Google Business Profile
3. Autoriser les permissions demandées (incluant "business.manage")
4. Être redirigé vers le dashboard

**Vérifier dans la console du navigateur:**
```javascript
// Dans la console du navigateur
localStorage.getItem('auth_token')
// Devrait retourner le JWT
```

### 4. Tester la récupération des vraies fiches GMB

Ouvrir la console du backend et observer les logs:

```
INFO:app:Récupération des fiches pour l'utilisateur user@example.com
INFO:services.gmb_service:Récupération des comptes GMB...
INFO:services.gmb_service:Récupération des comptes GMB...
INFO:services.gmb_service:Trouvé 1 compte(s) GMB
INFO:services.gmb_service:Récupération des locations du compte accounts/123456...
INFO:services.gmb_service:Trouvé 3 location(s) pour le compte accounts/123456
INFO:services.gmb_service:Récupération réussie: 3 fiche(s)
```

### 5. Vérifier la réponse du dashboard

Vous devriez voir:
- ✅ Les vraies fiches GMB au lieu des fiches démo
- ✅ Les scores de complétude calculés correctement
- ✅ Les barres de progression colorées (rouge/orange/vert)
- ✅ Les données (nom, adresse, téléphone, site web, horaires, description) mappées depuis Google

### 6. Tester les cas d'erreur

#### Cas 1: Token expiré
1. Attendre 1h (ou forcer l'expiration du token)
2. Faire un appel API
3. Vérifier que les fiches démo s'affichent en fallback

#### Cas 2: Aucune fiche GMB
1. Se connecter avec un compte sans Google Business Profile
2. Vérifier que les fiches démo s'affichent
3. Vérifier le log: `Aucun compte GMB trouvé pour l'utilisateur`

#### Cas 3: Timeout API
1. Interrompre la connexion réseau
2. Relancer GET /api/gmb/fiches
3. Vérifier que les fiches démo s'affichent (fallback)

## Checks détaillés de l'API

### Vérifier les appels API réussis
```bash
# Dans le backend, ajouter des prints dans gmb_service.py pour logger:
print(f"accounts_response.status_code: {accounts_response.status_code}")
print(f"accounts_response.json(): {accounts_response.json()}")
```

### Vérifier le JWT contient le google_access_token
```bash
# Décoder le JWT (utiliser jwt.io ou un script Python)
import jwt
token = "your_jwt_token_from_localStorage"
decoded = jwt.decode(token, options={"verify_signature": False})
print(decoded['google_access_token'])  # Devrait contenir le token Google
```

### Vérifier les appels cURL (optionnel)
```bash
# Récupérer le access_token depuis la réponse d'authentification
GOOGLE_TOKEN="your_google_access_token"

# Tester Account Management API
curl -H "Authorization: Bearer $GOOGLE_TOKEN" \
  https://mybusinessaccountmanagement.googleapis.com/v1/accounts

# Tester Business Information API
curl -H "Authorization: Bearer $GOOGLE_TOKEN" \
  "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/YOUR_ACCOUNT_ID/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,profile"
```

## Résultats attendus

### Cas de succès
- ✅ Dashboard affiche N fiches GMB (N = nombre de locations dans le compte)
- ✅ Chaque fiche a: id, nom, adresse, téléphone, site_web, horaires, description, score
- ✅ Les scores sont entre 0-100
- ✅ Les barres de progression sont colorées correctement
- ✅ Les logs du backend montrent les étapes de récupération

### Cas de fallback (erreur)
- ✅ Dashboard affiche les 4 fiches démo
- ✅ Les logs montrent l'erreur et le fallback
- ✅ Pas d'erreur JavaScript dans la console du navigateur

## Debugging avancé

### Activer les logs détaillés
Dans `backend/app.py`, avant `app.run()`:
```python
logging.basicConfig(
    level=logging.DEBUG,
    format='%(name)s - %(levelname)s - %(message)s'
)
```

### Inspecter les réponses API
Ajouter dans `backend/services/gmb_service.py`:
```python
logger.debug(f"accounts_response: {accounts_response.json()}")
logger.debug(f"locations_response: {locations_response.json()}")
```

### Tester les scopes
Vérifier que tous les scopes sont demandés:
- ✅ `https://www.googleapis.com/auth/userinfo.email`
- ✅ `https://www.googleapis.com/auth/userinfo.profile`
- ✅ `openid`
- ✅ `https://www.googleapis.com/auth/business.manage`

## Limitations connues

1. **Éditions non-synchronisées**: Les modifications de fiche (PUT /gmb/fiches/:id) ne sont **PAS** synchronisées avec l'API Google. Elles sont stockées en mémoire localement.

2. **Avis et Publications**: Les avis et publications restent des données démo. L'intégration avec l'API Google Business Profile n'est pas encore implémentée.

3. **Cache en mémoire**: Les fiches sont cachées en mémoire. À chaque redémarrage du backend, elles sont réinitialisées.

## Prochaines étapes (post-test)

1. ✅ Implémenter PUT /gmb/fiches/:id pour synchroniser avec Google Business Profile API
2. ✅ Ajouter une base de données pour persister les modifications
3. ✅ Intégrer l'API Google pour les avis et publications
4. ✅ Tester en production

---

**Auteur**: GMB Manager Dev Team
**Date**: 2026-03-30
