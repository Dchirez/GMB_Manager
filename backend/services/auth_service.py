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
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid',
    'https://www.googleapis.com/auth/business.manage'
]

def get_google_auth_url(state=None, redirect_uri=None):
    """Génère l'URL d'authentification Google OAuth 2.0

    SECURITY FIX [CWE-352]: the caller must supply an unpredictable `state`
    value that will be verified at the /auth/callback endpoint.

    `redirect_uri` may be supplied to match the host the user actually hit
    (so the OAuth `state` cookie host == callback host). Falls back to the env.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise RuntimeError("Google OAuth is not configured (missing CLIENT_ID/SECRET)")

    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': redirect_uri or REDIRECT_URI,
        'response_type': 'code',
        'scope': ' '.join(SCOPES),
        'access_type': 'offline',
        'prompt': 'consent',
        'include_granted_scopes': 'true',
    }
    if state:
        params['state'] = state

    auth_url = f'https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}'
    return auth_url

def exchange_code_for_token(code, redirect_uri=None):
    """Échange le code d'autorisation pour un token d'accès et les infos utilisateur

    `redirect_uri` MUST match the one used to build the auth URL (Google enforces
    an exact match). Falls back to the env value.
    """

    # Étape 1: Échanger le code pour un token
    token_url = 'https://oauth2.googleapis.com/token'

    data = {
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': redirect_uri or REDIRECT_URI,
        'grant_type': 'authorization_code'
    }

    response = requests.post(token_url, data=data)
    tokens = response.json()

    if 'error' in tokens:
        raise Exception(f"Token exchange failed: {tokens['error']}")

    access_token = tokens.get('access_token')

    # Étape 2: Récupérer les infos utilisateur via OpenID Connect (retourne 'sub')
    userinfo_url = 'https://openidconnect.googleapis.com/v1/userinfo'
    headers = {'Authorization': f'Bearer {access_token}'}

    userinfo_response = requests.get(userinfo_url, headers=headers)
    user_data = userinfo_response.json()

    if 'error' in user_data:
        raise Exception(f"Failed to get user info: {user_data['error']}")

    # Ensure we have the Google ID (sub field from OpenID Connect)
    if 'sub' not in user_data:
        # Fallback to v2 endpoint if OpenID Connect doesn't have 'sub'
        userinfo_url_fallback = 'https://www.googleapis.com/oauth2/v2/userinfo'
        userinfo_response = requests.get(userinfo_url_fallback, headers=headers)
        user_data = userinfo_response.json()

        if 'id' in user_data and 'sub' not in user_data:
            user_data['sub'] = user_data['id']

    return user_data, access_token

def revoke_google_token(token):
    """Révoque un token OAuth Google (access ou refresh).

    Appelé lors de la suppression de compte (RGPD) pour couper l'accès de
    l'application aux données Google de l'utilisateur. Best-effort : une erreur
    réseau ou un token déjà invalide ne doit pas bloquer la suppression.
    """
    if not token:
        return False
    try:
        resp = requests.post(
            'https://oauth2.googleapis.com/revoke',
            params={'token': token},
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=10,
        )
        return resp.status_code == 200
    except requests.RequestException:
        return False
