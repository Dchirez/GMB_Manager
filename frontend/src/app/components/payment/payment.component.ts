import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { BrandMarkComponent } from '../../shared/brand-mark.component';
import { ToastService } from '../../services/toast.service';
import { cardBrand, fmtCard, fmtExp } from '../../shared/card.util';

interface PayPlan { name: string; monthly: number; blurb: string; feats: string[]; }

const PAY_PLANS: Record<string, PayPlan> = {
  decouverte: { name: 'Découverte', monthly: 0,  blurb: 'Pour démarrer en douceur',    feats: ['1 fiche', 'Score de complétude', 'Suivi des avis'] },
  pro:        { name: 'Pro',        monthly: 19, blurb: 'Le préféré des commerçants',   feats: ["Jusqu'à 5 fiches", 'Réponses aux avis', 'Photos & publications', 'Statistiques 12 mois'] },
  agence:     { name: 'Agence',     monthly: 49, blurb: 'Pour gérer plusieurs clients', feats: ['Fiches illimitées', 'Multi-utilisateurs', 'Rapports clients', 'Support prioritaire'] },
};

type Status = 'idle' | 'processing' | 'success';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, BrandMarkComponent],
  template: `
    @if (status() === 'success') {
      <main class="container pay">
        <div class="card pay-success pop-in">
          <div class="ps-badge"><app-icon name="check" /></div>
          <h1 style="font-size:30px;margin-bottom:10px">Paiement confirmé, merci&nbsp;! 🎉</h1>
          <p class="muted" style="font-size:16.5px;max-width:440px;line-height:1.6">
            Votre forfait <strong style="color:var(--primary-deep)">{{ plan.name }}</strong> est actif.
            Un reçu vient d'être envoyé à <strong>{{ email }}</strong>.
          </p>
          <div class="ps-recap">
            <div class="row" style="justify-content:space-between"><span class="muted" style="font-weight:600">Forfait {{ plan.name }} · {{ billing() === 'annual' ? 'annuel' : 'mensuel' }}</span><strong>{{ base() }}€ {{ periodLabel() }}</strong></div>
            <div class="row" style="justify-content:space-between;margin-top:8px"><span class="muted" style="font-weight:600">Prochaine échéance</span><strong>{{ billing() === 'annual' ? '3 juin 2027' : '3 juillet 2026' }}</strong></div>
          </div>
          <button class="btn btn-primary btn-lg" style="margin-top:26px" (click)="finish()"><app-icon name="grid" /> Retour au tableau de bord</button>
        </div>
      </main>
    } @else {
      <main class="container pay">
        <button class="btn btn-quiet back-btn fade-up" (click)="back()"><app-icon name="arrowLeft" /> Retour</button>
        <div class="pay-head fade-up" style="animation-delay:40ms">
          <h1 style="font-size:30px">Finaliser votre abonnement</h1>
          <p class="muted" style="font-size:16px;margin-top:6px;font-weight:600">Encore un instant et vous profitez de tout GMB&nbsp;Manager. 🌿</p>
        </div>

        <div class="pay-grid">
          <aside class="pay-summary fade-up" style="animation-delay:80ms">
            <div class="card">
              <span class="pill pill-primary" style="margin-bottom:14px">Forfait {{ plan.name }}</span>
              <p class="muted" style="font-size:14.5px;font-weight:600;margin-bottom:16px">{{ plan.blurb }}</p>

              <div class="billing-toggle">
                <button [class.on]="billing() === 'monthly'" (click)="billing.set('monthly')">Mensuel</button>
                <button [class.on]="billing() === 'annual'" (click)="billing.set('annual')">Annuel <span class="bt-save">-2 mois</span></button>
              </div>

              <ul class="pay-feats">
                @for (f of plan.feats; track $index) { <li><app-icon name="check" style="color:var(--primary)" /> {{ f }}</li> }
              </ul>

              <hr class="divider" style="margin:18px 0" />

              <div class="pay-line"><span>Forfait {{ plan.name }} ({{ billing() === 'annual' ? 'annuel' : 'mensuel' }})</span><span>{{ base() }}€</span></div>
              @if (billing() === 'annual' && savings() > 0) {
                <div class="pay-line save"><span><app-icon name="sparkle" /> Économie annuelle</span><span>−{{ savings() }}€</span></div>
              }
              @if (!promo()) {
                <button class="promo-link" (click)="promo.set(true)"><app-icon name="plus" /> Ajouter un code promo</button>
              } @else {
                <div class="promo-row"><input class="input" placeholder="Code promo" /><button class="btn btn-soft btn-sm">Appliquer</button></div>
              }

              <div class="pay-total">
                <div><div style="font-weight:800;font-size:15px">Total aujourd'hui</div><div class="faint" style="font-size:12.5px;font-weight:600">TVA incluse · sans engagement</div></div>
                <div class="pt-amount">{{ base() }}€<span class="faint" style="font-size:14px;font-weight:700"> {{ periodLabel() }}</span></div>
              </div>
            </div>
            <p class="pay-guarantee faint"><app-icon name="heart" style="color:var(--accent)" /> Satisfait ou remboursé pendant 14 jours</p>
          </aside>

          <section class="card pay-form fade-up" style="animation-delay:120ms">
            <h2 style="font-size:20px;margin-bottom:4px">Coordonnées de paiement</h2>
            <p class="muted" style="font-size:14px;font-weight:600;margin-bottom:22px">Paiement chiffré et sécurisé. Vous gardez le contrôle.</p>

            <div class="field" style="margin-bottom:18px">
              <label class="field-label"><app-icon name="globe" style="color:var(--ink-faint);font-size:17px" /> E-mail de facturation</label>
              <input class="input" [class.filled]="!!email" [(ngModel)]="email" placeholder="vous@exemple.fr" />
            </div>

            <div class="field" style="margin-bottom:18px">
              <label class="field-label"><app-icon name="text" style="color:var(--ink-faint);font-size:17px" /> Numéro de carte</label>
              <div class="card-input">
                <input class="input" [class.filled]="!!card" inputmode="numeric" [ngModel]="card" (ngModelChange)="card = fmt($event)" placeholder="1234 5678 9012 3456" />
                <span class="brand-badge"><app-brand-mark [brand]="brand()" /></span>
              </div>
            </div>

            <div class="pay-row2" style="margin-bottom:18px">
              <div class="field">
                <label class="field-label"><app-icon name="clock" style="color:var(--ink-faint);font-size:17px" /> Expiration</label>
                <input class="input" [class.filled]="!!exp" inputmode="numeric" [ngModel]="exp" (ngModelChange)="exp = fmtE($event)" placeholder="MM / AA" />
              </div>
              <div class="field">
                <label class="field-label"><app-icon name="info" style="color:var(--ink-faint);font-size:17px" /> CVC</label>
                <input class="input" [class.filled]="!!cvc" inputmode="numeric" [ngModel]="cvc" (ngModelChange)="cvc = digits($event)" placeholder="123" />
              </div>
            </div>

            <div class="field" style="margin-bottom:22px">
              <label class="field-label"><app-icon name="info" style="color:var(--ink-faint);font-size:17px" /> Nom sur la carte</label>
              <input class="input" [class.filled]="!!name" [(ngModel)]="name" placeholder="Sophie Martin" />
            </div>

            <button class="btn btn-primary btn-lg btn-block pay-btn" [class.disabled]="!ready()" [disabled]="status() !== 'idle'" (click)="pay()">
              @if (status() === 'processing') {
                <span class="spinner"></span> Paiement en cours…
              } @else {
                <app-icon name="check" /> Payer {{ base() }}€ {{ periodLabel() }}
              }
            </button>

            <div class="pay-trust">
              <span><app-icon name="check" style="color:var(--primary)" /> Chiffré SSL</span>
              <span><app-icon name="check" style="color:var(--primary)" /> Annulable à tout moment</span>
              <span><app-icon name="check" style="color:var(--primary)" /> Aucun frais caché</span>
            </div>
          </section>
        </div>
      </main>
    }
  `,
})
export class PaymentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  plan: PayPlan = PAY_PLANS['pro'];
  billing = signal<'monthly' | 'annual'>('annual');
  card = ''; name = ''; exp = ''; cvc = '';
  email = '';
  promo = signal(false);
  status = signal<Status>('idle');

  fmt = (v: string) => fmtCard(v);
  fmtE = (v: string) => fmtExp(v);
  digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);
  brand = () => cardBrand(this.card);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('planId') || 'pro';
    this.plan = PAY_PLANS[id] || PAY_PLANS['pro'];
  }

  base = () => this.billing() === 'annual' ? this.plan.monthly * 10 : this.plan.monthly;
  periodLabel = () => this.billing() === 'annual' ? '/ an' : '/ mois';
  savings = () => this.plan.monthly * 12 - this.plan.monthly * 10;

  ready(): boolean {
    return this.card.replace(/\s/g, '').length >= 15 && this.exp.length === 5
      && this.cvc.length >= 3 && this.name.trim().length > 1;
  }

  pay() {
    if (!this.ready() || this.status() !== 'idle') return;
    this.status.set('processing');
    setTimeout(() => this.status.set('success'), 1700);
  }

  back() { this.router.navigate(['/dashboard']); }

  finish() {
    this.toast.show(`Forfait ${this.plan.name} activé ✨`, true);
    this.router.navigate(['/dashboard']);
  }
}
