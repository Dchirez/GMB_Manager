import os
import json
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, redirect, session
from flask_cors import CORS
from flask_session import Session
import jwt
from functools import wraps

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'gmb-manager-super-secret-key-2026')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True

# Initialize Flask-Session
Session(app)

# CORS Configuration
CORS(app, resources={
    r"/api/*": {
        "origins": [os.getenv('FRONTEND_URL', 'http://localhost:4200')],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    },
    r"/auth/*": {
        "origins": [os.getenv('FRONTEND_URL', 'http://localhost:4200')],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Demo data - Fiches
FICHES_DEMO = [
    {
        "id": "1",
        "nom": "Boulangerie Martin",
        "categorie": "Boulangerie",
        "adresse": "12 Rue de la Paix, Rouvroy 62320",
        "telephone": "03 21 00 00 01",
        "site_web": "",
        "horaires": "",
        "description": "",
        "score": 30
    },
    {
        "id": "2",
        "nom": "Karact'Hair",
        "categorie": "Coiffeur",
        "adresse": "5 Rue du Commerce, Rouvroy 62320",
        "telephone": "03 21 00 00 02",
        "site_web": "https://karacthair.fr",
        "horaires": "Lun-Sam 9h-19h",
        "description": "Salon de coiffure mixte",
        "score": 70
    },
    {
        "id": "3",
        "nom": "Friterie Aux Bonnes Saveurs",
        "categorie": "Restauration rapide",
        "adresse": "8 Avenue de la Liberté, Rouvroy 62320",
        "telephone": "03 21 00 00 03",
        "site_web": "",
        "horaires": "",
        "description": "",
        "score": 30
    },
    {
        "id": "4",
        "nom": "MS Automobiles",
        "categorie": "Garage automobile",
        "adresse": "22 Rue Nationale, Rouvroy 62320",
        "telephone": "03 21 00 00 04",
        "site_web": "",
        "horaires": "",
        "description": "",
        "score": 30
    }
]

# Demo data - Avis
AVIS_DEMO = {
    "1": [
        {"id": "a1", "auteur": "Marie D.", "note": 5, "date": "2024-12-01", "commentaire": "Excellent pain, toujours frais !", "reponse": None},
        {"id": "a2", "auteur": "Jean P.", "note": 4, "date": "2024-11-15", "commentaire": "Bonnes viennoiseries mais parfois en rupture.", "reponse": None},
        {"id": "a3", "auteur": "Sophie L.", "note": 3, "date": "2024-10-20", "commentaire": "Service un peu lent le matin.", "reponse": None}
    ],
    "2": [
        {"id": "a4", "auteur": "Claire M.", "note": 5, "date": "2024-12-10", "commentaire": "Super coiffeur, résultat impeccable !", "reponse": "Merci Claire, à bientôt !"},
        {"id": "a5", "auteur": "Lucas B.", "note": 4, "date": "2024-11-28", "commentaire": "Bon accueil, tarifs raisonnables.", "reponse": None}
    ],
    "3": [
        {"id": "a6", "auteur": "Thomas R.", "note": 5, "date": "2024-12-05", "commentaire": "Les meilleures frites du coin !", "reponse": None},
        {"id": "a7", "auteur": "Emma V.", "note": 2, "date": "2024-10-01", "commentaire": "Attente trop longue.", "reponse": None}
    ],
    "4": [
        {"id": "a8", "auteur": "Pierre N.", "note": 4, "date": "2024-11-10", "commentaire": "Travail soigné, prix honnêtes.", "reponse": None}
    ]
}

# Demo data - Publications
PUBLICATIONS_DEMO = {
    "1": [
        {"id": "p1", "titre": "Nouveauté : Pain au levain", "contenu": "Découvrez notre nouveau pain au levain artisanal, disponible chaque matin !", "date": "2024-12-01", "statut": "publié"},
        {"id": "p2", "titre": "Fermé le 25 décembre", "contenu": "La boulangerie sera fermée le jour de Noël. Joyeuses fêtes !", "date": "2024-11-20", "statut": "publié"}
    ],
    "2": [
        {"id": "p3", "titre": "Promotion janvier", "contenu": "-20% sur toutes les colorations en janvier !", "date": "2024-12-15", "statut": "publié"}
    ],
    "3": [],
    "4": [
        {"id": "p4", "titre": "Révision hivernale", "contenu": "Préparez votre voiture pour l'hiver : contrôle gratuit jusqu'au 31 janvier.", "date": "2024-12-10", "statut": "publié"}
    ]
}

def calculer_score(fiche):
    """Calcul du score de complétude de la fiche (0-100)"""
    score = 0
    if fiche.get("nom"):
        score += 20
    if fiche.get("telephone"):
        score += 15
    if fiche.get("adresse"):
        score += 15
    if fiche.get("site_web"):
        score += 15
    if fiche.get("horaires"):
        score += 20
    if fiche.get("description"):
        score += 15
    return score

def token_required(f):
    """Décorateur pour valider le JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Check Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Invalid Authorization header format'}), 401

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated

# ==================== AUTH ROUTES ====================

@app.route('/auth/login', methods=['GET'])
def auth_login():
    """
    Retourne l'URL d'authentification Google OAuth 2.0
    """
    from services.auth_service import get_google_auth_url
    try:
        auth_url = get_google_auth_url()
        return jsonify({'auth_url': auth_url}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/auth/callback', methods=['GET'])
def auth_callback():
    """
    Récupère le code d'autorisation Google et génère un JWT
    """
    from services.auth_service import exchange_code_for_token

    code = request.args.get('code')
    if not code:
        return jsonify({'error': 'Missing authorization code'}), 400

    try:
        user_data, access_token = exchange_code_for_token(code)

        # Générer JWT
        jwt_token = jwt.encode({
            'user_id': user_data.get('sub'),
            'email': user_data.get('email'),
            'name': user_data.get('name'),
            'google_access_token': access_token
        }, app.config['SECRET_KEY'], algorithm='HS256')

        # Rediriger vers le frontend avec le token
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:4200')
        return redirect(f'{frontend_url}/auth/callback?token={jwt_token}')

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/auth/me', methods=['GET'])
@token_required
def auth_me():
    """
    Retourne les informations de l'utilisateur authentifié
    """
    return jsonify({
        'user_id': request.user.get('user_id'),
        'email': request.user.get('email'),
        'name': request.user.get('name')
    }), 200

# ==================== GMB ROUTES ====================

@app.route('/api/gmb/fiches', methods=['GET'])
@token_required
def get_fiches():
    """Retourne la liste de toutes les fiches"""
    return jsonify(FICHES_DEMO), 200

@app.route('/api/gmb/fiches/<fiche_id>', methods=['GET'])
@token_required
def get_fiche(fiche_id):
    """Retourne une fiche spécifique"""
    for fiche in FICHES_DEMO:
        if fiche['id'] == fiche_id:
            return jsonify(fiche), 200
    return jsonify({'error': 'Fiche not found'}), 404

@app.route('/api/gmb/fiches/<fiche_id>', methods=['PUT'])
@token_required
def update_fiche(fiche_id):
    """Met à jour une fiche et recalcule le score"""
    data = request.get_json()

    for fiche in FICHES_DEMO:
        if fiche['id'] == fiche_id:
            fiche.update({
                'nom': data.get('nom', fiche.get('nom')),
                'telephone': data.get('telephone', fiche.get('telephone')),
                'adresse': data.get('adresse', fiche.get('adresse')),
                'site_web': data.get('site_web', fiche.get('site_web')),
                'horaires': data.get('horaires', fiche.get('horaires')),
                'description': data.get('description', fiche.get('description')),
            })
            fiche['score'] = calculer_score(fiche)
            return jsonify(fiche), 200

    return jsonify({'error': 'Fiche not found'}), 404

# ==================== AVIS ROUTES ====================

@app.route('/api/avis/fiches/<fiche_id>/avis', methods=['GET'])
@token_required
def get_avis(fiche_id):
    """Retourne la liste des avis pour une fiche"""
    avis = AVIS_DEMO.get(fiche_id, [])
    return jsonify(avis), 200

@app.route('/api/avis/fiches/<fiche_id>/avis/<avis_id>/reponse', methods=['POST'])
@token_required
def post_reponse(fiche_id, avis_id):
    """Ajoute une réponse à un avis"""
    data = request.get_json()
    reponse_text = data.get('reponse')

    if not reponse_text:
        return jsonify({'error': 'Reponse text is required'}), 400

    if fiche_id not in AVIS_DEMO:
        return jsonify({'error': 'Fiche not found'}), 404

    for avis in AVIS_DEMO[fiche_id]:
        if avis['id'] == avis_id:
            avis['reponse'] = reponse_text
            return jsonify(avis), 200

    return jsonify({'error': 'Avis not found'}), 404

# ==================== PUBLICATIONS ROUTES ====================

@app.route('/api/publications/fiches/<fiche_id>/posts', methods=['GET'])
@token_required
def get_publications(fiche_id):
    """Retourne la liste des publications pour une fiche"""
    publications = PUBLICATIONS_DEMO.get(fiche_id, [])
    return jsonify(publications), 200

@app.route('/api/publications/fiches/<fiche_id>/posts', methods=['POST'])
@token_required
def create_publication(fiche_id):
    """Crée une nouvelle publication"""
    data = request.get_json()
    titre = data.get('titre')
    contenu = data.get('contenu')

    if not titre or not contenu:
        return jsonify({'error': 'Titre and contenu are required'}), 400

    if fiche_id not in PUBLICATIONS_DEMO:
        PUBLICATIONS_DEMO[fiche_id] = []

    # Générer un ID pour la publication
    max_id = 0
    for publications in PUBLICATIONS_DEMO.values():
        for pub in publications:
            try:
                pub_num = int(pub['id'][1:])
                max_id = max(max_id, pub_num)
            except:
                pass

    new_publication = {
        'id': f'p{max_id + 1}',
        'titre': titre,
        'contenu': contenu,
        'date': datetime.now().strftime('%Y-%m-%d'),
        'statut': 'publié'
    }

    PUBLICATIONS_DEMO[fiche_id].append(new_publication)
    return jsonify(new_publication), 201

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
