"""
Notifications pour l'utilisateur
"""
import logging
from functools import wraps
from flask import Blueprint, request, jsonify
import jwt
from models import db, Notification, User, Fiche, Avis

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__)


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


def generate_notifications(user_id):
    """
    Génère automatiquement les notifications pour un utilisateur
    - Avis ≤ 2★ sans réponse → avis_negatif
    - Fiche avec score < 40 → score_faible
    - Plus de 3 avis sans réponse → sans_reponse
    """
    try:
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return

        fiches = Fiche.query.filter_by(user_id=user_id).all()

        for fiche in fiches:
            # Avis négatifs sans réponse
            avis_negatifs = [a for a in fiche.avis if a.note <= 2 and not a.reponse]
            if avis_negatifs:
                notif_type = 'avis_negatif'
                message = f"Avis négatif sur {fiche.nom}: {len(avis_negatifs)} avis ≤ 2★ sans réponse"

                # Vérifier si la notif existe déjà et non lue
                existing = Notification.query.filter_by(
                    user_id=user_id,
                    fiche_id=fiche.id,
                    type=notif_type,
                    lu=False
                ).first()

                if not existing:
                    notif = Notification(
                        user_id=user_id,
                        fiche_id=fiche.id,
                        type=notif_type,
                        message=message
                    )
                    db.session.add(notif)

            # Score faible
            if fiche.score < 40:
                notif_type = 'score_faible'
                message = f"Score faible pour {fiche.nom}: {fiche.score}/100"

                existing = Notification.query.filter_by(
                    user_id=user_id,
                    fiche_id=fiche.id,
                    type=notif_type,
                    lu=False
                ).first()

                if not existing:
                    notif = Notification(
                        user_id=user_id,
                        fiche_id=fiche.id,
                        type=notif_type,
                        message=message
                    )
                    db.session.add(notif)

            # Nombreux avis sans réponse
            avis_sans_reponse = [a for a in fiche.avis if not a.reponse]
            if len(avis_sans_reponse) > 3:
                notif_type = 'sans_reponse'
                message = f"{fiche.nom}: {len(avis_sans_reponse)} avis en attente de réponse"

                existing = Notification.query.filter_by(
                    user_id=user_id,
                    fiche_id=fiche.id,
                    type=notif_type,
                    lu=False
                ).first()

                if not existing:
                    notif = Notification(
                        user_id=user_id,
                        fiche_id=fiche.id,
                        type=notif_type,
                        message=message
                    )
                    db.session.add(notif)

        db.session.commit()
    except Exception as e:
        logger.error(f"Erreur generation notifications: {e}")
        db.session.rollback()


@notifications_bp.route('', methods=['GET'])
@token_required
def get_notifications():
    """
    Retourne les notifications non lues de l'utilisateur
    Génère aussi les notifications manquantes au premier appel
    """
    try:
        user_id = request.user.get('user_id')

        # Récupère l'utilisateur dans la BDD
        user = User.query.filter_by(google_id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Génère les notifications manquantes
        generate_notifications(user.id)

        # Récupère les notifications non lues
        notifs = Notification.query.filter_by(user_id=user.id, lu=False).order_by(
            Notification.created_at.desc()
        ).all()

        return jsonify([n.to_dict() for n in notifs]), 200

    except Exception as e:
        logger.error(f"Erreur get notifications: {e}")
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/<int:notif_id>/lire', methods=['PUT'])
@token_required
def mark_notification_read(notif_id):
    """Marque une notification comme lue"""
    try:
        user_id = request.user.get('user_id')

        user = User.query.filter_by(google_id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        notif = Notification.query.filter_by(id=notif_id, user_id=user.id).first()
        if not notif:
            return jsonify({'error': 'Notification not found'}), 404

        notif.lu = True
        db.session.commit()

        return jsonify(notif.to_dict()), 200

    except Exception as e:
        logger.error(f"Erreur mark read: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/lire-tout', methods=['PUT'])
@token_required
def mark_all_notifications_read():
    """Marque toutes les notifications comme lues"""
    try:
        user_id = request.user.get('user_id')

        user = User.query.filter_by(google_id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        Notification.query.filter_by(user_id=user.id, lu=False).update({'lu': True})
        db.session.commit()

        return jsonify({'message': 'All notifications marked as read'}), 200

    except Exception as e:
        logger.error(f"Erreur mark all read: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
