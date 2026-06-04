import { Component, signal, inject, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GmbService } from '../../services/gmb.service';
import { NotificationsComponent } from '../notifications/notifications.component';
import { SettingsModalComponent } from '../settings-modal/settings-modal.component';
import { PlanModalComponent } from '../plan-modal/plan-modal.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, NotificationsComponent, SettingsModalComponent, PlanModalComponent, IconComponent],
  template: `
    <header class="topbar">
      <div class="container topbar-inner">
        <!-- Brand -->
        <div class="brand" (click)="goDashboard()">
          <img src="assets/logo.png" alt="GMB Manager" />
          <span class="brand-name">GMB <span class="mark">Manager</span></span>
        </div>

        <div class="topbar-actions">
          <app-notifications />

          <!-- Profile dropdown -->
          <div class="profile-wrap">
            <button class="profile-btn" [class.open]="menuOpen()" (click)="toggleMenu($event)">
              <span class="profile-av">{{ initials() }}</span>
              <span class="profile-name">{{ shortName() }}</span>
              <span class="profile-caret" [style.transform]="menuOpen() ? 'rotate(180deg)' : 'none'">
                <app-icon name="caret" />
              </span>
            </button>

            @if (menuOpen()) {
              <div class="profile-menu pop-in">
                <div class="pm-head">
                  <span class="pm-av">{{ initials() }}</span>
                  <div class="grow" style="min-width:0">
                    <div class="pm-name">{{ name() }}</div>
                    <div class="pm-mail">{{ email() }}</div>
                  </div>
                </div>
                <div class="pm-plan">
                  <span class="row" style="gap:8px;font-weight:700;font-size:13.5px"><app-icon name="sparkle" style="color:var(--accent)" /> Forfait Pro</span>
                  <button class="pm-plan-link" (click)="openPlan()">Gérer</button>
                </div>
                <div class="pm-sep"></div>
                <button class="pm-item" (click)="openSettings()">
                  <span class="pm-ic"><app-icon name="edit" /></span>
                  <div class="grow"><div class="pm-item-t">Paramètres d'affichage</div><div class="pm-item-s">Couleur, police, espacement</div></div>
                  <app-icon name="arrowRight" style="color:var(--ink-faint);font-size:16px" />
                </button>
                <button class="pm-item" (click)="openPlan()">
                  <span class="pm-ic"><app-icon name="sparkle" /></span>
                  <div class="grow"><div class="pm-item-t">Gestion du forfait</div><div class="pm-item-s">Abonnement & facturation</div></div>
                  <app-icon name="arrowRight" style="color:var(--ink-faint);font-size:16px" />
                </button>
                <button class="pm-item" (click)="openInvoices()">
                  <span class="pm-ic"><app-icon name="text" /></span>
                  <div class="grow"><div class="pm-item-t">Factures & historique</div><div class="pm-item-s">Paiements & justificatifs PDF</div></div>
                  <app-icon name="arrowRight" style="color:var(--ink-faint);font-size:16px" />
                </button>
                <div class="pm-sep"></div>
                <button class="pm-item" (click)="askDelete()">
                  <span class="pm-ic"><app-icon name="close" /></span>
                  <div class="grow"><div class="pm-item-t">Supprimer mon compte</div><div class="pm-item-s">Effacer définitivement vos données</div></div>
                </button>
                <button class="pm-item pm-logout" (click)="logout()">
                  <span class="pm-ic"><app-icon name="logout" /></span>
                  <div class="grow"><div class="pm-item-t">Se déconnecter</div></div>
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </header>

    <!-- Modals d'apparence et de forfait -->
    @if (showSettings()) { <app-settings-modal (close)="showSettings.set(false)" /> }
    @if (showPlan()) { <app-plan-modal (close)="showPlan.set(false)" (choosePlan)="onChoosePlan($event)" /> }

    <!-- Confirmation de suppression de compte (RGPD) -->
    @if (showDeleteModal()) {
      <div class="modal-overlay" (click)="showDeleteModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div class="row" style="gap:13px">
              <span class="modal-ic" style="background:#FBEAE4;color:#C2553B"><app-icon name="close" /></span>
              <div><h2 style="font-size:21px">Supprimer votre compte ?</h2></div>
            </div>
            <button class="modal-close" (click)="showDeleteModal.set(false)"><app-icon name="close" /></button>
          </div>
          <div class="modal-body">
            <p class="muted" style="font-size:14.5px;line-height:1.6">
              Cette action est <strong>définitive</strong>. Toutes vos données (fiches, avis,
              publications, photos) seront effacées et l'accès de GMB Manager à votre compte
              Google sera révoqué. Cette opération est irréversible.
            </p>
            @if (deleteError()) { <p style="color:#C2553B;font-size:14px;margin-top:12px;font-weight:600">{{ deleteError() }}</p> }
          </div>
          <div class="modal-foot">
            <button class="btn btn-quiet" [disabled]="isDeleting()" (click)="showDeleteModal.set(false)">Annuler</button>
            <button class="btn btn-accent" style="background:#C2553B" [disabled]="isDeleting()" (click)="confirmDelete()">
              {{ isDeleting() ? 'Suppression…' : 'Supprimer définitivement' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class NavbarComponent implements OnInit {
  private authService = inject(AuthService);
  private gmbService = inject(GmbService);
  private router = inject(Router);
  private host = inject(ElementRef);

  menuOpen = signal(false);
  showSettings = signal(false);
  showPlan = signal(false);
  showDeleteModal = signal(false);
  isDeleting = signal(false);
  deleteError = signal<string | null>(null);

  name = signal('Mon compte');
  email = signal('');

  ngOnInit() {
    this.authService.getMe().subscribe({
      next: (me: any) => {
        if (me?.name) this.name.set(me.name);
        if (me?.email) this.email.set(me.email);
      },
      error: () => { /* garde les valeurs par défaut */ },
    });
  }

  initials() {
    const n = this.name().trim();
    if (!n) return '🙂';
    const parts = n.split(/\s+/);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (a + b).toUpperCase() || a.toUpperCase();
  }

  shortName() {
    const parts = this.name().trim().split(/\s+/);
    if (parts.length > 1) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    return parts[0] || 'Compte';
  }

  toggleMenu(e: Event) { e.stopPropagation(); this.menuOpen.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (this.menuOpen() && !this.host.nativeElement.contains(e.target)) this.menuOpen.set(false);
  }
  @HostListener('document:keydown.escape')
  onEsc() { this.menuOpen.set(false); }

  // Le logo ramène à l'accueil propre au rôle : dashboard global pour l'admin,
  // espace commerce pour le client.
  goDashboard() {
    this.router.navigate([this.authService.isAdmin() ? '/dashboard' : '/mon-commerce']);
  }

  openSettings() { this.menuOpen.set(false); this.showSettings.set(true); }
  openPlan() { this.menuOpen.set(false); this.showPlan.set(true); }
  openInvoices() { this.menuOpen.set(false); this.router.navigate(['/factures']); }
  askDelete() { this.menuOpen.set(false); this.deleteError.set(null); this.showDeleteModal.set(true); }

  onChoosePlan(planId: string) {
    this.showPlan.set(false);
    this.router.navigate(['/paiement', planId]);
  }

  logout() {
    this.menuOpen.set(false);
    this.gmbService.clearCache();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  confirmDelete() {
    this.isDeleting.set(true);
    this.deleteError.set(null);
    this.authService.deleteAccount().subscribe({
      next: () => {
        this.gmbService.clearCache();
        this.authService.logout();
        this.router.navigate(['/']);
      },
      error: () => {
        this.isDeleting.set(false);
        this.deleteError.set('La suppression a échoué. Réessayez ou contactez le support.');
      },
    });
  }
}
