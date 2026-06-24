import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GmbService, Fiche } from '../../services/gmb.service';
import { AuthService } from '../../services/auth.service';
import { StripeBillingService, SubscriptionState } from '../../services/stripe-billing.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ScoreBarComponent } from '../../shared/score-bar.component';

/**
 * Espace client (/mon-commerce) : vue simplifiée pour le commerçant.
 * - une seule fiche  -> carte détaillée directe + accès avis/photos/stats
 * - plusieurs fiches -> liste compacte
 * Pas de bouton "Ajouter une fiche" (réservé à l'admin).
 */
@Component({
  selector: 'app-client-home',
  standalone: true,
  imports: [CommonModule, IconComponent, ScoreBarComponent],
  template: `
    <main class="container dash">
      <div class="dash-hello fade-up">
        <div>
          <p class="muted" style="font-weight:700;font-size:15px;margin-bottom:4px">{{ greeting() }}</p>
          <h1 style="font-size:32px">{{ fiches().length > 1 ? 'Vos commerces' : 'Votre commerce' }}</h1>
        </div>
      </div>

      <!-- Bannière d'abonnement -->
      @if (sub(); as s) {
        @if (s.subscription_status === 'active' || s.subscription_status === 'trialing') {
          <div class="card fade-up" style="display:flex;align-items:center;gap:14px;padding:14px 18px;margin-bottom:22px">
            <span class="ministat-ic" style="background:var(--primary-soft);color:var(--primary-deep)"><app-icon name="check" /></span>
            <div class="grow">
              <div style="font-weight:800;font-size:15px">Abonnement actif</div>
              @if (s.current_period_end) {
                <div class="faint" style="font-size:13px;font-weight:600">Prochaine échéance le {{ s.current_period_end | date:'dd/MM/yyyy' }}</div>
              }
            </div>
            <button class="btn btn-ghost btn-sm" [disabled]="portalLoading()" (click)="manage()"><app-icon name="edit" /> Gérer</button>
          </div>
        } @else {
          <div class="card fade-up" style="display:flex;align-items:center;gap:14px;padding:16px 18px;margin-bottom:22px;border-color:color-mix(in srgb, var(--accent) 40%, var(--border))">
            <span class="ministat-ic" style="background:var(--accent-soft);color:var(--accent-deep)"><app-icon name="sparkle" /></span>
            <div class="grow">
              <div style="font-weight:800;font-size:15px">Activez votre abonnement</div>
              <div class="faint" style="font-size:13px;font-weight:600">Profitez de la gestion complète de votre fiche et du suivi de vos avis.</div>
            </div>
            <button class="btn btn-accent btn-sm" (click)="subscribe()"><app-icon name="sparkle" /> S'abonner</button>
          </div>
        }
      }

      @if (isLoading()) {
        <div class="center muted" style="padding:60px 0;font-weight:600">Chargement de votre espace…</div>
      } @else if (fiches().length === 0) {
        <div class="card center" style="padding:48px">
          <p class="muted" style="font-weight:600">
            Aucune fiche n'est encore rattachée à votre compte. Votre gestionnaire la mettra en place très bientôt.
          </p>
        </div>
      } @else if (fiches().length === 1) {
        <!-- Vue mono-fiche : carte détaillée directe -->
        @if (fiches()[0]; as f) {
          <div class="card fiche-card fade-up" style="animation-delay:60ms">
            <div class="fiche-top">
              <div class="grow">
                <h3 class="fiche-name" style="font-size:24px">{{ f.nom }}</h3>
                @if (f.categorie) { <span class="pill pill-muted" style="margin-top:6px">{{ f.categorie }}</span> }
              </div>
              @if (f.score >= 100) { <span class="pill pill-complete" title="Fiche complète"><app-icon name="check" /> Complète</span> }
            </div>

            <div style="margin:20px 0 18px"><app-score-bar [score]="f.score" /></div>

            <div class="fiche-meta">
              @if (f.adresse) { <div class="row" style="gap:9px"><app-icon name="pin" style="color:var(--accent);font-size:17px" /><span>{{ f.adresse }}</span></div> }
              @if (f.telephone) { <div class="row" style="gap:9px"><app-icon name="phone" style="color:var(--primary);font-size:17px" /><span>{{ f.telephone }}</span></div> }
              @if (f.site_web) { <div class="row" style="gap:9px"><app-icon name="globe" style="color:var(--primary);font-size:17px" /><span>{{ f.site_web }}</span></div> }
            </div>

            @if (needs(f).length > 0) {
              <div class="fiche-needs">
                <app-icon name="sparkle" style="color:var(--accent-deep)" />
                <span>À compléter : {{ needs(f).join(', ') }}</span>
              </div>
            } @else {
              <div class="fiche-needs done">
                <app-icon name="check" style="color:var(--primary-deep)" />
                <span>Votre fiche est complète et à jour.</span>
              </div>
            }

            <div class="fiche-actions">
              <button class="btn btn-ghost btn-sm" (click)="open(f, 'infos')" title="Informations"><app-icon name="info" /> Infos</button>
              <button class="btn btn-ghost btn-sm" (click)="open(f, 'avis')" title="Avis"><app-icon name="star" /> Avis</button>
              <button class="btn btn-ghost btn-sm" (click)="open(f, 'photos')" title="Photos"><app-icon name="camera" /> Photos</button>
              <button class="btn btn-ghost btn-sm" (click)="open(f, 'stats')" title="Statistiques"><app-icon name="chart" /> Stats</button>
            </div>

            <div class="form-foot" style="margin-top:18px">
              <span class="row faint" style="gap:8px;font-size:13.5px;font-weight:600">
                <app-icon name="check" style="color:var(--primary)" /> Une question, un changement ? Votre gestionnaire s'en occupe.
              </span>
              <button class="btn btn-accent" (click)="requestChange(f)">
                <app-icon name="message" /> Demander une modification
              </button>
            </div>
          </div>
        }
      } @else {
        <!-- Vue multi-fiches : liste compacte -->
        <div class="fiches-grid fade-up" style="animation-delay:60ms">
          @for (f of fiches(); track f.id; let i = $index) {
            <div class="card fiche-card fade-up" [style.animationDelay.ms]="i * 70" (click)="open(f, 'infos')">
              <div class="fiche-top">
                <div class="grow">
                  <h3 class="fiche-name">{{ f.nom }}</h3>
                  @if (f.categorie) { <span class="pill pill-muted" style="margin-top:6px">{{ f.categorie }}</span> }
                </div>
                @if (f.score >= 100) { <span class="pill pill-complete"><app-icon name="check" /> Complète</span> }
              </div>
              <div style="margin:18px 0 16px"><app-score-bar [score]="f.score" /></div>
              <div class="fiche-meta">
                @if (f.adresse) { <div class="row" style="gap:9px"><app-icon name="pin" style="color:var(--accent);font-size:17px" /><span>{{ f.adresse }}</span></div> }
              </div>
              <div class="fiche-actions" (click)="$event.stopPropagation()">
                <button class="btn btn-primary btn-sm grow" (click)="open(f, 'infos')"><app-icon name="edit" /> Consulter</button>
                <button class="btn btn-ghost btn-sm" (click)="requestChange(f)" title="Demander une modification"><app-icon name="message" /></button>
              </div>
            </div>
          }
        </div>
      }
    </main>
  `,
})
export class ClientHomeComponent implements OnInit {
  private gmbService = inject(GmbService);
  private auth = inject(AuthService);
  private billing = inject(StripeBillingService);
  private toast = inject(ToastService);
  private router = inject(Router);

