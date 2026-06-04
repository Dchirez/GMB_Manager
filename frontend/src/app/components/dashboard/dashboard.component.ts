import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GmbService, AdminFiche, AdminStats } from '../../services/gmb.service';
import { IconComponent } from '../../shared/icon.component';
import { ScoreBarComponent } from '../../shared/score-bar.component';
import { CountUpComponent } from '../../shared/count-up.component';


type ScoreBucket = 'all' | 'low' | 'mid' | 'full';

/**
 * Dashboard ADMIN (prestataire) : vue globale de toutes les fiches de tous les
 * clients, avec stats globales et filtres (client, score, catégorie).
 * Protégé côté route par adminGuard ; les données viennent des endpoints
 * /api/admin/* (eux-mêmes protégés par @admin_required côté backend).
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ScoreBarComponent, CountUpComponent],
  template: `
    <main class="container dash">
      <div class="dash-hello fade-up">
        <div>
          <p class="muted" style="font-weight:700;font-size:15px;margin-bottom:4px">Espace gestionnaire</p>
          <h1 style="font-size:32px">Toutes les fiches de vos clients</h1>
        </div>
      </div>

      @if (isLoading()) {
        <div class="center muted" style="padding:60px 0;font-weight:600">Chargement des fiches…</div>
      } @else {
        <div class="dash-stats fade-up" style="animation-delay:60ms">
          <div class="ministat">
            <span class="ministat-ic" style="background:var(--primary-soft);color:var(--primary-deep)"><app-icon name="grid" /></span>
            <div><div class="ministat-n">{{ stats()?.nombre_fiches ?? fiches().length }}</div><div class="ministat-l">fiches gérées</div></div>
          </div>
          <div class="ministat">
            <span class="ministat-ic" style="background:var(--accent-soft);color:var(--accent-deep)"><app-icon name="user" /></span>
            <div><div class="ministat-n">{{ stats()?.nombre_clients_actifs ?? 0 }}</div><div class="ministat-l">clients actifs</div></div>
          </div>
          <div class="ministat">
            <span class="ministat-ic" style="background:var(--tertiary-soft);color:var(--tertiary)"><app-icon name="chart" /></span>
            <div><div class="ministat-n"><app-count-up [value]="stats()?.score_moyen ?? 0" /></div><div class="ministat-l">score moyen</div></div>
          </div>
          <div class="ministat">
            <span class="ministat-ic" style="background:var(--accent-soft);color:var(--accent-deep)"><app-icon name="star" /></span>
            <div><div class="ministat-n">{{ stats()?.avis_en_attente ?? 0 }}</div><div class="ministat-l">avis en attente</div></div>
          </div>
        </div>

        <!-- Filtres -->
        <div class="card fade-up" style="animation-delay:90ms;padding:16px 18px;margin-bottom:22px">
          <div class="row" style="gap:14px;flex-wrap:wrap;align-items:flex-end">
            <div class="field" style="margin:0;min-width:180px">
              <label class="field-label" style="font-size:13px">Client</label>
              <select class="input" [ngModel]="clientFilter()" (ngModelChange)="clientFilter.set($event)">
                <option value="all">Tous les clients</option>
                @for (c of clients(); track c) { <option [value]="c">{{ c }}</option> }
              </select>
            </div>
            <div class="field" style="margin:0;min-width:160px">
              <label class="field-label" style="font-size:13px">Catégorie</label>
              <select class="input" [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)">
                <option value="all">Toutes</option>
                @for (cat of categories(); track cat) { <option [value]="cat">{{ cat }}</option> }
              </select>
            </div>
            <div class="field" style="margin:0;min-width:180px">
              <label class="field-label" style="font-size:13px">Complétude</label>
              <select class="input" [ngModel]="scoreFilter()" (ngModelChange)="setScoreFilter($event)">
                <option value="all">Tous les scores</option>
                <option value="low">Faible (&lt; 50%)</option>
                <option value="mid">Moyen (50–99%)</option>
                <option value="full">Complète (100%)</option>
              </select>
            </div>
            <button class="btn btn-quiet btn-sm" (click)="resetFilters()" style="margin-left:auto"><app-icon name="close" /> Réinitialiser</button>
          </div>
        </div>

        @if (filteredFiches().length === 0) {
          <div class="card center" style="padding:48px">
            <p class="muted" style="font-weight:600">Aucune fiche ne correspond à ces filtres.</p>
          </div>
        } @else {
          <div class="fiches-grid">
            @for (f of filteredFiches(); track f.id; let i = $index) {
              <div class="card fiche-card fade-up" [style.animationDelay.ms]="i * 60" (click)="open(f, 'infos')">
                <div class="fiche-top">
                  <div class="grow">
                    <h3 class="fiche-name">{{ f.nom }}</h3>
                    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">
                      @if (f.client.nom) { <span class="pill pill-muted"><app-icon name="user" /> {{ f.client.nom }}</span> }
                      @if (f.client.is_active === false) { <span class="pill" style="background:#FBEAE4;color:#C2553B">Inactif</span> }
                      @if (f.categorie) { <span class="pill pill-muted">{{ f.categorie }}</span> }
                    </div>
                  </div>
                  @if (f.score >= 100) { <span class="pill pill-complete" title="Fiche complète"><app-icon name="check" /></span> }
                </div>

                <div style="margin:16px 0 14px"><app-score-bar [score]="f.score" /></div>

                <div class="fiche-meta">
                  @if (f.adresse) { <div class="row" style="gap:9px"><app-icon name="pin" style="color:var(--accent);font-size:17px" /><span>{{ f.adresse }}</span></div> }
                  @if (f.client.email) { <div class="row" style="gap:9px"><app-icon name="text" style="color:var(--primary);font-size:17px" /><span>{{ f.client.email }}</span></div> }
                </div>

                @if (f.avis_sans_reponse > 0) {
                  <div class="fiche-needs">
                    <app-icon name="star" style="color:var(--accent-deep)" />
                    <span>{{ f.avis_sans_reponse }} avis sans réponse</span>
                  </div>
                } @else {
                  <div class="fiche-needs done">
                    <app-icon name="check" style="color:var(--primary-deep)" />
                    <span>Tous les avis ont une réponse</span>
                  </div>
                }

                <div class="fiche-actions" (click)="$event.stopPropagation()">
                  <button class="btn btn-primary btn-sm grow" (click)="open(f, 'infos')"><app-icon name="edit" /> Gérer</button>
                  <button class="btn btn-ghost btn-sm" (click)="open(f, 'avis')" title="Avis"><app-icon name="star" /></button>
                  <button class="btn btn-ghost btn-sm" (click)="open(f, 'photos')" title="Photos"><app-icon name="camera" /></button>
                </div>
              </div>
            }
          </div>
        }
      }
    </main>
  `,
})
export class DashboardComponent implements OnInit {
  private gmbService = inject(GmbService);
  private router = inject(Router);

  fiches = signal<AdminFiche[]>([]);
  stats = signal<AdminStats | null>(null);
  isLoading = signal(true);

  clientFilter = signal<string>('all');
  categoryFilter = signal<string>('all');
  scoreFilter = signal<ScoreBucket>('all');

  clients = computed(() => {
    const set = new Set<string>();
    for (const f of this.fiches()) { if (f.client?.nom) set.add(f.client.nom); }
    return Array.from(set).sort();
  });

  categories = computed(() => {
    const set = new Set<string>();
    for (const f of this.fiches()) { if (f.categorie) set.add(f.categorie); }
    return Array.from(set).sort();
  });

  filteredFiches = computed(() => {
    const client = this.clientFilter();
    const cat = this.categoryFilter();
    const bucket = this.scoreFilter();
    return this.fiches().filter(f => {
      if (client !== 'all' && f.client?.nom !== client) return false;
      if (cat !== 'all' && f.categorie !== cat) return false;
      if (bucket === 'low' && f.score >= 50) return false;
      if (bucket === 'mid' && (f.score < 50 || f.score >= 100)) return false;
      if (bucket === 'full' && f.score < 100) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.gmbService.getAdminFiches().subscribe({
      next: (fiches) => { this.fiches.set(fiches); this.isLoading.set(false); },
      error: (e) => { console.error('Erreur chargement fiches admin:', e); this.isLoading.set(false); },
    });
    this.gmbService.getAdminStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => { /* stats best-effort */ },
    });
  }

  setScoreFilter(v: string) { this.scoreFilter.set(v as ScoreBucket); }

  resetFilters() {
    this.clientFilter.set('all');
    this.categoryFilter.set('all');
    this.scoreFilter.set('all');
  }

  open(f: AdminFiche, which: 'infos' | 'avis' | 'photos') {
    this.router.navigate(['/fiche', f.id], { queryParams: { tab: which } });
  }
}
