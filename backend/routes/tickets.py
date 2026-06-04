"""
Tickets : demandes de modification d'une fiche.
Le ticket est persisté puis envoyé par e-mail au gestionnaire (TICKET_RECIPIENT),
photos jointes incluses.
"""
import logging
import os
from flask import Blueprint, request, jsonify
from models import db, User, Fiche, Ticket
from utils.decorators import token_required, accessible_fiche
from services.email_service import send_email

logger = logging.getLogger(__name__)

tickets_bp = Blueprint('tickets', __name__)

# Destinataire des demandes (configurable, défaut = adresse du gestionnaire)
TICKET_RECIPIENT = os.getenv('TICKET_RECIPIENT', 'dchirez59@gmail.com')

VALID_TYPES = {'modifier', 'ajouter', 'retirer', 'autre'}
VALID_URGENCY = {'normal', 'important', 'urgent'}
ALLOWED_AREAS = {'Nom', 'Adresse', 'Téléphone', 'Horaires', 'Site web', 'Description', 'Photos', 'Catégorie'}
TYPE_LABELS = {
    'modifier': 'Modifier une information',
    'ajouter': 'Ajouter un élément',
    'retirer': 'Retirer un élément',
    'autre': 'Autre demande',
}
URGENCY_LABELS = {'normal': 'Pas pressé', 'important': 'Important', 'urgent': 'Urgent'}
ALLOWED_MIMES = {'image/png', 'image/jpeg', 'image/gif', 'image/webp'}


@tickets_bp.route('/fiches/<fiche_id>', methods=['POST'])
@token_required
def create_ticket(fiche_id):
    """
    Crée une demande de modification pour une fiche et l'envoie par e-mail.
    Accepte JSON ou multipart/form-data (champ `files` pour les photos).
    """
    try:
        user_id = request.user.get('user_id')

        # SECURITY [CWE-639]: la fiche doit appartenir à l'utilisateur authentifié
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        fiche = accessible_fiche(fiche_id, user.id)
        if not fiche:
            return jsonify({'error': 'Fiche not found'}), 404

        # Lecture des champs (multipart avec photos, ou JSON)
        if request.content_type and 'multipart/form-data' in request.content_type:
            ttype = request.form.get('type', 'modifier')
            urgency = request.form.get('urgency', 'normal')
            message = request.form.get('message', '')
            contact_email = request.form.get('contact_email', '')
            areas_raw = request.form.getlist('areas')
            if len(areas_raw) == 1 and ',' in areas_raw[0]:
                areas_raw = [a.strip() for a in areas_raw[0].split(',')]
            files = request.files.getlist('files')
        else:
            data = request.get_json(silent=True) or {}
            ttype = data.get('type', 'modifier')
            urgency = data.get('urgency', 'normal')
            message = data.get('message', '')
            contact_email = data.get('contact_email', '')
            areas_raw = data.get('areas') or []
            files = []

        # SECURITY [CWE-20]: validation des entrées
        if not isinstance(message, str) or len(message.strip()) < 10:
            return jsonify({'error': 'Message too short'}), 400
        if len(message) > 5000:
            return jsonify({'error': 'Message too long'}), 400
        if not isinstance(contact_email, str) or '@' not in contact_email or len(contact_email) > 255:
            return jsonify({'error': 'Invalid email'}), 400
        if ttype not in VALID_TYPES:
            ttype = 'modifier'
        if urgency not in VALID_URGENCY:
            urgency = 'normal'
        areas = [a for a in areas_raw if a in ALLOWED_AREAS]

        # Pièces jointes : images uniquement, 8 max, 5 Mo chacune
        attachments = []
        for f in files[:8]:
            if not f or not f.filename:
                continue
            if f.content_type not in ALLOWED_MIMES:
                continue
            blob = f.read()
            if len(blob) > 5 * 1024 * 1024:
                return jsonify({'error': 'File too large'}), 413
            attachments.append((f.filename, blob, f.content_type))

        # Persistance
        ticket = Ticket(
            fiche_id=fiche_id,
            user_id=user.id,
            type=ttype,
            areas=','.join(areas) if areas else None,
            urgency=urgency,
            message=message.strip(),
            contact_email=contact_email.strip(),
            photos_count=len(attachments),
        )
        db.session.add(ticket)
        db.session.commit()

        # Envoi e-mail (best-effort : le ticket reste enregistré même si l'e-mail échoue)
        subject = f"[GMB] Demande {URGENCY_LABELS.get(urgency, urgency)} — {fiche.nom}"
        body = "\n".join([
            "Nouvelle demande de modification reçue depuis GMB Manager.",
            "",
            f"Fiche       : {fiche.nom}" + (f" ({fiche.categorie})" if fiche.categorie else ""),
            f"Demandé par : {user.name} <{user.email}>",
            f"Répondre à  : {contact_email.strip()}",
            f"Type        : {TYPE_LABELS.get(ttype, ttype)}",
            f"Urgence     : {URGENCY_LABELS.get(urgency, urgency)}",
            f"Éléments    : {', '.join(areas) if areas else '—'}",
            f"Photos      : {len(attachments)} jointe(s)",
            "",
            "Message :",
            message.strip(),
            "",
            f"Ticket #{ticket.id}",
        ])
        email_sent = send_email(
            to=TICKET_RECIPIENT,
            subject=subject,
            body=body,
            reply_to=contact_email.strip(),
            attachments=attachments,
        )

        logger.info("Ticket %s créé (email_sent=%s)", ticket.id, email_sent)
        return jsonify({**ticket.to_dict(), 'email_sent': email_sent}), 201

    except Exception as e:
        logger.error("Erreur création ticket : %s", e)
        db.session.rollback()
        return jsonify({'error': 'Internal error'}), 500
