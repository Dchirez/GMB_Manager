"""
Shared authentication decorators for all routes
"""
import logging
from functools import wraps
from flask import request, jsonify, current_app
import jwt

logger = logging.getLogger(__name__)


def token_required(f):
    """Décorateur pour valider le JWT (centralisé pour tous les blueprints)"""
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
            # SECURITY FIX [CWE-347/CWE-613]: strict JWT validation — require exp and iat,
            # explicit algorithm, reject unsigned/alg=none tokens implicitly.
            data = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256'],
                options={'require': ['exp', 'iat']},
            )
            # Ensure user_id is integer (convert from string if needed for backward compatibility)
            if 'user_id' in data and isinstance(data['user_id'], str):
                try:
                    data['user_id'] = int(data['user_id'])
                except ValueError:
                    logger.warning("user_id in token is not numeric")
                    return jsonify({'message': 'Invalid token'}), 401

            # SECURITY FIX [CWE-522]: google_access_token is no longer in JWT;
            # load it from the DB using user_id so it can be rotated/revoked server-side.
            from models import User
            user = User.query.filter_by(id=data.get('user_id')).first()
            if not user:
                return jsonify({'message': 'Invalid token'}), 401
            data['google_access_token'] = user.google_access_token

            request.user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.MissingRequiredClaimError:
            return jsonify({'message': 'Invalid token'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    """
    Décorateur pour protéger les endpoints admin.

    SECURITY: la décision d'autorisation se base sur le rôle **en base de données**
    (source de vérité), jamais sur un claim du JWT — un token forgé avec
    role='admin' ne donne donc aucun accès. Doit être appliqué APRÈS
    @token_required (qui peuple request.user et garantit un user valide).
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = None
        if hasattr(request, 'user') and isinstance(request.user, dict):
            user_id = request.user.get('user_id')

        if user_id is None:
            return jsonify({'message': 'Token is missing'}), 401

        from models import User
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({'message': 'Invalid token'}), 401
        if user.role != 'admin':
            # 403 : authentifié mais pas autorisé.
            return jsonify({'message': 'Admin access required'}), 403

        return f(*args, **kwargs)

    return decorated


def owned_fiche_or_403(fiche_id, user_id):
    """
    SECURITY FIX [CWE-639]: helper to enforce that the given fiche belongs to the
    authenticated user. Returns the Fiche or None.
    """
    from models import Fiche
    return Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()


def accessible_fiche(fiche_id, user_id):
    """
    Version admin-aware de owned_fiche_or_403 :
      - un admin peut accéder à N'IMPORTE QUELLE fiche (il gère tous les clients) ;
      - un client n'accède qu'à ses propres fiches.
    Retourne la Fiche ou None. Le contrôle de rôle se fait en base (source de vérité).
    """
    from models import Fiche, User
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return None
    if user.role == 'admin':
        return Fiche.query.filter_by(id=fiche_id).first()
    return Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()
