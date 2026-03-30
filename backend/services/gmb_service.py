"""
Service pour gérer les interactions avec l'API Google Business Profile
et les données des fiches
"""
import requests
import logging

logger = logging.getLogger(__name__)

# Google Business Profile API endpoints
ACCOUNT_MANAGEMENT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1'
BUSINESS_INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1'

def calculer_score(fiche):
    """
    Calcule le score de complétude d'une fiche GMB (0-100)

    Scoring:
    - nom: 20 pts
    - telephone: 15 pts
    - adresse: 15 pts
    - site_web: 15 pts
    - horaires: 20 pts
    - description: 15 pts
    """
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

def _format_horaires(regular_hours):
    """Formatte les horaires Google en string lisible"""
    if not regular_hours:
        return ""

    try:
        periods = regular_hours.get('periods', [])
        if not periods:
            return ""

        # Simple format: lundi-dimanche
        jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
        horaires_txt = []

        for i, period in enumerate(periods[:7]):  # Max 7 jours
            if 'openDay' in period and 'closeDay' in period:
                jour = jours[i % 7]
                open_time = period.get('openTime', {}).get('hours', 0)
                close_time = period.get('closeTime', {}).get('hours', 0)
                horaires_txt.append(f"{jour} {open_time}h-{close_time}h")

        return ", ".join(horaires_txt) if horaires_txt else ""
    except Exception as e:
        logger.warning(f"Erreur lors du parsing des horaires: {e}")
        return ""

def _format_adresse(storefront_address):
    """Formatte l'adresse Google en string lisible"""
    if not storefront_address:
        return ""

    try:
        parts = []
        if storefront_address.get('addressLines'):
            parts.extend(storefront_address.get('addressLines'))
        if storefront_address.get('postalCode'):
            parts.append(storefront_address.get('postalCode'))
        if storefront_address.get('city'):
            parts.append(storefront_address.get('city'))
        return ", ".join(parts) if parts else ""
    except Exception as e:
        logger.warning(f"Erreur lors du parsing de l'adresse: {e}")
        return ""

def _extract_phone(phone_numbers):
    """Extrait le premier numéro de téléphone"""
    if phone_numbers and len(phone_numbers) > 0:
        return phone_numbers[0]
    return ""

def _map_google_location_to_fiche(location_data, location_id):
    """
    Mappe une location Google Business Profile vers le format interne

    Format Google:
    {
      "name": "accounts/123/locations/456",
      "title": "Nom du commerce",
      "storefrontAddress": {...},
      "phoneNumbers": ["0312345678"],
      "websiteUri": "https://...",
      "regularHours": {...},
      "profile": {"description": "..."}
    }
    """
    fiche = {
        "id": location_id,
        "nom": location_data.get('title', 'Sans nom'),
        "categorie": "Commerce",
        "adresse": _format_adresse(location_data.get('storefrontAddress')),
        "telephone": _extract_phone(location_data.get('phoneNumbers')),
        "site_web": location_data.get('websiteUri', ''),
        "horaires": _format_horaires(location_data.get('regularHours')),
        "description": location_data.get('profile', {}).get('description', ''),
    }

    fiche['score'] = calculer_score(fiche)
    return fiche

def get_fiches_by_user(google_access_token):
    """
    Récupère les vraies fiches GMB de l'utilisateur depuis l'API Google Business Profile

    Étapes:
    1. Récupère la liste des comptes Google Business via Account Management API
    2. Pour chaque compte, récupère les locations via Business Information API
    3. Mappe les données Google au format interne

    En cas d'erreur (token expiré, API inaccessible), retourne None
    pour que le fallback puisse être appliqué dans app.py
    """
    if not google_access_token:
        logger.warning("Pas de google_access_token fourni")
        return None

    try:
        headers = {
            'Authorization': f'Bearer {google_access_token}',
            'Content-Type': 'application/json'
        }

        # Étape 1: Récupérer les comptes
        logger.info("Récupération des comptes GMB...")
        accounts_url = f'{ACCOUNT_MANAGEMENT_API}/accounts'
        accounts_response = requests.get(accounts_url, headers=headers, timeout=10)

        if accounts_response.status_code != 200:
            logger.error(f"Erreur API Accounts: {accounts_response.status_code} - {accounts_response.text}")
            return None

        accounts_data = accounts_response.json()
        accounts = accounts_data.get('accounts', [])

        if not accounts:
            logger.info("Aucun compte GMB trouvé pour l'utilisateur")
            return None

        logger.info(f"Trouvé {len(accounts)} compte(s) GMB")

        all_fiches = []

        # Étape 2: Pour chaque compte, récupérer les locations
        for account in accounts:
            account_id = account.get('name', '').split('/')[-1]  # Extrait l'ID du nom "accounts/123"

            if not account_id:
                logger.warning("Impossible d'extraire l'ID du compte")
                continue

            logger.info(f"Récupération des locations du compte {account_id}...")

            locations_url = (
                f'{BUSINESS_INFO_API}/accounts/{account_id}/locations'
                '?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,profile'
            )

            locations_response = requests.get(locations_url, headers=headers, timeout=10)

            if locations_response.status_code != 200:
                logger.warning(f"Erreur API Locations pour compte {account_id}: {locations_response.status_code}")
                continue

            locations_data = locations_response.json()
            locations = locations_data.get('locations', [])

            logger.info(f"Trouvé {len(locations)} location(s) pour le compte {account_id}")

            # Étape 3: Mapper les données
            for idx, location in enumerate(locations):
                try:
                    location_id = location.get('name', '').split('/')[-1]  # Extrait l'ID
                    fiche = _map_google_location_to_fiche(location, location_id or str(idx))
                    all_fiches.append(fiche)
                except Exception as e:
                    logger.error(f"Erreur lors du mapping d'une location: {e}")
                    continue

        if all_fiches:
            logger.info(f"✅ Récupération réussie: {len(all_fiches)} fiche(s)")
            return all_fiches
        else:
            logger.warning("Aucune fiche valide trouvée après mapping")
            return None

    except requests.exceptions.Timeout:
        logger.error("Timeout lors de l'appel à l'API Google")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Erreur de requête API: {e}")
        return None
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la récupération des fiches: {e}")
        return None

def update_fiche_data(fiche_id, updates):
    """
    Met à jour les données d'une fiche
    (Sera implémenté quand la persistance sera en place)
    """
    pass
