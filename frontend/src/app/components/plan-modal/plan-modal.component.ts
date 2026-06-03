import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/icon.component';

interface Plan {
  id: string; name: string; price: string; per: string; fiches: string;
  feats: string[]; cta: string; popular?: boolean;
}

const PLANS: Plan[] = [
  { id: 'decouverte', name: 'Découverte', price: '0', per: 'gratuit', fiches: '1 fiche', feats: ['Score de complétude', 'Suivi des avis'], cta: 'Forfait actuel' },
  { id: 'pro', name: 'Pro', price: '19', per: '/ mois', fiches: "Jusqu'à 5 fiches", feats: ['Tout Découverte', 'Réponses aux avis', 'Photos & publications', 'Statistiques 12 mois'], cta: 'Votre forfait', popular: true },
  { id: 'agence', name: 'Agence', price: '49', per: '/ mois', fiches: 'Fiches illimitées', feats: ['Tout Pro', 'Multi-utilisateurs', 'Rapports clients', 'Support prioritaire'], cta: 'Passer à Agence' },
];

/** Fenêtre Gestion du forfait — jauge d'utilisation + 3 forfaits. */
@Component({
  selector: 'app-plan-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal modal-wide" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div class="row" style="gap:13px">
            <span class="modal-ic"><app-icon name="sparkle" /></span>
            <div>
              <h2 style="font-size:21px">Gestion du forfait</h2>
              <p class="muted" style="font-size:14px;font-weight:600;margin-top:2px">Vous êtes sur le forfait Pro · prochaine échéance le 12 juillet 2026</p>
            </div>
          </div>
          <button class="modal-close" (click)="close.emit()" title="Fermer"><app-icon name="close" /></button>
        </div>

        <div class="modal-body">
          <div class="usage-card">
            <div class="row" style="justify-content:space-between;margin-bottom:10px">
              <span style="font-weight:700;font-size:14.5px">Fiches utilisées</span>
              <span style="font-weight:800;font-size:14.5px;color:var(--primary-deep)">3 / 5</span>
            </div>
            <div class="scorebar-track"><div class="scorebar-fill" style="width:60%;background:var(--primary)"></div></div>
            <p class="faint" style="font-size:12.5px;font-weight:600;margin-top:9px">Il vous reste 2 fiches à connecter sur ce forfait.</p>
          </div>

          <div class="plans-grid">
            @for (p of plans; track p.id) {
              <div class="plan-card" [class.current]="p.id === current" [class.popular]="p.popular">
                @if (p.popular) { <span class="plan-tag">Populaire</span> }
                <h3 style="font-size:18px">{{ p.name }}</h3>
                <div class="plan-price"><strong>{{ p.price }}€</strong> <span class="faint">{{ p.per }}</span></div>
                <span class="pill pill-muted" style="margin-bottom:14px">{{ p.fiches }}</span>
                <ul class="plan-feats">
                  @for (f of p.feats; track $index) {
                    <li><app-icon name="check" style="color:var(--primary)" /> {{ f }}</li>
                  }
                </ul>
                <button class="btn btn-block"
                        [class.btn-soft]="p.id === current"
                        [class.btn-primary]="p.id !== current && p.popular"
                        [class.btn-ghost]="p.id !== current && !p.popular"
                        [disabled]="p.id === current"
                        (click)="choose(p)">
                  @if (p.id === current) { <app-icon name="check" /> Forfait actuel } @else { {{ p.cta }} }
                </button>
              </div>
            }
          </div>
          <p class="faint center" style="font-size:12.5px;font-weight:600;margin-top:18px">
            Facturation gérée en toute sécurité · Annulez ou changez à tout moment
          </p>
        </div>
      </div>
    </div>
  `,
})
export class PlanModalComponent {
  @Output() close = new EventEmitter<void>();
  /** Émet l'id du forfait choisi → l'app redirige vers la page de paiement. */
  @Output() choosePlan = new EventEmitter<string>();
  plans = PLANS;
  current = 'pro';

  choose(p: Plan) {
    if (p.id === this.current) return;
    this.choosePlan.emit(p.id);
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }
}
