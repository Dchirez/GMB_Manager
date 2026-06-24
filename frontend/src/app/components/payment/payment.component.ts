import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { IconComponent } from '../../shared/icon.component';
import { ToastService } from '../../services/toast.service';
import { StripeBillingService, BillingPlan } from '../../services/stripe-billing.service';

type Step = 'loading' | 'choose' | 'pay' | 'processing' | 'success' | 'already' | 'unconfigured';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <main class="container pay">
      <button class="btn btn-quiet back-btn fade-up" (click)="back()"><app-icon name="arrowLeft" /> Retour</button>

      @switch (step()) {
        @case ('loading') {
          <div class="center muted" style="padding:60px 0;font-weight:600">Chargement…</div>
        }

        @case ('unconfigured') {
          <div class="card center" style="padding:48px;max-width:560px;margin:0 auto">
            <p class="muted" style="font-weight:600">Le paiement n'est pas encore disponible. Réessayez plus tard ou contactez votre gestionnaire.</p>
          </div>
        }

        @case ('already') {
          <div class="card center pop-in" style="padding:40px;max-width:560px;margin:0 auto">
            <div class="ps-badge"><app-icon name="check" /></div>
            <h1 style="font-size:26px;margin:14px 0 8px">Votre abonnement est actif</h1>
            <p class="muted" style="font-weight:600;max-width:420px;line-height:1.6">
              Vous profitez déjà de GMB Manager. Vous pouvez gérer ou annuler votre abonnement à tout moment.
            </p>
            <button class="btn btn-primary btn-lg" style="margin-top:22px" [disabled]="portalLoading()" (click)="manage()">
              <app-icon name="edit" /> {{ portalLoading() ? 'Ouverture…' : 'Gérer mon abonnement' }}
            </button>
          </div>
        }

        @case ('success') {
          <div class="card pay-success pop-in">
            <div class="ps-badge"><app-icon name="check" /></div>
            <h1 style="font-size:30px;margin-bottom:10px">Paiement confirmé, merci&nbsp;!</h1>
            <p class="muted" style="font-size:16.5px;max-width:440px;line-height:1.6">
              Votre abonnement est actif. Un reçu vous a été envoyé par e-mail.
            </p>
            <button class="btn btn-primary btn-lg" style="margin-top:26px" (click)="finish()"><app-icon name="grid" /> Accéder à mon espace</button>
          </div>
        }

        @default {
          <div class="pay-head fade-up" style="animation-delay:40ms">
            <h1 style="font-size:30px">Finaliser votre abonnement</h1>
            <p class="muted" style="font-size:16px;margin-top:6px;font-weight:600">Encore un instant et vous profitez de tout GMB Manager.</p>
          </div>

          <div class="pay-grid">
            <!-- Choix du forfait -->
            <aside class="pay-summary fade-up" style="animation-delay:80ms">
              @if (plans().length === 0) {
                <div class="card"><p class="muted" style="font-weight:600">Aucun forfait disponible pour le moment.</p></div>
              } @else {
                @for (p of plans(); track p.price_id) {
                  <div class="card plan-pick" [class.current]="selected()?.price_id === p.price_id"
                       (click)="step() !== 'pay' && step() !== 'processing' ? choose(p) : null">
                    <div class="row" style="justify-content:space-between;align-items:flex-start">
                      <div>
                        <h3 style="font-size:18px">{{ p.product }}</h3>
                        @if (p.description) { <p class="muted" style="font-size:13.5px;font-weight:600;margin-top:4px">{{ p.description }}</p> }
                      </div>
                      <div class="pt-amount" style="font-size:24px">{{ price(p) }}<span class="faint" style="font-size:13px;font-weight:700"> {{ per(p) }}</span></div>
                    </div>
                    @if (selected()?.price_id === p.price_id) {
                      <span class="pill pill-primary" style="margin-top:12px"><app-icon name="check" /> Sélectionné</span>
                    }
                  </div>
                }
              }
            </aside>

            <!-- Paiement -->
            <section class="card pay-form fade-up" style="animation-delay:120ms">
              <h2 style="font-size:20px;margin-bottom:4px">Coordonnées de paiement</h2>
              <p class="muted" style="font-size:14px;font-weight:600;margin-bottom:22px">Paiement chiffré et sécurisé par Stripe. Votre carte ne transite jamais par nos serveurs.</p>

              @if (step() === 'choose') {
                <p class="muted center" style="font-weight:600;padding:24px 0">Choisissez un forfait à gauche pour continuer.</p>
              }

              <!-- Conteneur monté par Stripe (Payment Element) -->
              <div id="stripe-payment-element" [style.display]="(step() === 'pay' || step() === 'processing') ? 'block' : 'none'"></div>

              @if (errorMsg()) {
                <p style="color:#C2553B;font-size:14px;margin-top:14px;font-weight:600">{{ errorMsg() }}</p>
              }

              @if (step() === 'pay' || step() === 'processing') {
                <button class="btn btn-primary btn-lg btn-block pay-btn" style="margin-top:20px"
                        [disabled]="step() === 'processing'" (click)="pay()">
                  @if (step() === 'processing') {
                    <span class="spinner"></span> Paiement en cours…
                  } @else {
                    <app-icon name="check" /> Payer {{ selected() ? price(selected()!) + ' ' + per(selected()!) : '' }}
                  }
                </button>
              }

              <div class="pay-trust" style="margin-top:18px">
                <span><app-icon name="check" style="color:var(--primary)" /> Chiffré SSL</span>
                <span><app-icon name="check" style="color:var(--primary)" /> Annulable à tout moment</span>
                <span><app-icon name="check" style="color:var(--primary)" /> Aucun frais caché</span>
              </div>
            </section>
          </div>
        }
      }
    </main>
  `,
})
export class PaymentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private billing = inject(StripeBillingService);

  step = signal<Step>('loading');
  plans = signal<BillingPlan[]>([]);
  selected = signal<BillingPlan | null>(null);
  errorMsg = signal<string | null>(null);
  portalLoading = signal(false);

  private publishableKey: string | null = null;
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

  ngOnInit() {
    // Retour depuis une éventuelle redirection 3-D Secure (return_url).
    const qp = this.route.snapshot.queryParamMap;
    const redirectStatus = qp.get('redirect_status');
    if (redirectStatus === 'succeeded') {
      this.step.set('success');
      return;
    }

    this.billing.getSubscription().subscribe({
      next: (sub) => {
        const active = sub.subscription_status === 'active' || sub.subscription_status === 'trialing';
        if (active) { this.step.set('already'); return; }
        this.loadConfig();
      },
      error: () => this.loadConfig(),
    });
  }

  private loadConfig() {
    this.billing.getConfig().subscribe({
      next: (cfg) => {
        if (!cfg.configured || !cfg.publishableKey) { this.step.set('unconfigured'); return; }
        this.publishableKey = cfg.publishableKey;
        this.plans.set(cfg.plans);
        this.step.set('choose');
      },
      error: () => this.step.set('unconfigured'),
    });
  }

  price(p: BillingPlan): string {
    const amount = (p.unit_amount ?? 0) / 100;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: (p.currency || 'eur').toUpperCase() }).format(amount);
  }

  per(p: BillingPlan): string {
    if (p.interval === 'year') return '/ an';
    if (p.interval === 'month') return '/ mois';
    return '';
  }

  async choose(p: BillingPlan) {
    this.errorMsg.set(null);
    this.selected.set(p);
    this.step.set('loading');

    this.billing.createSubscription(p.price_id).subscribe({
      next: async (res) => {
        try {
          if (!this.stripe) {
            this.stripe = await loadStripe(this.publishableKey!);
          }
          if (!this.stripe) { this.fail('Impossible de charger Stripe.'); return; }

          this.elements = this.stripe.elements({
            clientSecret: res.client_secret,
            appearance: { theme: 'flat', variables: { colorPrimary: '#57916A', borderRadius: '12px' } },
          });
          const paymentEl = this.elements.create('payment');
          this.step.set('pay');
          // Le conteneur n'existe qu'après le rendu du step 'pay'.
          setTimeout(() => paymentEl.mount('#stripe-payment-element'), 0);
        } catch (e) {
          this.fail('Erreur pendant le démarrage du paiement.');
        }
      },
      error: (err) => {
        if (err?.status === 409) { this.step.set('already'); return; }
        this.fail('Impossible de créer votre abonnement. Réessayez.');
      },
    });
  }

  async pay() {
    if (!this.stripe || !this.elements) return;
    this.errorMsg.set(null);
    this.step.set('processing');

    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: { return_url: `${window.location.origin}/paiement` },
      redirect: 'if_required',
    });

    if (error) {
      this.errorMsg.set(error.message || 'Le paiement a échoué. Vérifiez vos informations.');
      this.step.set('pay');
      return;
    }
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      this.step.set('success');
    } else {
      this.errorMsg.set('Paiement non confirmé. Réessayez.');
      this.step.set('pay');
    }
  }

  manage() {
    this.portalLoading.set(true);
    this.billing.openPortal().subscribe({
      next: (res) => { window.location.href = res.url; },
      error: () => { this.portalLoading.set(false); this.toast.show('Ouverture du portail impossible. Réessayez.'); },
    });
  }

  private fail(msg: string) {
    this.errorMsg.set(msg);
    this.step.set('choose');
  }

  back() { this.router.navigate(['/mon-commerce']); }

  finish() {
    this.toast.show('Abonnement activé', true);
    this.router.navigate(['/mon-commerce']);
  }
}
