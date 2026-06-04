"""
Endpoints réservés à l'administrateur (prestataire).

Accès à TOUTES les fiches de TOUS les clients, stats globales, édition de
n'importe quelle fiche. Toutes les routes sont protégées par @token_required
PUIS @admin_required (autorisation basée sur User.role en base, pas sur le JWT).
"""
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, Fiche, Avis, User
from services.gmb_service import calculer_score
from utils.decorators import token_required, admin_required

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)


def _fiche_with_owner(fiche, owner):
    """Sérialise une fiche en y ajoutant les infos du client propriétaire."""
    data = fiche.to_dict()
    avis_list = fiche.avis or []
    total_avis = len(avis_list)
    avis_sans_reponse = sum(1 for a in avis_list if not a.reponse)
    data['client'] = {
        'user_id': owner.id if owner else None,
        'nom': owner.name if owner else None,
        'email': owner.email if owner else None,
        'is_active': owner.is_active if owner else None,
    }
    data['total_avis'] = total_avis
    data['avis_sans_reponse'] = avis_sans_reponse
    return data


@admin_bp.route('/fiches', methods=['GET'])
@token_required
@admin_required
def admin_get_fiches():
    """
    Toutes les fiches des clients (role='client'), avec infos du propriétaire.
    Query params optionnels :
      - active=true|false : ne garder que les clients (in)actifs.
    """
    try:
        active_param = request.args.get('active')

        clients_q = User.query.filter(User.role == 'client')
        if active_param is not None:
            clients_q = clients_q.filter(
                User.is_active.is_(active_param.lower() in ('1', 'true', 'yes'))
            )
        clients = {u.id: u for u in clients_q.all()}
        if not clients:
            return jsonify([]), 200

        fiches = Fiche.query.filter(Fiche.user_id.in_(list(clients.keys()))).all()
        result = [_fiche_with_owner(f, clients.get(f.user_id)) for f in fiches]
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Erreur admin_get_fiches: {e}")
        return jsonify({'error': 'Internal error'}), 500


@admin_bp.route('/fiches/<fiche_id>', methods=['GET'])
@token_required
@admin_required
def admin_get_fiche(fiche_id):
    """Détail de n'importe quelle fiche (admin)."""
    try:
        fiche = Fiche.query.filter_by(id=fiche_id).first()
        if not fiche:
            return jsonify({'error': 'Fiche not found'}), 404
        owner = User.query.filter_by(id=fiche.user_id).first()
        return jsonify(_fiche_with_owner(fiche, owner)), 200
    except Exception as e:
        logger.error(f"Erreur admin_get_fiche: {e}")
        return jsonify({'error': 'Internal error'}), 500


@admin_bp.route('/fiches/<fiche_id>', methods=['PUT'])
@token_required
@admin_required
def admin_update_fiche(fiche_id):
    """Met à jour n'importe quelle fiche et recalcule le score (admin)."""
    data = request.get_json(silent=True) or {}

    # SECURITY FIX [CWE-20]: cap field lengths
    for k in ('nom', 'telephone', 'adresse', 'site_web', 'horaires', 'description'):
        v = data.get(k)
        if v is not None and (not isinstance(v, str) or len(v) > 2000):
            return jsonify({'error': 'Invalid field'}), 400

    try:
        fiche = Fiche.query.filter_by(id=fiche_id).first()
        if not fiche:
            return jsonify({'error': 'Fiche not found'}), 404

        fiche.nom = data.get('nom', fiche.nom)
        fiche.telephone = data.get('telephone', fiche.telephone)
        fiche.adresse = data.get('adresse', fiche.adresse)
        fiche.site_web = data.get('site_web', fiche.site_web)
        fiche.horaires = data.get('horaires', fiche.horaires)
        fiche.description = data.get('description', fiche.description)
        fiche.score = calculer_score(fiche.to_dict())
        fiche.updated_at = datetime.now()

        db.session.commit()
        owner = User.query.filter_by(id=fiche.user_id).first()
        return jsonify(_fiche_with_owner(fiche, owner)), 200
    except Exception as e:
        logger.error(f"Erreur admin_update_fiche: {e}")
        db.session.rollback()
        return jsonify({'error': 'Internal error'}), 500


@admin_bp.route('/stats', methods=['GET'])
@token_required
@admin_required
def admin_stats():
    """
    Stats globales du prestataire :
      - nb de clients (total / actifs)
      - nb de fiches gérées
      - score moyen
      - nb total d'avis et avis en attente de réponse
    """
    try:
        clients = User.query.filter(User.role == 'client').all()
        client_ids = [u.id for u in clients]
        nb_clients = len(clients)
        nb_clients_actifs = sum(1 for u in clients if u.is_active)

        fiches = (
            Fiche.query.filter(Fiche.user_id.in_(client_ids)).all()
            if client_ids else []
        )
        nb_fiches = len(fiches)
        score_moyen = round(sum(f.score for f in fiches) / nb_fiches, 1) if nb_fiches else 0

        fiche_ids = [f.id for f in fiches]
        avis = (
            Avis.query.filter(Avis.fiche_id.in_(fiche_ids)).all()
            if fiche_ids else []
        )
        total_avis = len(avis)
        avis_en_attente = sum(1 for a in avis if not a.reponse)

        return jsonify({
            'nombre_clients': nb_clients,
            'nombre_clients_actifs': nb_clients_actifs,
            'nombre_fiches': nb_fiches,
            'score_moyen': score_moyen,
            'nombre_total_avis': total_avis,
            'avis_en_attente': avis_en_attente,
        }), 200
    except Exception as e:
        logger.error(f"Erreur admin_stats: {e}")
        return jsonify({'error': 'Internal error'}), 500
