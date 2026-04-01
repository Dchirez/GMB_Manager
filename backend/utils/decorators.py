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
            # Use current_app to work in blueprint context
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            # Ensure user_id is integer (convert from string if needed for backward compatibility)
            if 'user_id' in data and isinstance(data['user_id'], str):
                try:
                    data['user_id'] = int(data['user_id'])
                except ValueError:
                    # If user_id is not convertible to int, keep as string (email-based fallback)
                    logger.warning(f"user_id '{data['user_id']}' is not numeric, keeping as string")
            request.user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated
