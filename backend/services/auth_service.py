import os
import requests
from urllib.parse import urlencode
from google.oauth2 import service_account
from google_auth_oauthlib.flow import Flow
import google.auth.transport.requests

# OAuth 2.0 Configuration
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:5000/auth/callback')

SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

def get_google_auth_url():
    """Génère l'URL d'authentification Google OAuth 2.0"""
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'response_type': 'code',
        'scope': ' '.join(SCOPES),
        'access_type': 'offline',
        'prompt': 'consent'
    }

    auth_url = f'https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}'
    return auth_url

def exchange_code_for_token(code):
    """Échange le code d'autorisation pour un token d'accès et les infos utilisateur"""

    # Étape 1: Échanger le code pour un token
    token_url = 'https://oauth2.googleapis.com/token'

    data = {
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code'
    }

    response = requests.post(token_url, data=data)
    tokens = response.json()

    if 'error' in tokens:
        raise Exception(f"Token exchange failed: {tokens['error']}")

    access_token = tokens.get('access_token')

    # Étape 2: Récupérer les infos utilisateur
    userinfo_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
    headers = {'Authorization': f'Bearer {access_token}'}

    userinfo_response = requests.get(userinfo_url, headers=headers)
    user_data = userinfo_response.json()

    if 'error' in user_data:
        raise Exception(f"Failed to get user info: {user_data['error']}")

    return user_data, access_token
