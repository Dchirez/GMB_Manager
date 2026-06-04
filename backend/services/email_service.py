"""
Envoi d'e-mails via SMTP (bibliothèque standard, pas de dépendance externe).

Configuration via variables d'environnement :
  SMTP_HOST      hôte SMTP (ex : smtp.gmail.com)
  SMTP_PORT      port (587 pour STARTTLS, 465 pour SSL) — défaut 587
  SMTP_USER      identifiant SMTP (adresse d'envoi)
  SMTP_PASSWORD  mot de passe / app password
  SMTP_FROM      expéditeur affiché (défaut : SMTP_USER)

Si la config est absente, l'envoi est ignoré (best-effort) et la fonction
renvoie False — l'appelant peut alors persister la demande sans la perdre.
"""
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def _smtp_config():
    return {
        'host': os.getenv('SMTP_HOST'),
        'port': int(os.getenv('SMTP_PORT', '587')),
        'user': os.getenv('SMTP_USER'),
        'password': os.getenv('SMTP_PASSWORD'),
        'from': os.getenv('SMTP_FROM') or os.getenv('SMTP_USER'),
    }


def is_email_configured():
    """True si le minimum requis pour envoyer un e-mail est présent."""
    c = _smtp_config()
    return bool(c['host'] and c['user'] and c['password'])


def send_email(to, subject, body, reply_to=None, attachments=None):
    """
    Envoie un e-mail texte avec pièces jointes optionnelles.

    attachments : liste de tuples (filename, bytes, mime).
    Retourne True si envoyé, False sinon (best-effort, ne lève pas).
    """
    c = _smtp_config()
    if not (c['host'] and c['user'] and c['password']):
        logger.warning("SMTP non configuré — e-mail non envoyé (%s)", subject)
        return False

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = c['from']
    msg['To'] = to
    if reply_to:
        msg['Reply-To'] = reply_to
    msg.set_content(body)

    for filename, data, mime in (attachments or []):
        maintype, _, subtype = (mime or 'application/octet-stream').partition('/')
        msg.add_attachment(
            data,
            maintype=maintype or 'application',
            subtype=subtype or 'octet-stream',
            filename=filename,
        )

    try:
        context = ssl.create_default_context()
        if c['port'] == 465:
            with smtplib.SMTP_SSL(c['host'], c['port'], context=context, timeout=20) as server:
                server.login(c['user'], c['password'])
                server.send_message(msg)
        else:
            with smtplib.SMTP(c['host'], c['port'], timeout=20) as server:
                server.starttls(context=context)
                server.login(c['user'], c['password'])
                server.send_message(msg)
        logger.info("E-mail envoyé : %s", subject)
        return True
    except Exception as e:
        logger.error("Échec de l'envoi d'e-mail : %s", e)
        return False
