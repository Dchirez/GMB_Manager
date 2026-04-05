import os
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from flask import Flask, request, jsonify, redirect, session, abort
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

# SECURITY FIX [CWE-770]: rate limiting
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    _HAS_LIMITER = True
except ImportError:
    _HAS_LIMITER = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# ==================== DEMO DATA SEEDING HELPER ====================

DEMO_FICHES_DATA = [
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

# Avis démo indexés par nom de fiche (pour matcher après création en BDD)
DEMO_AVIS_BY_FICHE_NAME = {
    "Boulangerie Martin": [
        {"auteur": "Marie D.", "note": 5, "date": "2024-12-01", "commentaire": "Excellent pain, toujours frais !", "reponse": None},
        {"auteur": "Jean P.", "note": 4, "date": "2024-11-15", "commentaire": "Bonnes viennoiseries mais parfois en rupture.", "reponse": None},
        {"auteur": "Sophie L.", "note": 3, "date": "2024-10-20", "commentaire": "Service un peu lent le matin.", "reponse": None}
    ],
    "Karact'Hair": [
        {"auteur": "Claire M.", "note": 5, "date": "2024-12-10", "commentaire": "Super coiffeur, résultat impeccable !", "reponse": "Merci Claire, à bientôt !"},
        {"auteur": "Lucas B.", "note": 4, "date": "2024-11-28", "commentaire": "Bon accueil, tarifs raisonnables.", "reponse": None}
    ],
    "Friterie Aux Bonnes Saveurs": [
        {"auteur": "Thomas R.", "note": 5, "date": "2024-12-05", "commentaire": "Les meilleures frites du coin !", "reponse": None},
        {"auteur": "Emma V.", "note": 2, "date": "2024-10-01", "commentaire": "Attente trop longue.", "reponse": None}
    ],
    "MS Automobiles": [
        {"auteur": "Pierre N.", "note": 4, "date": "2024-11-10", "commentaire": "Travail soigné, prix honnêtes.", "reponse": None}
    ]
}


def create_demo_fiches_and_avis(user_id):
    """Crée les fiches démo ET leurs avis associés pour un utilisateur"""
    from datetime import date
    import uuid

    for fiche_data in DEMO_FICHES_DATA:
        fiche = Fiche(
            user_id=user_id,
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
        db.session.flush()  # Pour obtenir l'ID généré

        # Créer les avis démo pour cette fiche
        avis_list = DEMO_AVIS_BY_FICHE_NAME.get(fiche_data["nom"], [])
        for avis_data in avis_list:
            avis = Avis(
                id=str(uuid.uuid4())[:8],
                fiche_id=fiche.id,
                auteur=avis_data["auteur"],
                note=avis_data["note"],
                date=date.fromisoformat(avis_data["date"]),
                commentaire=avis_data["commentaire"],
                reponse=avis_data["reponse"]
            )
            db.session.add(avis)

    db.session.commit()

# Set OAuth insecure transport flag for development only
if os.getenv('FLASK_ENV') == 'development':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

app = Flask(__name__)

# SECURITY FIX [CWE-798]: SECRET_KEY must come from env, no hardcoded fallback
_secret_key = os.getenv('SECRET_KEY')
_is_production = os.getenv('FLASK_ENV') == 'production'
if not _secret_key:
    if _is_production:
        raise RuntimeError("SECRET_KEY environment variable is required in production")
    # Dev only: generate an ephemeral random key (NOT persisted)
    _secret_key = secrets.token_urlsafe(64)
    logger.warning("SECRET_KEY not set — using an ephemeral random key (DEV ONLY)")
elif len(_secret_key) < 32:
    raise RuntimeError("SECRET_KEY must be at least 32 characters")

app.config['SECRET_KEY'] = _secret_key
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
# SECURITY FIX [CWE-614/CWE-1004]: secure session cookie flags
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = _is_production
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
# SECURITY FIX [CWE-434/CWE-400]: cap request body to 5 MB to prevent DoS via uploads
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'sqlite:///gmb_manager.db'  # Fallback to SQLite for development
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# SECURITY/RELIABILITY: avoid stale DB connections on Supabase pooler
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}

# Initialize database
db.init_app(app)

# Initialize Flask-Session
Session(app)

# SECURITY FIX [CWE-942]: strict CORS — no permissive localhost fallback in prod
_frontend_url = os.getenv('FRONTEND_URL')
if not _frontend_url:
    if _is_production:
        raise RuntimeError("FRONTEND_URL is required in production (strict CORS)")
    _frontend_url = 'http://localhost:4200'

CORS(app, resources={
    r"/api/*": {
        "origins": [_frontend_url],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    },
    r"/auth/*": {
        "origins": [_frontend_url],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# SECURITY FIX [CWE-307/CWE-770]: rate limiting on auth and mutation endpoints
if _HAS_LIMITER:
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per hour", "60 per minute"],
        storage_uri="memory://",
    )
else:
    limiter = None
    logger.warning("flask_limiter not installed — rate limiting disabled")

# SECURITY FIX [CWE-693]: HTTP security headers on every response
@app.after_request
def _set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    if _is_production:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    # API returns JSON only — minimal CSP (no inline, no external sources)
    response.headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'"
    return response

# SECURITY FIX [CWE-209]: never leak raw exception messages to clients
def _safe_error(message, status):
    return jsonify({'error': message}), status

# Register blueprints
app.register_blueprint(stats_bp, url_prefix='/api/stats')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(photos_bp, url_prefix='/api/photos')

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Backend is running', 'version': '1.1'})

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
        # SECURITY FIX [CWE-352]: generate OAuth state, persist in signed session cookie
        state = secrets.token_urlsafe(32)
        session['oauth_state'] = state
        auth_url = get_google_auth_url(state=state)
        return jsonify({'auth_url': auth_url}), 200
    except Exception as e:
        logger.error(f"auth_login error: {e}")
        return _safe_error('Unable to start authentication', 500)

if limiter:
    auth_login = limiter.limit("20 per minute")(auth_login)

@app.route('/auth/callback', methods=['GET'])
def auth_callback():
    """
    Récupère le code d'autorisation Google et génère un JWT
    """
    from services.auth_service import exchange_code_for_token

    code = request.args.get('code')
    if not code:
        return jsonify({'error': 'Missing authorization code'}), 400

    # SECURITY FIX [CWE-352]: verify OAuth state to prevent login CSRF
    received_state = request.args.get('state')
    expected_state = session.pop('oauth_state', None)
    if not received_state or not expected_state or not secrets.compare_digest(
        str(received_state), str(expected_state)
    ):
        logger.warning("OAuth state mismatch — possible CSRF attempt")
        return _safe_error('Invalid OAuth state', 400)

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

            # Create demo fiches + avis for new user
            logger.info(f"Creating demo fiches and avis for {email}")
            create_demo_fiches_and_avis(user.id)
        else:
            logger.info(f"Updating existing user: {email}")
            user.google_access_token = access_token
            db.session.commit()

            # Créer les fiches démo + avis si l'utilisateur n'en a aucune en BDD
            existing_fiches = Fiche.query.filter_by(user_id=user.id).first()
            if not existing_fiches:
                logger.info(f"Creating demo fiches and avis for existing user {email} (none found in DB)")
                create_demo_fiches_and_avis(user.id)
                logger.info(f"Created 4 demo fiches with avis for existing user {email}")

        # SECURITY FIX [CWE-613]: JWT with exp/iat/nbf, short lifetime
        # SECURITY FIX [CWE-522]: google_access_token is NOT included in JWT anymore;
        # it is stored in DB (User.google_access_token) and loaded server-side.
        now = datetime.now(timezone.utc)
        jwt_token = jwt.encode({
            'user_id': user.id,
            'email': email,
            'name': name,
            'iat': now,
            'nbf': now,
            'exp': now + timedelta(hours=1),
        }, app.config['SECRET_KEY'], algorithm='HS256')

        # SECURITY FIX [CWE-598]: use URL fragment instead of query string
        # (fragments are never sent in Referer headers or server logs)
        logger.info(f"OAuth successful, redirecting to frontend")
        return redirect(f'{_frontend_url}/auth/callback#token={jwt_token}')

    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
        return _safe_error('Authentication failed', 500)

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
    Vérification de santé du backend (lecture seule)
    SECURITY FIX [CWE-732]: no longer triggers db.create_all() from an
    unauthenticated endpoint — schema init is done at startup only.
    """
    return jsonify({'status': 'ok'}), 200

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

        create_demo_fiches_and_avis(user.id)
        logger.info(f"Created 4 demo fiches with avis for user {user.email}")

        return jsonify({'message': '4 demo fiches with avis created successfully'}), 201

    except Exception as e:
        logger.error(f"Error creating demo fiches: {e}")
        db.session.rollback()
        # SECURITY FIX [CWE-209]: do not leak exception details
        return _safe_error('Internal error', 500)

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
    data = request.get_json(silent=True) or {}

    # SECURITY FIX [CWE-20]: cap field lengths to prevent abuse
    for k in ('nom', 'telephone', 'adresse', 'site_web', 'horaires', 'description'):
        v = data.get(k)
        if v is not None and (not isinstance(v, str) or len(v) > 2000):
            return _safe_error('Invalid field', 400)

    # SECURITY FIX [CWE-639/CWE-668]: only update rows owned by the user.
    # No in-memory demo fallback — that global dict was shared across users.
    try:
        fiche = Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()
        if not fiche:
            return _safe_error('Fiche not found', 404)

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
        return _safe_error('Internal error', 500)

# SECURITY FIX [CWE-532/CWE-200]: debug endpoint disabled in production.
# It used to return fragments of the Google access token in the response body
# and log them, leaking credentials. Enable only in development.
@app.route('/api/gmb/debug', methods=['GET'])
@token_required
def debug_gmb_api():
    if _is_production:
        return _safe_error('Not found', 404)
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
        # SECURITY FIX [CWE-532]: never log token fragments

        response = requests.get(accounts_url, headers=headers, timeout=10)

        logger.info(f"[DEBUG] Status: {response.status_code}")
        logger.info(f"[DEBUG] Response body length: {len(response.text)}")

        # Parser la réponse JSON si possible
        response_data = None
        try:
            response_data = response.json()
        except:
            response_data = response.text

        # SECURITY FIX [CWE-200]: do not echo Authorization header or PII back
        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'api_endpoint': accounts_url,
            'status_code': response.status_code,
            'response_body': response_data,
            'success': response.status_code == 200
        }), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Timeout lors de l\'appel à l\'API Google (10s)',
            'api_endpoint': 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
            'timestamp': datetime.now().isoformat()
        }), 504
    except requests.exceptions.RequestException as e:
        logger.error(f"GMB debug request error: {e}")
        return _safe_error('Upstream request error', 502)
    except Exception as e:
        logger.error(f"GMB debug unexpected error: {e}")
        return _safe_error('Internal error', 500)

# ==================== AVIS ROUTES ====================

@app.route('/api/avis/fiches/<fiche_id>/avis', methods=['GET'])
@token_required
def get_avis(fiche_id):
    """Retourne la liste des avis pour une fiche"""
    from datetime import date
    import uuid as uuid_mod

    # SECURITY FIX [CWE-639]: enforce fiche ownership before returning any avis
    user_id = request.user.get('user_id')
    owned_fiche = Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()
    if not owned_fiche:
        return _safe_error('Fiche not found', 404)

    # Cherche en BDD d'abord
    try:
        avis_list = Avis.query.filter_by(fiche_id=fiche_id).all()
        if avis_list:
            return jsonify([a.to_dict() for a in avis_list]), 200

        # Pas d'avis en BDD — si la fiche existe, seeder les avis démo
        fiche = owned_fiche
        if fiche and fiche.nom in DEMO_AVIS_BY_FICHE_NAME:
            logger.info(f"Seeding demo avis for fiche '{fiche.nom}' (id={fiche_id})")
            for avis_data in DEMO_AVIS_BY_FICHE_NAME[fiche.nom]:
                avis = Avis(
                    id=str(uuid_mod.uuid4())[:8],
                    fiche_id=fiche_id,
                    auteur=avis_data["auteur"],
                    note=avis_data["note"],
                    date=date.fromisoformat(avis_data["date"]),
                    commentaire=avis_data["commentaire"],
                    reponse=avis_data["reponse"]
                )
                db.session.add(avis)
            db.session.commit()

            avis_list = Avis.query.filter_by(fiche_id=fiche_id).all()
            return jsonify([a.to_dict() for a in avis_list]), 200
    except Exception as e:
        logger.error(f"Erreur lors de la lecture des avis en BDD: {e}")
        db.session.rollback()
        return _safe_error('Internal error', 500)

    # SECURITY: no demo fallback here — ownership already enforced and the fiche
    # either has avis in DB or is correctly returned empty.
    return jsonify([]), 200

@app.route('/api/avis/fiches/<fiche_id>/avis/<avis_id>/reponse', methods=['POST'])
@token_required
def post_reponse(fiche_id, avis_id):
    """Ajoute une réponse à un avis"""
    data = request.get_json(silent=True) or {}
    reponse_text = data.get('reponse')

    # SECURITY FIX [CWE-20]: basic input validation — bound the field length
    if not reponse_text or not isinstance(reponse_text, str):
        return _safe_error('Reponse text is required', 400)
    if len(reponse_text) > 2000:
        return _safe_error('Reponse text too long', 400)

    # SECURITY FIX [CWE-639]: enforce ownership of the parent fiche
    user_id = request.user.get('user_id')
    owned_fiche = Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()
    if not owned_fiche:
        return _safe_error('Fiche not found', 404)

    try:
        avis = Avis.query.filter_by(id=avis_id, fiche_id=fiche_id).first()
        if avis:
            avis.reponse = reponse_text
            db.session.commit()
            return jsonify(avis.to_dict()), 200
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de l'avis en BDD: {e}")
        db.session.rollback()
        return _safe_error('Internal error', 500)

    return _safe_error('Avis not found', 404)

# ==================== PUBLICATIONS ROUTES ====================

@app.route('/api/publications/fiches/<fiche_id>/posts', methods=['GET'])
@token_required
def get_publications(fiche_id):
    """Retourne la liste des publications pour une fiche"""
    # SECURITY FIX [CWE-639]: enforce fiche ownership
    user_id = request.user.get('user_id')
    owned_fiche = Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()
    if not owned_fiche:
        return _safe_error('Fiche not found', 404)

    try:
        publications_list = Publication.query.filter_by(fiche_id=fiche_id).all()
        return jsonify([p.to_dict() for p in publications_list]), 200
    except Exception as e:
        logger.error(f"Erreur lors de la lecture des publications en BDD: {e}")
        return _safe_error('Internal error', 500)

@app.route('/api/publications/fiches/<fiche_id>/posts', methods=['POST'])
@token_required
def create_publication(fiche_id):
    """Crée une nouvelle publication (avec photo optionnelle via multipart/form-data)"""
    import uuid

    # SECURITY FIX [CWE-639]: enforce fiche ownership before any DB/Storage write
    user_id = request.user.get('user_id')
    owned_fiche = Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()
    if not owned_fiche:
        return _safe_error('Fiche not found', 404)

    # Supporte JSON et multipart/form-data
    if request.content_type and 'multipart/form-data' in request.content_type:
        titre = request.form.get('titre')
        contenu = request.form.get('contenu')
        file = request.files.get('file')
    else:
        data = request.get_json(silent=True) or {}
        titre = data.get('titre')
        contenu = data.get('contenu')
        file = None

    # SECURITY FIX [CWE-20]: validate presence, type and length of text fields
    if not titre or not contenu or not isinstance(titre, str) or not isinstance(contenu, str):
        return _safe_error('Titre and contenu are required', 400)
    if len(titre) > 255 or len(contenu) > 5000:
        return _safe_error('Field too long', 400)

    # Upload photo vers Supabase si fichier fourni
    image_url = None
    image_filename = None

    if file and file.filename:
        # SECURITY FIX [CWE-434]: strict allowlist of extensions AND content-types
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        allowed_mimes = {'image/png', 'image/jpeg', 'image/gif', 'image/webp'}
        ext = file.filename.rsplit('.', 1)
        if len(ext) < 2 or ext[1].lower() not in allowed_extensions:
            return _safe_error('File type not allowed', 400)
        if file.content_type not in allowed_mimes:
            return _safe_error('File type not allowed', 400)

        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            return _safe_error('Storage not configured', 500)

        file_extension = ext[1].lower()
        # SECURITY: filename is a server-generated UUID, not user-controlled
        unique_filename = f"publications/{fiche_id}/{uuid.uuid4()}.{file_extension}"

        # Force a safe content-type instead of trusting the client
        safe_mime = {
            'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'gif': 'image/gif', 'webp': 'image/webp',
        }[file_extension]

        headers = {
            'Authorization': f'Bearer {supabase_key}',
            'apikey': supabase_key,
            'Content-Type': safe_mime
        }

        file_data = file.read()
        # Extra safety: reject files > 5 MB (MAX_CONTENT_LENGTH also caps this)
        if len(file_data) > 5 * 1024 * 1024:
            return _safe_error('File too large', 413)

        response = requests.post(
            f"{supabase_url}/storage/v1/object/gmb-photos/{unique_filename}",
            headers=headers,
            data=file_data,
            timeout=30
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Supabase upload error: {response.status_code}")
            return _safe_error('Upload failed', 500)

        image_url = f"{supabase_url}/storage/v1/object/public/gmb-photos/{unique_filename}"
        image_filename = unique_filename
        logger.info("Publication photo uploaded")

    # Crée en BDD
    try:
        pub_id = str(uuid.uuid4())[:8]

        publication = Publication(
            id=pub_id,
            fiche_id=fiche_id,
            titre=titre,
            contenu=contenu,
            image_url=image_url,
            image_filename=image_filename,
            date=datetime.now().date(),
            statut='publié'
        )
        db.session.add(publication)
        db.session.commit()
        return jsonify(publication.to_dict()), 201
    except Exception as e:
        logger.error(f"Erreur lors de la création de la publication en BDD: {e}")
        db.session.rollback()
        return _safe_error('Internal error', 500)

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ==================== DATABASE INITIALIZATION ====================

_migrations_applied = False

def _column_exists(table, column):
    """Check if a column exists in a table (PostgreSQL)"""
    result = db.session.execute(text(
        "SELECT 1 FROM information_schema.columns WHERE table_name = :table AND column_name = :column"
    ), {'table': table, 'column': column})
    return result.fetchone() is not None

def _column_type(table, column):
    """Get the data type of a column (PostgreSQL)"""
    result = db.session.execute(text(
        "SELECT data_type FROM information_schema.columns WHERE table_name = :table AND column_name = :column"
    ), {'table': table, 'column': column})
    row = result.fetchone()
    return row[0] if row else None

def run_migrations():
    """Run all pending migrations (idempotent, only once per process)"""
    global _migrations_applied
    if _migrations_applied:
        return
    _migrations_applied = True

    try:
        # Migration 1: user_id columns to BigInteger
        if _column_type('users', 'id') != 'bigint':
            db.session.execute(text('ALTER TABLE users ALTER COLUMN id TYPE bigint'))
            db.session.execute(text('ALTER TABLE fiches ALTER COLUMN user_id TYPE bigint'))
            db.session.commit()
            logger.info("✓ Migration: user_id columns changed to BigInteger")

        # Migration 2: image columns on publications
        if not _column_exists('publications', 'image_url'):
            db.session.execute(text('ALTER TABLE publications ADD COLUMN image_url VARCHAR(500)'))
            db.session.execute(text('ALTER TABLE publications ADD COLUMN image_filename VARCHAR(255)'))
            db.session.commit()
            logger.info("✓ Migration: added image_url and image_filename to publications")

    except Exception as e:
        db.session.rollback()
        logger.warning(f"Migration error: {e}")

# SECURITY FIX [CWE-732/CWE-400]: initialize the schema ONCE at startup, not on
# every incoming request. Running db.create_all() + run_migrations() on every
# request was both a performance problem and an unauthenticated trigger surface
# (any HTTP hit reached the DDL path).
with app.app_context():
    try:
        db.create_all()
        run_migrations()
        logger.info("✓ Database tables ready")
    except Exception as e:
        logger.error(f"Startup DB init failed: {e}")

if __name__ == '__main__':
    # SECURITY FIX [CWE-489]: never enable Flask debug mode automatically.
    # Debug mode exposes the Werkzeug debugger (RCE) if reachable.
    debug_flag = os.getenv('FLASK_ENV') == 'development' and os.getenv('FLASK_DEBUG') == '1'
    app.run(debug=debug_flag, host='0.0.0.0', port=5000)
