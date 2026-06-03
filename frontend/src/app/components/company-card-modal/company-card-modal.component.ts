import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { BrandMarkComponent } from '../../shared/brand-mark.component';
import { cardBrand, fmtCard, fmtExp } from '../../shared/card.util';
import { BillingService, SavedCard } from '../../services/billing.service';

/** Modale d'ajout/édition d'une carte d'entreprise (carte + infos société). */
@Component({
  selector: 'app-company-card-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, BrandMarkComponent],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal modal-wide" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div class="row" style="gap:13px">
            <span class="modal-ic"><app-icon name="text" /></span>
            <div>
              <h2 style="font-size:21px">Carte d'entreprise</h2>
              <p class="muted" style="font-size:14px;font-weight:600;margin-top:2px">Enregistrez une carte professionnelle pour la facturation.</p>
            </div>
          </div>
          <button class="modal-close" (click)="close.emit()"><app-icon name="close" /></button>
        </div>

        <div class="modal-body">
          <div class="cc-form">
            <div class="cc-block">
              <div class="appear-label"><app-icon name="text" style="color:var(--primary)" /> Informations de la carte</div>
              <div class="field" style="margin-bottom:14px">
                <label class="field-label">Numéro de carte</label>
                <div class="card-input">
                  <input class="input" [class.filled]="!!card" inputmode="numeric" [ngModel]="card" (ngModelChange)="card = fmt($event)" placeholder="1234 5678 9012 3456" />
                  <span class="brand-badge"><app-brand-mark [brand]="brand()" /></span>
                </div>
              </div>
              <div class="pay-row2" style="margin-bottom:14px">
                <div class="field"><label class="field-label">Expiration</label><input class="input" [class.filled]="!!exp" inputmode="numeric" [ngModel]="exp" (ngModelChange)="exp = fmtE($event)" placeholder="MM / AA" /></div>
                <div class="field"><label class="field-label">CVC</label><input class="input" [class.filled]="!!cvc" inputmode="numeric" [ngModel]="cvc" (ngModelChange)="cvc = digits($event)" placeholder="123" /></div>
              </div>
              <div class="field"><label class="field-label">Titulaire de la carte</label><input class="input" [class.filled]="!!holder" [(ngModel)]="holder" placeholder="Nom et prénom" /></div>
            </div>

            <div class="cc-block">
              <div class="appear-label"><app-icon name="info" style="color:var(--accent)" /> Informations de l'entreprise</div>
              <div class="field" style="margin-bottom:14px"><label class="field-label">Raison sociale</label><input class="input" [class.filled]="!!company" [(ngModel)]="company" placeholder="Ma Société SARL" /></div>
              <div class="pay-row2" style="margin-bottom:14px">
                <div class="field"><label class="field-label">SIRET</label><input class="input" [class.filled]="!!siret" [(ngModel)]="siret" placeholder="123 456 789 00012" /></div>
                <div class="field"><label class="field-label">N° TVA intracom.</label><input class="input" [class.filled]="!!tva" [(ngModel)]="tva" placeholder="FR 00 123456789" /></div>
              </div>
              <div class="field"><label class="field-label">Adresse de facturation</label><input class="input" [class.filled]="!!addr" [(ngModel)]="addr" placeholder="Numéro, rue, ville, code postal" /></div>
            </div>
          </div>
          <p class="faint" style="font-size:12.5px;font-weight:600;margin-top:16px;display:flex;align-items:center;gap:8px">
            <app-icon name="check" style="color:var(--primary)" /> Données chiffrées · conformes RGPD · utilisées uniquement pour la facturation
          </p>
        </div>

        <div class="modal-foot">
          <button class="btn btn-quiet" (click)="close.emit()">Annuler</button>
          <button class="btn btn-primary" [class.pay-btn]="!ready()" [class.disabled]="!ready()" (click)="save()"><app-icon name="check" /> Enregistrer la carte</button>
        </div>
      </div>
    </div>
  `,
})
export class CompanyCardModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SavedCard>();

  card = ''; exp = ''; cvc = ''; holder = '';
  company = ''; siret = ''; tva = ''; addr = '';

  constructor(private billing: BillingService) {}

  fmt = (v: string) => fmtCard(v);
  fmtE = (v: string) => fmtExp(v);
  digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);
  brand = () => cardBrand(this.card);

  ready(): boolean {
    return this.card.replace(/\s/g, '').length >= 15 && this.exp.length === 5
      && this.cvc.length >= 3 && !!this.holder.trim() && !!this.company.trim();
  }

  save() {
    if (!this.ready()) return;
    const saved: SavedCard = {
      last4: this.card.replace(/\s/g, '').slice(-4),
      brand: this.brand() || 'visa',
      exp: this.exp,
      company: this.company.trim(),
    };
    this.billing.saveCard(saved);
    this.saved.emit(saved);
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }
}
