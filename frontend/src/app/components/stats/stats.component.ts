import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GmbService, AvisStats } from '../../services/gmb.service';
import { IconComponent } from '../../shared/icon.component';
import { CountUpComponent } from '../../shared/count-up.component';

interface Pt { x: number; y: number; }

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, IconComponent, CountUpComponent],
  template: `
    @if (!data()) {
      <div class="center muted" style="padding:48px 0;font-weight:600">Chargement des statistiques…</div>
    } @else {
      <div class="stats-wrap">
        <div class="stats-tiles">
          <div class="card stat-tile fade-up">
            <span class="stat-ic" style="background:var(--accent-soft);color:var(--accent-deep)"><app-icon name="star" /></span>
            <div class="stat-num"><app-count-up [value]="data()!.total_avis" /></div>
            <div class="stat-lab">Avis reçus</div>
            <div class="stat-sub">au total</div>
          </div>
          <div class="card stat-tile fade-up" style="animation-delay:70ms">
            <span class="stat-ic" style="background:var(--primary-soft);color:var(--primary-deep)"><app-icon name="starFill" /></span>
            <div class="stat-num"><app-count-up [value]="data()!.note_moyenne" [decimals]="1" suffix="/5" /></div>
            <div class="stat-lab">Note moyenne</div>
            <div class="stat-sub">{{ data()!.note_moyenne >= 4 ? 'Excellente réputation' : 'Marge de progression' }}</div>
          </div>
          <div class="card stat-tile fade-up" style="animation-delay:140ms">
            <span class="stat-ic" style="background:var(--tertiary-soft);color:var(--tertiary)"><app-icon name="reply" /></span>
            <div class="stat-num"><app-count-up [value]="data()!.taux_reponse" suffix="%" /></div>
            <div class="stat-lab">Taux de réponse</div>
            <div class="stat-sub">{{ data()!.taux_reponse >= 70 ? 'Continuez comme ça !' : 'Pensez à répondre' }}</div>
          </div>
          <div class="card stat-tile fade-up" style="animation-delay:210ms">
            <span class="stat-ic" style="background:var(--accent-soft);color:var(--accent-deep)"><app-icon name="heart" /></span>
            <div class="stat-num"><app-count-up [value]="happyCount()" /></div>
            <div class="stat-lab">Clients ravis (4-5★)</div>
            <div class="stat-sub">{{ happyPct() }}% de satisfaction</div>
          </div>
        </div>

        <div class="stats-cols">
          <!-- Répartition des notes -->
          <div class="card fade-up" style="animation-delay:120ms">
            <h3 style="font-size:19px;margin-bottom:4px">Répartition des notes</h3>
            <p class="muted" style="font-size:14px;font-weight:600;margin-bottom:18px">Sur {{ data()!.total_avis }} avis publiés</p>
            <div class="rating-bars">
              @for (row of ratingRows(); track row.stars; let i = $index) {
                <div class="rbar-row">
                  <span class="rbar-label">{{ row.stars }} <app-icon name="starFill" style="color:var(--gold);font-size:14px" /></span>
                  <div class="rbar-track">
                    <div class="rbar-fill" [style.width.%]="show() ? row.barPct : 0"
                         [style.background]="row.color" [style.transitionDelay.ms]="i * 90"></div>
                  </div>
                  <span class="rbar-count">{{ row.count }}<span class="faint" style="font-weight:600;font-size:12px"> · {{ row.pct }}%</span></span>
                </div>
              }
            </div>
          </div>

          <!-- Évolution sur 12 mois -->
          <div class="card fade-up" style="animation-delay:180ms">
            <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px">
              <div>
                <h3 style="font-size:19px">Évolution sur 12 mois</h3>
                <p class="muted" style="font-size:14px;font-weight:600;margin-top:4px">Nombre d'avis reçus chaque mois</p>
              </div>
              <span class="pill pill-primary"><app-icon name="trend" /> +{{ yearTotal() }} avis sur l'année</span>
            </div>
            <div class="chart-wrap">
              <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="evo-chart" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.28" />
                    <stop offset="100%" stop-color="var(--primary)" stop-opacity="0" />
                  </linearGradient>
                </defs>
                @for (g of gridLines; track g) {
                  <line [attr.x1]="pad.l" [attr.x2]="W - pad.r" [attr.y1]="pad.t + innerH * g" [attr.y2]="pad.t + innerH * g" stroke="var(--border-soft)" stroke-width="1" />
                }
                <path [attr.d]="areaPath()" fill="url(#areaGrad)" [style.opacity]="draw() ? 1 : 0" style="transition:opacity .8s ease .5s" />
                <path #linePath [attr.d]="linePathD()" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                      [style.stroke-dasharray]="len()" [style.stroke-dashoffset]="draw() ? 0 : len()" style="transition:stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1)" />
                @for (p of points(); track $index) {
                  <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" fill="var(--surface)" stroke="var(--primary)" stroke-width="2.5"
                          [style.opacity]="draw() ? 1 : 0" [style.transition]="'opacity .3s ease ' + (0.6 + $index * 0.06) + 's'" />
                }
              </svg>
              <div class="evo-labels">
                @for (m of months(); track $index) { <span>{{ m }}</span> }
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class StatsComponent implements OnInit, AfterViewInit {
  ficheId = input.required<string>();
  private gmbService = inject(GmbService);

  @ViewChild('linePath') linePath?: ElementRef<SVGPathElement>;

  data = signal<AvisStats | null>(null);
  show = signal(false);
  draw = signal(false);
  len = signal(0);

  readonly W = 760;
  readonly H = 240;
  readonly pad = { l: 8, r: 8, t: 20, b: 28 };
  readonly innerW = this.W - 8 - 8;
  readonly innerH = this.H - 20 - 28;
  readonly gridLines = [0.25, 0.5, 0.75, 1];

  ngOnInit() {
    this.gmbService.getAvisStats(this.ficheId()).subscribe({
      next: (d) => {
        this.data.set(d);
        setTimeout(() => this.show.set(true), 200);
        // Recalcule la longueur du tracé une fois le path rendu.
        setTimeout(() => {
          const path = this.linePath?.nativeElement;
          if (path) this.len.set(path.getTotalLength());
          this.draw.set(true);
        }, 280);
      },
      error: (e) => console.error('Erreur chargement stats:', e),
    });
  }

  ngAfterViewInit() {
    const path = this.linePath?.nativeElement;
    if (path) this.len.set(path.getTotalLength());
  }

  private rep(s: number): number {
    const r = this.data()?.repartition || {};
    return r[String(s)] ?? 0;
  }

  happyCount = () => this.rep(4) + this.rep(5);
  happyPct = () => {
    const t = this.data()?.total_avis || 0;
    return t ? Math.round((this.happyCount() / t) * 100) : 0;
  };

  ratingRows = () => {
    const total = this.data()?.total_avis || 0;
    const counts = [5, 4, 3, 2, 1].map(s => ({ stars: s, count: this.rep(s) }));
    const max = Math.max(1, ...counts.map(c => c.count));
    return counts.map(c => ({
      ...c,
      pct: total ? Math.round((c.count / total) * 100) : 0,
      barPct: (c.count / max) * 100,
      color: c.stars >= 4 ? 'var(--score-high)' : c.stars === 3 ? 'var(--score-mid)' : 'var(--score-low)',
    }));
  };

  private evo = () => this.data()?.evolution_mensuelle ?? [];
  months = () => this.evo().map(e => e.mois);
  yearTotal = () => this.evo().reduce((s, e) => s + e.count, 0);

  points = (): Pt[] => {
    const data = this.evo();
    if (data.length === 0) return [];
    const maxR = Math.max(1, ...data.map(d => d.count));
    const n = Math.max(1, data.length - 1);
    return data.map((d, i) => ({
      x: this.pad.l + (i / n) * this.innerW,
      y: this.pad.t + this.innerH - (d.count / maxR) * this.innerH,
    }));
  };

  linePathD = (): string => {
    const pts = this.points();
    if (!pts.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  };

  areaPath = (): string => {
    const pts = this.points();
    if (!pts.length) return '';
    const base = this.pad.t + this.innerH;
    return `${this.linePathD()} L ${pts[pts.length - 1].x.toFixed(1)} ${base} L ${pts[0].x.toFixed(1)} ${base} Z`;
  };
}
