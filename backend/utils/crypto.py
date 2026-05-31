"""
Chiffrement applicatif des données sensibles au repos (jetons OAuth Google).

Les colonnes de tokens utilisent le type SQLAlchemy `EncryptedText` : le chiffrement
et le déchiffrement sont transparents pour le reste du code. La base ne contient
jamais de token en clair — sans la clé, les données sont illisibles (protège même
contre une fuite de la base ou un accès non autorisé à l'hébergeur).

Clé :
- `FERNET_KEY` (variable d'environnement) si elle est définie — recommandé en prod.
- sinon, dérivée de `SECRET_KEY` via SHA-256 (fonctionne sans config supplémentaire).
"""
import os
import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.types import TypeDecorator, Text

logger = logging.getLogger(__name__)


def _load_fernet():
    key = os.getenv('FERNET_KEY')
    if key:
        return Fernet(key.encode() if isinstance(key, str) else key)

    secret = os.getenv('SECRET_KEY')
    if not secret:
        raise RuntimeError(
            "Aucune clé de chiffrement : définir FERNET_KEY ou SECRET_KEY."
        )
    # Dérive une clé Fernet valide (32 octets, base64 url-safe) depuis SECRET_KEY.
    derived = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(derived)


_fernet = None


def _fernet_instance():
    global _fernet
    if _fernet is None:
        _fernet = _load_fernet()
    return _fernet


def encrypt(value: str) -> str:
    return _fernet_instance().encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet_instance().decrypt(token.encode()).decode()


class EncryptedText(TypeDecorator):
    """Colonne texte chiffrée au repos, transparente à l'usage."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return decrypt(value)
        except InvalidToken:
            # Valeur héritée stockée en clair avant l'activation du chiffrement :
            # on la renvoie telle quelle ; elle sera chiffrée à la prochaine écriture.
            logger.warning("Token non chiffré détecté (donnée héritée) — sera chiffré à la prochaine écriture")
            return value
