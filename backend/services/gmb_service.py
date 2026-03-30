"""
Service pour gérer les interactions avec l'API Google Business Profile
et les données des fiches
"""

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

def get_fiches_by_user(user_id):
    """
    Récupère les fiches associées à un utilisateur
    (Sera implémenté quand une vraie BD sera utilisée)
    """
    pass

def update_fiche_data(fiche_id, updates):
    """
    Met à jour les données d'une fiche
    (Sera implémenté quand une vraie BD sera utilisée)
    """
    pass
