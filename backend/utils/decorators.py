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


def owned_fiche_or_403(fiche_id, user_id):
    """
    SECURITY FIX [CWE-639]: helper to enforce that the given fiche belongs to the
    authenticated user. Returns the Fiche or None.
    """
    from models import Fiche
    return Fiche.query.filter_by(id=fiche_id, user_id=user_id).first()
