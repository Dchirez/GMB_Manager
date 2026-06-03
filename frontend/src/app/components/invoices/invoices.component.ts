import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { BrandMarkComponent } from '../../shared/brand-mark.component';
import { CompanyCardModalComponent } from '../company-card-modal/company-card-modal.component';
import { BillingService } from '../../services/billing.service';
import { ToastService } from '../../services/toast.service';

interface Invoice { id: string; date: string; plan: string; period: string; amount: number; }

const INVOICES: Invoice[] = [
  { id: 'FAC-2026-006', date: '12 juin 2026',    plan: 'Forfait Pro', period: 'Juin 2026',    amount: 19 },
  { id: 'FAC-2026-005', date: '12 mai 2026',     plan: 'Forfait Pro', period: 'Mai 2026',     amount: 19 },
  { id: 'FAC-2026-004', date: '12 avril 2026',   plan: 'Forfait Pro', period: 'Avril 2026',   amount: 19 },
  { id: 'FAC-2026-003', date: '12 mars 2026',    plan: 'Forfait Pro', period: 'Mars 2026',    amount: 19 },
  { id: 'FAC-2026-002', date: '12 février 2026', plan: 'Forfait Pro', period: 'Février 2026', amount: 19 },
  { id: 'FAC-2026-001', date: '12 janvier 2026', plan: 'Forfait Découverte → Pro', period: 'Janvier 2026', amount: 19 },
];

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, IconComponent, BrandMarkComponent, CompanyCardModalComponent],
  template: `
    <main class="container invoices">
      <button class="btn btn-quiet back-btn fade-up" (click)="back()"><app-icon name="arrowLeft" /> Tableau de bord</button>
      <div class="pay-head fade-up" style="animation-delay:40ms">
        <h1 style="font-size:30px">Factures & historique</h1>
        <p class="muted" style="font-size:16px;margin-top:6px;font-weight:600">Retrouvez ici tous vos paiements et votre moyen de paiement. 🧾</p>
      </div>

      <div class="inv-top fade-up" style="animation-delay:80ms">
        <div class="card">
          <div class="row" style="justify-content:space-between;margin-bottom:16px">
            <h3 style="font-size:18px">Moyen de paiement</h3>
            <span class="pill pill-primary">Forfait Pro</span>
          </div>
          @if (billing.card(); as c) {
            <div class="method-saved">
              <div class="mc-chip"><app-brand-mark [brand]="c.brand" /></div>
              <div class="grow">
                <div style="font-weight:800;font-size:15px">•••• •••• •••• {{ c.last4 }}</div>
                <div class="faint" style="font-size:13px;font-weight:600">{{ c.company }} · expire {{ c.exp }}</div>
              </div>
              <button class="btn btn-ghost btn-sm" (click)="showCard.set(true)"><app-icon name="edit" /> Modifier</button>
            </div>
          } @else {
            <div class="method-empty">
              <span class="method-ic"><app-icon name="text" /></span>
              <div class="grow">
                <div style="font-weight:800;font-size:15px">Aucune carte enregistrée</div>
                <div class="faint" style="font-size:13px;font-weight:600">Ajoutez une carte d'entreprise pour vos factures.</div>
              </div>
              <button class="btn btn-primary btn-sm" (click)="showCard.set(true)"><app-icon name="plus" /> Ajouter une carte</button>
            </div>
          }
        </div>
        <div class="card inv-summary">
          <span class="ministat-ic" style="background:var(--primary-soft);color:var(--primary-deep)"><app-icon name="check" /></span>
          <div>
            <div class="ministat-n">{{ total }}€</div>
            <div class="ministat-l">payés en 2026 · {{ invoices.length }} factures</div>
          </div>
        </div>
      </div>

      <div class="card inv-table-card fade-up" style="animation-delay:120ms">
        <h3 style="font-size:18px;margin-bottom:4px">Vos factures</h3>
        <p class="muted" style="font-size:14px;font-weight:600;margin-bottom:18px">Téléchargez vos justificatifs au format PDF.</p>
        <div class="inv-head">
          <span>Facture</span><span>Date</span><span>Forfait</span><span style="text-align:right">Montant</span><span style="text-align:center">Statut</span><span></span>
        </div>
        @for (inv of invoices; track inv.id; let i = $index) {
          <div class="inv-row" [style.animationDelay.ms]="140 + i * 50">
            <span class="inv-num">{{ inv.id }}</span>
            <span class="muted">{{ inv.date }}</span>
            <span class="muted">{{ inv.plan }}</span>
            <span style="text-align:right;font-weight:800">{{ inv.amount }}€</span>
            <span style="text-align:center"><span class="inv-badge"><app-icon name="check" /> Payée</span></span>
            <span style="text-align:right"><button class="inv-dl" title="Télécharger le PDF" (click)="downloadPdf()"><app-icon name="upload" style="transform:rotate(180deg)" /></button></span>
          </div>
        }
      </div>
    </main>

    @if (showCard()) {
      <app-company-card-modal (close)="showCard.set(false)" (saved)="onSaved()" />
    }
  `,
})
export class InvoicesComponent {
  private router = inject(Router);
  private toast = inject(ToastService);
  billing = inject(BillingService);

  invoices = INVOICES;
  total = INVOICES.reduce((s, i) => s + i.amount, 0);
  showCard = signal(false);

  back() { this.router.navigate(['/dashboard']); }
  downloadPdf() { this.toast.show('Téléchargement du PDF bientôt disponible 📄'); }
  onSaved() { this.toast.show('Carte d\'entreprise enregistrée 💳'); }
}
