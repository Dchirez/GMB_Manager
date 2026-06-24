"""
Facturation / abonnements Stripe (self-service côté commerçant).

Flux (Stripe Payment Element + abonnement) :
  1. Front récupère la clé publishable + les forfaits actifs   -> GET  /api/billing/config
  2. Front crée un abonnement "incomplete" et reçoit un        -> POST /api/billing/create-subscription
     client_secret de PaymentIntent
  3. Le Payment Element confirme le paiement côté navigateur (la carte ne touche
     JAMAIS notre backend -> conforme PCI)
  4. Stripe notifie le backend (webhook) qui met à jour         -> POST /api/billing/webhook
     subscription_status / is_active (SOURCE DE VÉRITÉ)
  5. Gestion/annulation via le portail client Stripe            -> POST /api/billing/portal

Les forfaits/prix vivent entièrement dans Stripe (Products/Prices) : /config liste
les prix actifs, donc rien n'est codé en dur ici (prix décidés plus tard).

Variables d'env : STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET.
"""
import logging
import os
from datetime import datetime

from flask import Blueprint, request, jsonify
from models import db, User
from utils.decorators import token_required

logger = logging.getLogger(__name__)

billing_bp = Blueprint('billing', __name__)

try:
    import stripe
    _HAS_STRIPE = True
except ImportError:  # pragma: no cover
    _HAS_STRIPE = False

# Statuts considérés comme "abonnement valide" -> is_active = True
ACTIVE_STATUSES = {'active', 'trialing'}


def _init_stripe():
    """Configure la clé API Stripe ; renvoie False si non configuré."""
    key = os.getenv('STRIPE_SECRET_KEY')
    if not (_HAS_STRIPE and key):
        return False
    stripe.api_key = key
    return True


def _current_user():
    return User.query.filter_by(id=request.user.get('user_id')).first()


@billing_bp.route('/config', methods=['GET'])
@token_required
def config():
    """Clé publishable + liste des forfaits actifs (lus depuis Stripe)."""
    if not _init_stripe():
        return jsonify({'configured': False, 'publishableKey': None, 'plans': []}), 200

    plans = []
    try:
        prices = stripe.Price.list(active=True, expand=['data.product'], limit=100)
        for p in prices.data:
            prod = p.product
            if isinstance(prod, str) or not getattr(prod, 'active', True):
                continue
            if not p.recurring:
                continue  # on ne propose que des abonnements
            plans.append({
                'price_id': p.id,
                'product': prod.name,
                'description': getattr(prod, 'description', None),
                'unit_amount': p.unit_amount,        # en centimes
                'currency': p.currency,
                'interval': p.recurring.interval,    # 'month' | 'year'
                'interval_count': p.recurring.interval_count,
            })
    except Exception as e:
        logger.error(f"Stripe price list error: {e}")

    # Tri : montant croissant
    plans.sort(key=lambda x: x['unit_amount'] or 0)
    return jsonify({
        'configured': True,
        'publishableKey': os.getenv('STRIPE_PUBLISHABLE_KEY'),
        'plans': plans,
    }), 200


@billing_bp.route('/subscription', methods=['GET'])
@token_required
def subscription():
    """État d'abonnement de l'utilisateur courant (pour l'UI /mon-commerce)."""
    u = _current_user()
    if not u:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'subscription_status': u.subscription_status,
        'plan': u.plan,
        'is_active': u.is_active,
        'current_period_end': u.current_period_end.isoformat() if u.current_period_end else None,
        'has_subscription': bool(u.stripe_subscription_id),
    }), 200