  fiches = signal<Fiche[]>([]);
  isLoading = signal(true);
  name = signal('');
  sub = signal<SubscriptionState | null>(null);
  portalLoading = signal(false);

  ngOnInit(): void {
    this.auth.getMe().subscribe({
      next: (me: any) => { if (me?.name) this.name.set(me.name); },
      error: () => {},
    });
    this.gmbService.getFiches().subscribe({
      next: (fiches) => { this.fiches.set(fiches); this.isLoading.set(false); },
      error: (e) => { console.error('Erreur chargement fiches:', e); this.isLoading.set(false); },
    });
    this.billing.getSubscription().subscribe({
      next: (s) => this.sub.set(s),
      error: () => { /* bannière masquée si indisponible */ },
    });
  }

  subscribe() { this.router.navigate(['/paiement']); }

  manage() {
    this.portalLoading.set(true);
    this.billing.openPortal().subscribe({
      next: (res) => { window.location.href = res.url; },
      error: () => { this.portalLoading.set(false); this.toast.show('Impossible d\'ouvrir le portail. Réessayez.'); },
    });
  }

  greeting(): string {
    const h = new Date().getHours();
    const hello = h < 12 ? 'Bonjour' : h < 18 ? 'Bel après-midi' : 'Bonsoir';
    const n = this.name().trim().split(/\s+/)[0];
    return n ? `${hello}, ${n}` : hello;
  }

  needs(f: Fiche): string[] {
    const n: string[] = [];
    if (!f.site_web) n.push('Site web');
    if (!f.horaires) n.push('Horaires');
    if (!f.description) n.push('Description');
    return n;
  }

  open(f: Fiche, which: 'infos' | 'avis' | 'photos' | 'stats') {
    this.router.navigate(['/fiche', f.id], { queryParams: { tab: which } });
  }

  requestChange(f: Fiche) {
    this.router.navigate(['/fiche', f.id, 'demande']);
  }
}
