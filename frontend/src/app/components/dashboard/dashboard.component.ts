import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GmbService, Fiche } from '../../services/gmb.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ScoreBarComponent } from '../../shared/score-bar.component';
import { CountUpComponent } from '../../shared/count-up.component';
import { AddFicheModalComponent } from '../add-fiche-modal/add-fiche-modal.component';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, IconComponent, ScoreBarComponent, CountUpComponent,
    AddFicheModalComponent,
  ],
  template: `
    <main class="container dash">
      <div class="dash-hello fade-up">
        <div>
          <p class="muted" style="font-weight:700;font-size:15px;margin-bottom:4px">{{ greeting() }} 👋</p>
          <h1 style="font-size:32px">Vos commerces en un coup d'œil</h1>
        </div>
        <button class="btn btn-accent" (click)="addFiche()"><app-icon name="plus" /> Ajouter une fiche</button>
      </div>

      @if (isLoading()) {
        <div class="center muted" style="padding:60px 0;font-weight:600">Chargement de vos fiches… 🌿</div>
      } @else {
        <div class="dash-stats fade-up" style="animation-delay:60ms">
          <div class="ministat">
            <span class="ministat-ic" style="background:var(--primary-soft);color:var(--primary-deep)"><app-icon name="grid" /></span>
            <div><div class="ministat-n">{{ fiches().length }}</div><div class="ministat-l">fiches gérées</div></div>
          </div>
          <div class="ministat">
            <span class="ministat-ic" style="background:var(--accent-soft);color:var(--accent-deep)"><app-icon name="chart" /></span>
            <div><div class="ministat-n"><app-count-up [value]="avgScore()" /></div><div class="ministat-l">score moyen</div></div>
          </div>
          <div class="ministat">
            <span class="ministat-ic" style="background:var(--tertiary-soft);color:var(--tertiary)"><app-icon name="starFill" /></span>
            <div><div class="ministat-n"><app-count-up [value]="totalReviews()" /></div><div class="ministat-l">avis reçus</div></div>
          </div>
          <div class="ministat">
            <span class="ministat-ic" style="background:var(--primary-soft);color:var(--primary-deep)"><app-icon name="check" /></span>
            <div><div class="ministat-n">{{ completeCount() }}</div><div class="ministat-l">fiches complètes</div></div>
          </div>
        </div>

        @if (fiches().length === 0) {
          <div class="card center" style="padding:48px">
            <p class="muted" style="font-weight:600">Aucune fiche pour le moment. Connectez votre première fiche Google ✨</p>
          </div>
        } @else {
          <div class="fiches-grid">
            @for (f of fiches(); track f.id; let i = $index) {
              <div class="card fiche-card fade-up" [style.animationDelay.ms]="i * 70" (click)="open(f, 'infos')">
                <div class="fiche-top">
                  <div class="grow">
                    <h3 class="fiche-name">{{ f.nom }}</h3>
                    @if (f.categorie) { <span class="pill pill-muted" style="margin-top:6px">{{ f.categorie }}</span> }
                  </div>
                  @if (f.score >= 100) { <span class="pill pill-complete" title="Fiche complète"><app-icon name="check" /> Complète</span> }
                </div>

                <div style="margin:18px 0 16px"><app-score-bar [score]="f.score" /></div>

                <div class="fiche-meta">
                  @if (f.adresse) { <div class="row" style="gap:9px"><app-icon name="pin" style="color:var(--accent);font-size:17px" /><span>{{ f.adresse }}</span></div> }
                  @if (f.telephone) { <div class="row" style="gap:9px"><app-icon name="phone" style="color:var(--primary);font-size:17px" /><span>{{ f.telephone }}</span></div> }
                </div>

                @if (needs(f).length > 0) {
                  <div class="fiche-needs">
                    <app-icon name="sparkle" style="color:var(--accent-deep)" />
                    <span>À compléter&nbsp;: {{ needs(f).slice(0,2).join(', ') }}{{ needs(f).length > 2 ? ' +' + (needs(f).length - 2) : '' }}</span>
                  </div>
                } @else {
                  <div class="fiche-needs done">
                    <app-icon name="check" style="color:var(--primary-deep)" />
                    <span>Rien à faire, tout est à jour ✨</span>
                  </div>
                }

                <div class="fiche-actions" (click)="$event.stopPropagation()">
                  <button class="btn btn-primary btn-sm grow" (click)="open(f, 'infos')"><app-icon name="edit" /> Gérer</button>
                  <button class="btn btn-ghost btn-sm" (click)="open(f, 'avis')" title="Avis"><app-icon name="star" /></button>
                  <button class="btn btn-ghost btn-sm" (click)="open(f, 'photos')" title="Photos"><app-icon name="camera" /></button>
                </div>
              </div>
            }

            <button class="card add-card fade-up" [style.animationDelay.ms]="fiches().length * 70" (click)="addFiche()">
              <span class="add-plus"><app-icon name="plus" /></span>
              <span style="font-weight:800;font-size:16px">Ajouter un commerce</span>
              <span class="faint" style="font-size:13.5px;font-weight:600;text-align:center">Connectez une nouvelle fiche Google en quelques clics</span>
            </button>
          </div>
        }
      }
    </main>

    @if (showAddFiche()) {
      <app-add-fiche-modal (close)="showAddFiche.set(false)" (created)="onCreated($event)" />
    }
  `,
})
export class DashboardComponent implements OnInit {
  private gmbService = inject(GmbService);
  private router = inject(Router);
  private toast = inject(ToastService);

  fiches = signal<Fiche[]>([]);
  isLoading = signal(true);
  totalReviews = signal(0);
  showAddFiche = signal(false);

  avgScore = computed(() => {
    const f = this.fiches();
    if (!f.length) return 0;
    return Math.round(f.reduce((s, x) => s + (x.score || 0), 0) / f.length);
  });
  completeCount = computed(() => this.fiches().filter(f => f.score >= 100).length);

  ngOnInit(): void {
    this.loadFiches();
    this.gmbService.getDashboardStats().subscribe({
      next: (s) => this.totalReviews.set(s?.nombre_total_avis ?? 0),
      error: () => { /* laisse 0 */ },
    });
  }

  loadFiches(): void {
    this.isLoading.set(true);
    this.gmbService.getFiches().subscribe({
      next: (fiches) => { this.fiches.set(fiches); this.isLoading.set(false); },
      error: (e) => { console.error('Erreur chargement fiches:', e); this.isLoading.set(false); },
    });
  }

  greeting(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Bonjour' : h < 18 ? 'Bel après-midi' : 'Bonsoir';
  }



  needs(f: Fiche): string[] {
    const n: string[] = [];
    if (!f.site_web) n.push('Site web');
    if (!f.horaires) n.push('Horaires');
    if (!f.description) n.push('Description');
    return n;
  }

  open(f: Fiche, which: 'infos' | 'avis' | 'photos') {
    this.router.navigate(['/fiche', f.id], { queryParams: { tab: which } });
  }

  addFiche() {
    this.showAddFiche.set(true);
  }

  onCreated(fiche: Fiche) {
    // Ajout optimiste en tête de liste (pas d'endpoint de création côté backend).
    this.fiches.update(list => [fiche, ...list]);
    this.toast.show('Fiche créée — pensez à la compléter 🌱');
  }
}