@billing_bp.route('/create-subscription', methods=['POST'])
@token_required
def create_subscription():
    """Crée un abonnement 'incomplete' et renvoie le client_secret du PaymentIntent."""
    if not _init_stripe():
        return jsonify({'error': 'Billing not configured'}), 503

    data = request.get_json(silent=True) or {}
    price_id = data.get('price_id')
    if not price_id or not isinstance(price_id, str):
        return jsonify({'error': 'price_id required'}), 400

    u = _current_user()
    if not u:
        return jsonify({'error': 'User not found'}), 404

    # Empêche un double abonnement actif (sinon double facturation).
    if u.subscription_status in ACTIVE_STATUSES:
        return jsonify({'error': 'already_active'}), 409

    try:
        # Valide que le price existe et est actif (anti-tampering du client).
        price = stripe.Price.retrieve(price_id)
        if not price or not price.active or not price.recurring:
            return jsonify({'error': 'Invalid price'}), 400

        # Assure un Customer Stripe pour l'utilisateur.
        if not u.stripe_customer_id:
            cust = stripe.Customer.create(
                email=u.email, name=u.name, metadata={'user_id': str(u.id)}
            )
            u.stripe_customer_id = cust.id
            db.session.commit()

        sub = stripe.Subscription.create(
            customer=u.stripe_customer_id,
            items=[{'price': price_id}],
            payment_behavior='default_incomplete',
            payment_settings={'save_default_payment_method': 'on_subscription'},
            expand=['latest_invoice.payment_intent'],
            metadata={'user_id': str(u.id)},
        )

        u.stripe_subscription_id = sub.id
        u.subscription_status = sub.status
        u.plan = price_id
        db.session.commit()

        client_secret = sub.latest_invoice.payment_intent.client_secret
        return jsonify({'subscription_id': sub.id, 'client_secret': client_secret}), 200
    except Exception as e:
        logger.error(f"create_subscription error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Could not create subscription'}), 500


@billing_bp.route('/portal', methods=['POST'])
@token_required
def portal():
    """Ouvre le portail client Stripe (gérer / changer / annuler)."""
    if not _init_stripe():
        return jsonify({'error': 'Billing not configured'}), 503
    u = _current_user()
    if not u or not u.stripe_customer_id:
        return jsonify({'error': 'No Stripe customer'}), 400
    frontend = os.getenv('FRONTEND_URL') or 'http://localhost:4200'
    try:
        sess = stripe.billing_portal.Session.create(
            customer=u.stripe_customer_id,
            return_url=f'{frontend}/mon-commerce',
        )
        return jsonify({'url': sess.url}), 200
    except Exception as e:
        logger.error(f"portal error: {e}")
        return jsonify({'error': 'Could not open portal'}), 500


@billing_bp.route('/webhook', methods=['POST'])
def webhook():
    """
    Webhook Stripe — SOURCE DE VÉRITÉ de l'état d'abonnement.
    Signature vérifiée (STRIPE_WEBHOOK_SECRET requis) ; pas de JWT (appel serveur-à-serveur).
    """
    if not _init_stripe():
        return jsonify({'error': 'Billing not configured'}), 503

    secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    if not secret:
        # SECURITY: ne jamais traiter un webhook non signé.
        logger.error("STRIPE_WEBHOOK_SECRET manquant — webhook rejeté")
        return jsonify({'error': 'Webhook not configured'}), 503

    payload = request.get_data()
    sig = request.headers.get('Stripe-Signature')
    try:
        event = stripe.Webhook.construct_event(payload, sig, secret)
    except Exception as e:
        logger.warning(f"Webhook signature verification failed: {e}")
        return jsonify({'error': 'Invalid signature'}), 400

    try:
        _handle_event(event)
    except Exception as e:
        logger.error(f"Webhook handling error: {e}")
        db.session.rollback()
        # 200 quand même pour éviter les retries en boucle sur une erreur applicative ?
        # Non : on renvoie 500 pour que Stripe retente (l'événement n'a pas été traité).
        return jsonify({'error': 'Handling error'}), 500

    return jsonify({'received': True}), 200


def _handle_event(event):
    etype = event['type']
    obj = event['data']['object']

    if etype.startswith('customer.subscription.'):
        _sync_subscription(obj)
    elif etype in ('invoice.paid', 'invoice.payment_failed'):
        sub_id = obj.get('subscription')
        if sub_id:
            sub = stripe.Subscription.retrieve(sub_id)
            _sync_subscription(sub)
    else:
        logger.info(f"Webhook ignoré (type non géré) : {etype}")


def _sync_subscription(sub):
    """Met à jour l'utilisateur depuis un objet Subscription Stripe."""
    cust_id = sub.get('customer')
    user = User.query.filter_by(stripe_customer_id=cust_id).first()
    if not user:
        uid = (sub.get('metadata') or {}).get('user_id')
        if uid:
            user = User.query.filter_by(id=uid).first()
    if not user:
        logger.warning(f"Webhook : aucun utilisateur pour customer {cust_id}")
        return

    status = sub.get('status')
    user.stripe_subscription_id = sub.get('id')
    user.subscription_status = status
    user.is_active = status in ACTIVE_STATUSES

    cpe = sub.get('current_period_end')
    if cpe:
        user.current_period_end = datetime.utcfromtimestamp(cpe)

    try:
        items = (sub.get('items') or {}).get('data') or []
        if items:
            user.plan = items[0]['price']['id']
    except Exception:
        pass

    db.session.commit()
    logger.info(f"Abonnement synchronisé : user={user.id} status={status} active={user.is_active}")
