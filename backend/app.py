import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, redirect, session
from flask_cors import CORS
from flask_session import Session
import jwt
import requests
from sqlalchemy import text
from services.gmb_service import get_fiches_by_user, calculer_score
from models import db, User, Fiche, Avis, Publication, Notification, Photo
from routes.stats import stats_bp
from routes.notifications import notifications_bp, generate_notifications
from routes.photos import photos_bp
from utils.decorators import token_required

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Set OAuth insecure transport flag for development only
if os.getenv('FLASK_ENV') == 'development':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'gmb-manager-super-secret-key-2026')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'sqlite:///gmb_manager.db'  # Fallback to SQLite for development
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

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

# Register blueprints
app.register_blueprint(stats_bp, url_prefix='/api/stats')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(photos_bp, url_prefix='/api/photos')

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Backend is running'})

# Demo data - Fiches (fallback if database is empty)
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

# Demo data - Avis (fallback if database is empty)
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

# Demo data - Publications (fallback if database is empty)
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
        logger.info(f"OAuth user_data received: {user_data.keys()}")

        # Extract google_id (sub from OpenID Connect) with fallback to id, then email
        google_id = user_data.get('sub') or user_data.get('id')
        email = user_data.get('email')
        name = user_data.get('name', 'Unknown User')

        if not google_id:
            # Final fallback: use email as unique identifier
            if not email:
                raise Exception("Cannot identify user: missing both sub/id and email")
            google_id = f'email_{email}'
            logger.warning(f"Using email-based google_id: {google_id}")
        else:
            logger.info(f"Google ID extracted: {google_id}")

        # Store or update user in database
        user = User.query.filter_by(google_id=google_id).first()
        if not user:
            logger.info(f"Creating new user: {email} (google_id={google_id})")
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                google_access_token=access_token
            )
            db.session.add(user)
            db.session.commit()

            # Create demo fiches for new user
            logger.info(f"Creating demo fiches for {email}")
            demo_fiches_data = [
                {
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

            for fiche_data in demo_fiches_data:
                fiche = Fiche(
                    user_id=user.id,
                    nom=fiche_data["nom"],
                    categorie=fiche_data["categorie"],
                    adresse=fiche_data["adresse"],
                    telephone=fiche_data["telephone"],
                    site_web=fiche_data["site_web"],
                    horaires=fiche_data["horaires"],
                    description=fiche_data["description"],
                    score=fiche_data["score"]
                )
                db.session.add(fiche)
            db.session.commit()
        else:
            logger.info(f"Updating existing user: {email}")
            user.google_access_token = access_token
            db.session.commit()

        # Générer JWT
        jwt_token = jwt.encode({
            'user_id': user.id,
            'email': email,
            'name': name,
            'google_access_token': access_token
        }, app.config['SECRET_KEY'], algorithm='HS256')

        # Rediriger vers le frontend avec le token
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:4200')
        logger.info(f"OAuth successful for {email}, redirecting to frontend")
        return redirect(f'{frontend_url}/auth/callback?token={jwt_token}')

    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
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

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Vérification de santé du backend + création des tables manquantes
    """
    try:
        db.create_all()
        return jsonify({
            'status': 'ok',
            'message': 'Backend healthy, all tables created'
        }), 200
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/seed-demo-fiches', methods=['POST'])
@token_required
def seed_demo_fiches():
    """
    Crée les 4 fiches démo pour l'utilisateur actuel
    Utile quand la création auto lors de l'inscription ne fonctionne pas
    """
    try:
        user_id = request.user.get('user_id')

        # Récupère l'utilisateur
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Vérifie si des fiches existent déjà
        existing = Fiche.query.filter_by(user_id=user.id).first()
        if existing:
            return jsonify({'message': 'Fiches already exist for this user'}), 200

        # Crée les 4 fiches démo
        demo_fiches_data = [
            {
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

        for fiche_data in demo_fiches_data:
            fiche = Fiche(
                user_id=user.id,
                nom=fiche_data["nom"],
                categorie=fiche_data["categorie"],
                adresse=fiche_data["adresse"],
                telephone=fiche_data["telephone"],
                site_web=fiche_data["site_web"],
                horaires=fiche_data["horaires"],
                description=fiche_data["description"],
                score=fiche_data["score"]
            )
            db.session.add(fiche)

        db.session.commit()
        logger.info(f"Created 4 demo fiches for user {user.email}")

        return jsonify({'message': '4 demo fiches created successfully'}), 201

    except Exception as e:
        logger.error(f"Error creating demo fiches: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== GMB ROUTES ====================

@app.route('/api/gmb/fiches', methods=['GET'])
@token_required
def get_fiches():
    """
    Retourne la liste des fiches de l'utilisateur.
    Ordre de priorité:
    1. Essaie Google Business Profile API (vraies données)
    2. Si Google échoue → cherche en BDD
    3. Si BDD vide → retourne FICHES_DEMO
    Génère aussi les notifications manquantes.
    """
    google_access_token = request.user.get('google_access_token')
    user_id = request.user.get('user_id')

    # Récupère l'utilisateur dans la BDD pour générer les notifications
    user = User.query.filter_by(id=user_id).first()
    if user:
        try:
            generate_notifications(user.id)
        except Exception as e:
            logger.warning(f"Erreur lors de la génération des notifications: {e}")

    # Étape 1: Tenter de récupérer les vraies fiches Google Business Profile
    if google_access_token:
        logger.info(f"Récupération des fiches pour l'utilisateur {request.user.get('email')}")
        fiches = get_fiches_by_user(google_access_token)

        if fiches:
            logger.info(f"✅ {len(fiches)} fiche(s) GMB trouvée(s)")
            return jsonify(fiches), 200
        else:
            logger.warning("Impossible de récupérer les fiches GMB, essai BDD")
    else:
        logger.warning("Pas de google_access_token disponible, essai BDD")

    # Étape 2: Chercher en BDD
    try:
        db_fiches = Fiche.query.filter_by(user_id=user_id).all()
        if db_fiches:
            logger.info(f"✅ {len(db_fiches)} fiche(s) trouvée(s) en BDD")
            return jsonify([f.to_dict() for f in db_fiches]), 200
    except Exception as e:
        logger.error(f"Erreur lors de la lecture en BDD: {e}")

    # Étape 3: Fallback sur fiches démo
    logger.info("Utilisation des fiches démo")
    return jsonify(FICHES_DEMO), 200

@app.route('/api/gmb/fiches/<fiche_id>', methods=['GET'])
@token_required
def get_fiche(fiche_id):
    """Retourne une fiche spécifique"""
    user_id = request.user.get('user_id')

    # Cherche en BDD d'abord
    try:
        fiche = Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()
        if fiche:
            return jsonify(fiche.to_dict()), 200
    except Exception as e:
        logger.error(f"Erreur lors de la lecture en BDD: {e}")

    # Fallback sur démo
    for fiche in FICHES_DEMO:
        if fiche['id'] == fiche_id:
            return jsonify(fiche), 200

    return jsonify({'error': 'Fiche not found'}), 404

@app.route('/api/gmb/fiches/<fiche_id>', methods=['PUT'])
@token_required
def update_fiche(fiche_id):
    """Met à jour une fiche et recalcule le score"""
    user_id = request.user.get('user_id')
    data = request.get_json()

    # Cherche la fiche en BDD
    try:
        fiche = Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()
        if fiche:
            fiche.nom = data.get('nom', fiche.nom)
            fiche.telephone = data.get('telephone', fiche.telephone)
            fiche.adresse = data.get('adresse', fiche.adresse)
            fiche.site_web = data.get('site_web', fiche.site_web)
            fiche.horaires = data.get('horaires', fiche.horaires)
            fiche.description = data.get('description', fiche.description)
            fiche.score = calculer_score(fiche.to_dict())
            fiche.updated_at = datetime.now()

            db.session.commit()
            return jsonify(fiche.to_dict()), 200
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour en BDD: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    # Fallback sur démo (modification en mémoire)
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

@app.route('/api/gmb/debug', methods=['GET'])
@token_required
def debug_gmb_api():
    """
    [DEBUG TEMPORAIRE] Endpoint de debug pour tester l'API Google Business Profile
    Retourne la réponse brute de l'API Google sans aucun traitement ni fallback
    """
    google_access_token = request.user.get('google_access_token')

    if not google_access_token:
        return jsonify({
            'error': 'No google_access_token in JWT',
            'user': request.user
        }), 400

    try:
        headers = {
            'Authorization': f'Bearer {google_access_token}',
            'Content-Type': 'application/json'
        }

        # Appeler l'API Google Business Profile - Account Management
        accounts_url = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
        logger.info(f"[DEBUG] Appel API: GET {accounts_url}")
        logger.info(f"[DEBUG] Token: {google_access_token[:30]}...")

        response = requests.get(accounts_url, headers=headers, timeout=10)

        logger.info(f"[DEBUG] Status: {response.status_code}")
        logger.info(f"[DEBUG] Response body length: {len(response.text)}")

        # Parser la réponse JSON si possible
        response_data = None
        try:
            response_data = response.json()
        except:
            response_data = response.text

        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'debug_info': 'Réponse brute de l\'API Google Business Profile',
            'api_endpoint': accounts_url,
            'status_code': response.status_code,
            'headers_sent': {
                'Authorization': f'Bearer {google_access_token[:30]}...',
                'Content-Type': 'application/json'
            },
            'response_headers': dict(response.headers),
            'response_body': response_data,
            'user': {
                'email': request.user.get('email'),
                'user_id': request.user.get('user_id'),
                'name': request.user.get('name')
            },
            'success': response.status_code == 200
        }), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Timeout lors de l\'appel à l\'API Google (10s)',
            'api_endpoint': 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
            'timestamp': datetime.now().isoformat()
        }), 504
    except requests.exceptions.RequestException as e:
        return jsonify({
            'error': f'Erreur de requête: {str(e)}',
            'api_endpoint': 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
            'timestamp': datetime.now().isoformat()
        }), 500
    except Exception as e:
        return jsonify({
            'error': f'Erreur inattendue: {str(e)}',
            'api_endpoint': 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
            'timestamp': datetime.now().isoformat()
        }), 500

# ==================== AVIS ROUTES ====================

@app.route('/api/avis/fiches/<fiche_id>/avis', methods=['GET'])
@token_required
def get_avis(fiche_id):
    """Retourne la liste des avis pour une fiche"""
    # Cherche en BDD d'abord
    try:
        avis_list = Avis.query.filter_by(fiche_id=fiche_id).all()
        if avis_list:
            return jsonify([a.to_dict() for a in avis_list]), 200
    except Exception as e:
        logger.error(f"Erreur lors de la lecture des avis en BDD: {e}")

    # Fallback sur démo
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

    # Cherche en BDD d'abord
    try:
        avis = Avis.query.filter_by(id=avis_id, fiche_id=fiche_id).first()
        if avis:
            avis.reponse = reponse_text
            db.session.commit()
            return jsonify(avis.to_dict()), 200
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de l'avis en BDD: {e}")
        db.session.rollback()

    # Fallback sur démo
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
    # Cherche en BDD d'abord
    try:
        publications_list = Publication.query.filter_by(fiche_id=fiche_id).all()
        if publications_list:
            return jsonify([p.to_dict() for p in publications_list]), 200
    except Exception as e:
        logger.error(f"Erreur lors de la lecture des publications en BDD: {e}")

    # Fallback sur démo
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

    # Essaie de créer en BDD
    try:
        # Génère un nouvel ID
        import uuid
        pub_id = str(uuid.uuid4())[:8]

        publication = Publication(
            id=pub_id,
            fiche_id=fiche_id,
            titre=titre,
            contenu=contenu,
            date=datetime.now().date(),
            statut='publié'
        )
        db.session.add(publication)
        db.session.commit()
        return jsonify(publication.to_dict()), 201
    except Exception as e:
        logger.error(f"Erreur lors de la création de la publication en BDD: {e}")
        db.session.rollback()

    # Fallback sur démo
    if fiche_id not in PUBLICATIONS_DEMO:
        PUBLICATIONS_DEMO[fiche_id] = []

    # Génère un ID pour la publication
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

# ==================== DATABASE INITIALIZATION ====================

def migrate_to_bigint():
    """Migrate user_id columns from Integer to BigInteger"""
    try:
        # Alter users.id to BigInteger
        db.session.execute(text('ALTER TABLE users ALTER COLUMN id TYPE bigint'))
        # Alter fiches.user_id to BigInteger
        db.session.execute(text('ALTER TABLE fiches ALTER COLUMN user_id TYPE bigint'))
        db.session.commit()
        logger.info("✓ Migration: user_id columns changed to BigInteger")
    except Exception as e:
        logger.warning(f"Migration skipped (already done or table doesn't exist): {e}")

@app.before_request
def create_tables():
    """Create database tables if they don't exist and apply migrations"""
    db.create_all()
    # Apply migration on first request (idempotent)
    migrate_to_bigint()

if __name__ == '__main__':
    with app.app_context():
        # Create tables if they don't exist (migration complete, no need to drop)
        db.create_all()
        logger.info("✓ Database tables ready")
    app.run(debug=True, host='0.0.0.0', port=5000)
