"""
Statistiques avancées pour les fiches GMB
"""
import logging
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify
import jwt
from models import db, Fiche, Avis, User

logger = logging.getLogger(__name__)

stats_bp = Blueprint('stats', __name__)


def token_required(f):
    """Décorateur pour valider le JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Invalid Authorization header format'}), 401

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            from flask import current_app
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated


@stats_bp.route('/fiches/<fiche_id>/avis', methods=['GET'])
@token_required
def get_avis_stats(fiche_id):
    """
    Retourne statistiques détaillées des avis pour une fiche
    - Nombre total d'avis
    - Note moyenne
    - Répartition par note (1★ à 5★)
    - Évolution mensuelle sur 12 mois
    - Taux de réponse
    """
    try:
        avis_list = Avis.query.filter_by(fiche_id=fiche_id).all()

        if not avis_list:
            return jsonify({
                'fiche_id': fiche_id,
                'total_avis': 0,
                'note_moyenne': 0,
                'repartition': {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0},
                'evolution_mensuelle': [],
                'taux_reponse': 0
            }), 200

        # Calculs
        total_avis = len(avis_list)
        note_moyenne = sum(a.note for a in avis_list) / total_avis if avis_list else 0
        taux_reponse = sum(1 for a in avis_list if a.reponse) / total_avis * 100 if avis_list else 0

        # Répartition par note
        repartition = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
        for avis in avis_list:
            repartition[str(avis.note)] += 1

        # Évolution mensuelle sur 12 mois
        today = datetime.utcnow().date()
        evolution_mensuelle = []

        for i in range(11, -1, -1):
            date_start = today - timedelta(days=today.day - 1)  # Premier jour du mois
            date_start = date_start.replace(day=1)
            # Remonte i mois en arrière
            for _ in range(i):
                if date_start.month == 1:
                    date_start = date_start.replace(year=date_start.year - 1, month=12)
                else:
                    date_start = date_start.replace(month=date_start.month - 1)

            # Date fin du mois
            if date_start.month == 12:
                date_end = date_start.replace(year=date_start.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                date_end = date_start.replace(month=date_start.month + 1, day=1) - timedelta(days=1)

            # Avis du mois
            avis_mois = [a for a in avis_list if a.date >= date_start and a.date <= date_end]
            mois_str = date_start.strftime('%Y-%m')
            moyenne_mois = sum(a.note for a in avis_mois) / len(avis_mois) if avis_mois else 0

            evolution_mensuelle.append({
                'mois': mois_str,
                'count': len(avis_mois),
                'moyenne': round(moyenne_mois, 1)
            })

        return jsonify({
            'fiche_id': fiche_id,
            'total_avis': total_avis,
            'note_moyenne': round(note_moyenne, 1),
            'repartition': repartition,
            'evolution_mensuelle': evolution_mensuelle,
            'taux_reponse': round(taux_reponse, 1)
        }), 200

    except Exception as e:
        logger.error(f"Erreur stats avis: {e}")
        return jsonify({'error': str(e)}), 500


@stats_bp.route('/dashboard', methods=['GET'])
@token_required
def get_dashboard_stats():
    """
    Statistiques du dashboard pour l'utilisateur
    - Nombre total de fiches
    - Score moyen de complétude
    - Meilleure fiche / pire fiche
    - Nombre total d'avis
    """
    try:
        user_id = request.user.get('user_id')

        # Récupère l'utilisateur dans la BDD pour son ID numérique
        user = User.query.filter_by(google_id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        fiches = Fiche.query.filter_by(user_id=user.id).all()

        if not fiches:
            return jsonify({
                'nombre_fiches': 0,
                'score_moyen': 0,
                'meilleure_fiche': None,
                'pire_fiche': None,
                'nombre_total_avis': 0
            }), 200

        # Statistiques
        nombre_fiches = len(fiches)
        score_moyen = sum(f.score for f in fiches) / nombre_fiches if fiches else 0
        meilleure = max(fiches, key=lambda f: f.score) if fiches else None
        pire = min(fiches, key=lambda f: f.score) if fiches else None

        # Avis total
        total_avis = 0
        for fiche in fiches:
            total_avis += len(fiche.avis)

        return jsonify({
            'nombre_fiches': nombre_fiches,
            'score_moyen': round(score_moyen, 1),
            'meilleure_fiche': {
                'id': meilleure.id,
                'nom': meilleure.nom,
                'score': meilleure.score
            } if meilleure else None,
            'pire_fiche': {
                'id': pire.id,
                'nom': pire.nom,
                'score': pire.score
            } if pire else None,
            'nombre_total_avis': total_avis
        }), 200

    except Exception as e:
        logger.error(f"Erreur stats dashboard: {e}")
        return jsonify({'error': str(e)}), 500
