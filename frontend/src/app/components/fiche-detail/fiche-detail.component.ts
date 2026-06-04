import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GmbService, Fiche } from '../../services/gmb.service';
import { ToastService } from '../../services/toast.service';
import { StatsComponent } from '../stats/stats.component';
import { PhotosComponent } from '../photos/photos.component';
import { AvisComponent } from '../avis/avis.component';
import { PublicationsComponent } from '../publications/publications.component';
import { IconComponent } from '../../shared/icon.component';
import { scoreColor } from '../../shared/score.util';


type Tab = 'infos' | 'photos' | 'avis' | 'stats' | 'publications';

@Component({
  selector: 'app-fiche-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IconComponent,
    StatsComponent, PhotosComponent, AvisComponent, PublicationsComponent,
  ],
  template: `
    <main class="container detail">
      @if (isLoading()) {
        <div class="center muted" style="padding:60px 0;font-weight:600">Chargement de la fiche…</div>
      } @else if (fiche(); as f) {
        <button class="btn btn-quiet back-btn fade-up" (click)="back()"><app-icon name="arrowLeft" /> Mes commerces</button>

        <div class="detail-head fade-up" style="animation-delay:40ms">
          <div class="grow">
            <h1 style="font-size:28px">{{ f.nom }}</h1>
            <div class="row" style="gap:12px;margin-top:8px;flex-wrap:wrap">
              @if (f.categorie) { <span class="pill pill-muted">{{ f.categorie }}</span> }
              @if (f.adresse) { <span class="row faint" style="gap:7px;font-size:14px;font-weight:600"><app-icon name="pin" /> {{ f.adresse }}</span> }
            </div>
          </div>
          @if (f.site_web) {
            <a class="btn btn-ghost btn-sm view-live" [href]="externalUrl(f.site_web)" target="_blank" rel="noopener"><app-icon name="globe" /> Voir le site</a>
          }
        </div>

        <div class="tabs-bar fade-up" style="animation-delay:80ms">
          <div class="tabs">
            @for (t of tabs; track t.id) {
              <button class="tab" [class.active]="tab() === t.id" (click)="tab.set(t.id)">
                <app-icon [name]="t.icon" /> {{ t.label }}
              </button>
            }
          </div>
        </div>

        <div class="detail-body">
          @switch (tab()) {
            @case ('infos') {
              <div class="form-wrap">
                <div class="card complete-card fade-up">
                  <div class="row" style="gap:16px;flex-wrap:wrap">
                    <div class="complete-ring" [style.--p]="liveScore()" [style.--c]="ringColor()">
                      <span>{{ liveScore() }}<small>%</small></span>
                    </div>
                    <div class="grow" style="min-width:200px">
                      <h3 style="font-size:19px;margin-bottom:4px">Complétude de la fiche</h3>
                      <p class="muted" style="font-size:14.5px;font-weight:600">{{ tip() }}</p>
                      <div class="complete-track">
                        <div class="complete-fill" [style.width.%]="liveScore()" [style.background]="ringColor()"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="card fade-up" style="animation-delay:60ms">
                  <div class="form-grid">
                    <div class="field">
                      <label class="field-label"><app-icon name="text" [style.color]="form.nom ? 'var(--primary)' : 'var(--ink-faint)'" style="font-size:17px" /> Nom de l'établissement
                        @if (form.nom) { <span class="field-done"><app-icon name="check" /></span> }
                      </label>
                      <input class="input" [class.filled]="!!form.nom" [(ngModel)]="form.nom" name="nom" placeholder="Ex : Boulangerie Martin" />
                    </div>
                    <div class="field">
                      <label class="field-label"><app-icon name="phone" [style.color]="form.telephone ? 'var(--primary)' : 'var(--ink-faint)'" style="font-size:17px" /> Téléphone
                        @if (form.telephone) { <span class="field-done"><app-icon name="check" /></span> }
                      </label>
                      <input class="input" [class.filled]="!!form.telephone" [(ngModel)]="form.telephone" name="telephone" placeholder="03 21 00 00 00" />
                    </div>
                    <div class="field full">
                      <label class="field-label"><app-icon name="pin" [style.color]="form.adresse ? 'var(--primary)' : 'var(--ink-faint)'" style="font-size:17px" /> Adresse
                        @if (form.adresse) { <span class="field-done"><app-icon name="check" /></span> }
                      </label>
                      <input class="input" [class.filled]="!!form.adresse" [(ngModel)]="form.adresse" name="adresse" placeholder="Numéro, rue, ville, code postal" />
                    </div>
                    <div class="field">
                      <label class="field-label"><app-icon name="globe" [style.color]="form.site_web ? 'var(--primary)' : 'var(--ink-faint)'" style="font-size:17px" /> Site web
                        @if (form.site_web) { <span class="field-done"><app-icon name="check" /></span> }
                      </label>
                      <input class="input" [class.filled]="!!form.site_web" [(ngModel)]="form.site_web" name="site_web" placeholder="votresite.fr" />
                      <span class="field-hint">Optionnel, mais ça rassure vos clients</span>
                    </div>
                    <div class="field">
                      <label class="field-label"><app-icon name="clock" [style.color]="form.horaires ? 'var(--primary)' : 'var(--ink-faint)'" style="font-size:17px" /> Horaires d'ouverture
                        @if (form.horaires) { <span class="field-done"><app-icon name="check" /></span> }
                      </label>
                      <input class="input" [class.filled]="!!form.horaires" [(ngModel)]="form.horaires" name="horaires" placeholder="Ex : Lun-Sam 9h-19h" />
                      <span class="field-hint">Le champ le plus consulté par vos clients !</span>
                    </div>
                    <div class="field full">
                      <label class="field-label"><app-icon name="text" [style.color]="form.description ? 'var(--primary)' : 'var(--ink-faint)'" style="font-size:17px" /> Description
                        @if (form.description) { <span class="field-done"><app-icon name="check" /></span> }
                      </label>
                      <textarea class="textarea" [class.filled]="!!form.description" [(ngModel)]="form.description" name="description"
                                placeholder="Parlez de votre histoire, vos spécialités, ce qui vous rend unique…"></textarea>
                      <span class="field-hint">Présentez votre commerce en quelques phrases chaleureuses.</span>
                    </div>
                  </div>

                  <div class="form-foot">
                    <span class="row faint" style="gap:8px;font-size:13.5px;font-weight:600">
                      <app-icon name="check" style="color:var(--primary)" /> Vos modifications sont enregistrées en sécurité
                    </span>
                    <button class="btn btn-ghost ticket-link foot-center" (click)="requestChange()">
                      <app-icon name="message" /> Demander une modification
                    </button>
                    <button class="btn btn-primary" [disabled]="isSaving()" (click)="save()">
                      <app-icon name="check" /> {{ isSaving() ? 'Enregistrement…' : 'Enregistrer les modifications' }}
                    </button>
                  </div>
                </div>
              </div>
            }
            @case ('photos')       { <app-photos [ficheId]="ficheId" /> }
            @case ('avis')         { <app-avis [ficheId]="ficheId" /> }
            @case ('stats')        { <app-stats [ficheId]="ficheId" /> }
            @case ('publications') { <app-publications [ficheId]="ficheId" /> }
          }
        </div>
      } @else {
        <div class="card center muted" style="padding:48px;font-weight:600">Fiche introuvable.</div>
      }
    </main>
  `,
})
export class FicheDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gmbService = inject(GmbService);
  private toast = inject(ToastService);

  fiche = signal<Fiche | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  tab = signal<Tab>('infos');
  ficheId = '';

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'infos', label: 'Informations', icon: 'info' },
    { id: 'photos', label: 'Photos', icon: 'camera' },
    { id: 'avis', label: 'Avis', icon: 'star' },
    { id: 'stats', label: 'Statistiques', icon: 'chart' },
    { id: 'publications', label: 'Publications', icon: 'edit' },
  ];

  form = { nom: '', telephone: '', adresse: '', site_web: '', horaires: '', description: '' };

  private fieldKeys: (keyof typeof this.form)[] = ['nom', 'telephone', 'adresse', 'site_web', 'horaires', 'description'];

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    if (t && this.tabs.some(x => x.id === t)) this.tab.set(t);
    this.route.params.subscribe((p) => { this.ficheId = p['id']; this.load(); });
  }

  load(): void {
    this.isLoading.set(true);
    this.gmbService.getFiche(this.ficheId).subscribe({
      next: (f) => {
        this.fiche.set(f);
        this.form = {
          nom: f.nom || '', telephone: f.telephone || '', adresse: f.adresse || '',
          site_web: f.site_web || '', horaires: f.horaires || '', description: f.description || '',
        };
        this.isLoading.set(false);
      },
      error: (e) => { console.error('Erreur chargement fiche:', e); this.isLoading.set(false); },
    });
  }



  // Complétude live calculée à partir du formulaire (recalcul à chaque CD).
  liveScore(): number {
    const filled = this.fieldKeys.filter(k => (this.form[k] || '').trim().length > 0).length;
    return Math.round((filled / this.fieldKeys.length) * 100);
  }
  ringColor() { return scoreColor(this.liveScore()); }

  tip(): string {
    const s = this.liveScore();
    if (s >= 100) return 'Parfait ! Votre fiche est complète et prête à briller ✨';
    if (s >= 66) return 'Superbe, vous y êtes presque. Plus que quelques détails 🌿';
    if (s >= 33) return 'Bon début ! Chaque champ rempli vous rend plus visible.';
    return 'Commençons doucement, remplissez ce qui vous vient.';
  }



  externalUrl(url: string): string {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  back() { this.router.navigate(['/dashboard']); }

  requestChange() { this.router.navigate(['/fiche', this.ficheId, 'demande']); }

  save(): void {
    const f = this.fiche();
    if (!f) return;
    this.isSaving.set(true);
    const beforeScore = this.liveScore();
    this.gmbService.updateFiche(this.ficheId, { ...this.form }).subscribe({
      next: (updated) => {
        this.fiche.set(updated);
        this.isSaving.set(false);
        this.toast.show('Modifications enregistrées avec succès 🎉', beforeScore >= 100);
      },
      error: (e) => {
        console.error('Erreur sauvegarde:', e);
        this.isSaving.set(false);
        this.toast.show('Erreur lors de la sauvegarde. Réessayez.');
      },
    });
  }
}
