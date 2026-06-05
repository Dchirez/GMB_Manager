"""
Envoi d'e-mails — deux canaux possibles :

1. API HTTP Resend (recommandé en production sur Render, qui BLOQUE les ports SMTP
   sortants 25/465/587 → smtplib échoue avec « Network is unreachable »).
   Activé dès que RESEND_API_KEY est présent. Utilise HTTPS (port 443).

2. SMTP via la bibliothèque standard (utile en local, où SMTP n'est pas bloqué).
   Activé si la config SMTP_* est présente et que Resend ne l'est pas.

Variables d'environnement :
  # Canal Resend (prioritaire)
  RESEND_API_KEY   clé API Resend (re_...)
  RESEND_FROM      expéditeur (défaut : 'GMB Manager <onboarding@resend.dev>').
                   Pour un expéditeur @dchirez.fr, vérifier le domaine dans Resend.

  # Canal SMTP (fallback)
  SMTP_HOST, SMTP_PORT (défaut 587), SMTP_USER, SMTP_PASSWORD,
  SMTP_FROM (défaut : SMTP_USER)

Si aucun canal n'est configuré, l'envoi est ignoré (best-effort) et la fonction
renvoie False — l'appelant peut alors persister la demande sans la perdre.
"""
import base64
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

import requests

logger = logging.getLogger(__name__)

RESEND_API_URL = 'https://api.resend.com/emails'
DEFAULT_RESEND_FROM = 'GMB Manager <onboarding@resend.dev>'


def _smtp_config():
    return {
        'host': os.getenv('SMTP_HOST'),
        'port': int(os.getenv('SMTP_PORT', '587')),
        'user': os.getenv('SMTP_USER'),
        'password': os.getenv('SMTP_PASSWORD'),
        'from': os.getenv('SMTP_FROM') or os.getenv('SMTP_USER'),
    }


def _has_resend():
    return bool(os.getenv('RESEND_API_KEY'))


def _has_smtp():
    c = _smtp_config()
    return bool(c['host'] and c['user'] and c['password'])


def is_email_configured():
    """True si au moins un canal d'envoi est configuré."""
    return _has_resend() or _has_smtp()


def _send_via_resend(to, subject, body, reply_to=None, attachments=None):
    """Envoie via l'API HTTP Resend. Retourne True/False (ne lève pas)."""
    payload = {
        'from': os.getenv('RESEND_FROM') or DEFAULT_RESEND_FROM,
        'to': [to],
        'subject': subject,
        'text': body,
    }
    if reply_to:
        payload['reply_to'] = reply_to

    if attachments:
        payload['attachments'] = [
            {
                'filename': filename,
                'content': base64.b64encode(data).decode('ascii'),
            }
            for (filename, data, _mime) in attachments
        ]

    try:
        resp = requests.post(
            RESEND_API_URL,
            json=payload,
            headers={'Authorization': f"Bearer {os.getenv('RESEND_API_KEY')}"},
            timeout=20,
        )
        if resp.status_code in (200, 201):
            logger.info("E-mail envoyé via Resend : %s", subject)
            return True
        # SECURITY: ne pas logguer la clé ; le corps Resend ne contient pas de secret.
        logger.error("Resend a refusé l'e-mail (HTTP %s) : %s", resp.status_code, resp.text[:300])
        return False
    except Exception as e:
        logger.error("Échec de l'envoi via Resend : %s", e)
        return False


def _send_via_smtp(to, subject, body, reply_to=None, attachments=None):
    """Envoie via SMTP (stdlib). Retourne True/False (ne lève pas)."""
    c = _smtp_config()
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
        logger.info("E-mail envoyé via SMTP : %s", subject)
        return True
    except Exception as e:
        logger.error("Échec de l'envoi d'e-mail (SMTP) : %s", e)
        return False


def send_email(to, subject, body, reply_to=None, attachments=None):
    """
    Envoie un e-mail texte avec pièces jointes optionnelles.

    attachments : liste de tuples (filename, bytes, mime).
    Choisit Resend si configuré (HTTPS, fonctionne sur Render), sinon SMTP.
    Retourne True si envoyé, False sinon (best-effort, ne lève pas).
    """
    if _has_resend():
        return _send_via_resend(to, subject, body, reply_to, attachments)
    if _has_smtp():
        return _send_via_smtp(to, subject, body, reply_to, attachments)
    logger.warning("Aucun canal e-mail configuré — e-mail non envoyé (%s)", subject)
    return False
