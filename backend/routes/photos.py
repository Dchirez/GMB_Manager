"""
Gestion des photos pour les fiches GMB (stockage Supabase)
"""
import logging
import os
from flask import Blueprint, request, jsonify
import requests
from models import db, Photo, User, Fiche
from utils.decorators import token_required

logger = logging.getLogger(__name__)

photos_bp = Blueprint('photos', __name__)


@photos_bp.route('/fiches/<fiche_id>/photos', methods=['GET'])
@token_required
def get_photos(fiche_id):
    """Retourne la liste des photos d'une fiche"""
    try:
        user_id = request.user.get('user_id')

        # Vérifier que la fiche appartient à l'utilisateur
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        fiche = Fiche.query.filter_by(id=fiche_id, user_id=user.id).first()
        if not fiche:
            return jsonify({'error': 'Fiche not found'}), 404

        photos = Photo.query.filter_by(fiche_id=fiche_id).order_by(Photo.uploaded_at.desc()).all()

        return jsonify([p.to_dict() for p in photos]), 200

    except Exception as e:
        logger.error(f"Erreur get photos: {e}")
        return jsonify({'error': 'Internal error'}), 500


@photos_bp.route('/fiches/<fiche_id>/photos', methods=['POST'])
@token_required
def upload_photo(fiche_id):
    """
    Upload une photo et la stocke dans Supabase Storage
    Requiert: multipart/form-data avec 'file' et 'caption' (optionnel)
    """
    try:
        user_id = request.user.get('user_id')

        # Vérifier que la fiche appartient à l'utilisateur
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        fiche = Fiche.query.filter_by(id=fiche_id, user_id=user.id).first()
        if not fiche:
            return jsonify({'error': 'Fiche not found'}), 404

        # Vérifier qu'un fichier a été envoyé
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # SECURITY FIX [CWE-434]: validate both extension AND content-type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        allowed_mimes = {'image/png', 'image/jpeg', 'image/gif', 'image/webp'}
        parts = file.filename.rsplit('.', 1)
        if len(parts) < 2 or parts[1].lower() not in allowed_extensions:
            return jsonify({'error': 'File type not allowed'}), 400
        if file.content_type not in allowed_mimes:
            return jsonify({'error': 'File type not allowed'}), 400

        # Caption optionnel, longueur bornée
        caption = request.form.get('caption', '')
        if len(caption) > 255:
            return jsonify({'error': 'Caption too long'}), 400

        # Upload à Supabase
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            logger.error("SUPABASE_URL ou SUPABASE_SERVICE_KEY non configurés")
            return jsonify({'error': 'Storage not configured'}), 500

        # Générer un nom unique pour le fichier
        import uuid
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{fiche_id}/{uuid.uuid4()}.{file_extension}"

        # SECURITY FIX [CWE-434]: force a safe server-controlled content-type
        safe_mime_map = {
            'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'gif': 'image/gif', 'webp': 'image/webp',
        }
        safe_mime = safe_mime_map[file_extension]

        headers = {
            'Authorization': f'Bearer {supabase_key}',
            'apikey': supabase_key,
            'Content-Type': safe_mime
        }

        supabase_endpoint = f"{supabase_url}/storage/v1/object/gmb-photos/{unique_filename}"

        logger.info(f"Uploading file to Supabase: {unique_filename}")

        file_data = file.read()
        # SECURITY FIX [CWE-400]: cap individual file size (MAX_CONTENT_LENGTH also enforced globally)
        if len(file_data) > 5 * 1024 * 1024:
            return jsonify({'error': 'File too large'}), 413
        logger.info(f"File size: {len(file_data)} bytes")

        response = requests.post(
            supabase_endpoint,
            headers=headers,
            data=file_data,
            timeout=30
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Supabase upload error: {response.status_code}")
            # SECURITY FIX [CWE-209]: do not forward raw upstream errors
            return jsonify({'error': 'Upload failed'}), 500

        # Construire l'URL publique
        public_url = f"{supabase_url}/storage/v1/object/public/gmb-photos/{unique_filename}"

        # Créer l'enregistrement en BDD
        photo = Photo(
            fiche_id=fiche_id,
            filename=file.filename,
            url=public_url,
            caption=caption
        )
        db.session.add(photo)
        db.session.commit()

        logger.info(f"Photo uploaded successfully: {photo.id}")

        return jsonify(photo.to_dict()), 201

    except Exception as e:
        logger.error(f"Erreur upload photo: {e}")
        db.session.rollback()
        return jsonify({'error': 'Internal error'}), 500


@photos_bp.route('/fiches/<fiche_id>/photos/<photo_id>', methods=['DELETE'])
@token_required
def delete_photo(fiche_id, photo_id):
    """Supprime une photo"""
    try:
        user_id = request.user.get('user_id')

        # Vérifier que la fiche appartient à l'utilisateur
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        fiche = Fiche.query.filter_by(id=fiche_id, user_id=user.id).first()
        if not fiche:
            return jsonify({'error': 'Fiche not found'}), 404

        photo = Photo.query.filter_by(id=photo_id, fiche_id=fiche_id).first()
        if not photo:
            return jsonify({'error': 'Photo not found'}), 404

        # Supprimer le fichier de Supabase
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

        if supabase_url and supabase_key:
            # Extraire le chemin du fichier de l'URL
            file_path = photo.url.split('/gmb-photos/')[1] if '/gmb-photos/' in photo.url else None

            if file_path:
                headers = {
                    'Authorization': f'Bearer {supabase_key}'
                }

                supabase_endpoint = f"{supabase_url}/storage/v1/object/gmb-photos/{file_path}"

                try:
                    requests.delete(supabase_endpoint, headers=headers, timeout=10)
                    logger.info(f"File deleted from Supabase: {file_path}")
                except Exception as e:
                    logger.warning(f"Could not delete file from Supabase: {e}")
                    # Continuer même si la suppression Supabase échoue

        # Supprimer l'enregistrement en BDD
        db.session.delete(photo)
        db.session.commit()

        logger.info(f"Photo deleted: {photo_id}")

        return jsonify({'message': 'Photo deleted'}), 200

    except Exception as e:
        logger.error(f"Erreur delete photo: {e}")
        db.session.rollback()
        return jsonify({'error': 'Internal error'}), 500
