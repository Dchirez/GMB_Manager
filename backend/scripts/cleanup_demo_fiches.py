"""
Nettoyage ponctuel des fiches de démo persistées.

Garde une seule fiche de test sur le compte client drucart312321
(Boulangerie Martin) et supprime les autres via l'ORM (cascade avis/
publications/photos/tickets). Idempotent.

Usage : python -m scripts.cleanup_demo_fiches   (depuis backend/)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models import db, User, Fiche, Notification

KEEP_CLIENT_EMAIL = 'drucart312321@gmail.com'
KEEP_FICHE_NAME = 'Boulangerie Martin'

with app.app_context():
    user = User.query.filter_by(email=KEEP_CLIENT_EMAIL).first()
    if not user:
        print(f"Utilisateur {KEEP_CLIENT_EMAIL} introuvable — rien à faire.")
        raise SystemExit(0)

    fiches = Fiche.query.filter_by(user_id=user.id).all()
    print(f"{KEEP_CLIENT_EMAIL} a {len(fiches)} fiche(s).")

    kept = None
    to_delete = []
    for f in fiches:
        if kept is None and f.nom == KEEP_FICHE_NAME:
            kept = f
        else:
            to_delete.append(f)

    # Si la fiche à garder n'existe pas, on garde la première par sécurité.
    if kept is None and to_delete:
        kept = to_delete.pop(0)

    for f in to_delete:
        print(f"  - suppression: {f.nom} (id={f.id})")
        # Les notifications référencent la fiche sans cascade : suppression explicite d'abord.
        Notification.query.filter_by(fiche_id=f.id).delete(synchronize_session=False)
        db.session.delete(f)  # cascade -> avis / publications / tickets / photos

    db.session.commit()
    print(f"Conservé: {kept.nom if kept else '(aucune)'}")
    print(f"Supprimées: {len(to_delete)}")
