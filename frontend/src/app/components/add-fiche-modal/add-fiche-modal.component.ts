import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { Fiche } from '../../services/gmb.service';
import { scoreColor } from '../../shared/score.util';
import { CATEGORIES } from '../../shared/category.util';

/** Modale de création d'une fiche / commerce. */
@Component({
  selector: 'app-add-fiche-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal modal-wide" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div class="row" style="gap:13px">
            <span class="modal-ic"><app-icon name="plus" /></span>
            <div>
              <h2 style="font-size:21px">Ajouter un commerce</h2>
              <p class="muted" style="font-size:14px;font-weight:600;margin-top:2px">Connectez une nouvelle fiche Google. Vous pourrez tout compléter ensuite.</p>
            </div>
          </div>
          <button class="modal-close" (click)="onClose()"><app-icon name="close" /></button>
        </div>

        <div class="modal-body">
          <div class="af-section">
            <div class="appear-label"><app-icon name="grid" style="color:var(--primary)" /> Type de commerce</div>
            <div class="cat-grid">
              @for (c of categories; track c.id) {
                <button class="cat-opt" [class.on]="cat === c.id" (click)="cat = c.id">
                  <span class="cat-emoji">{{ c.emoji }}</span>
                  <span class="cat-name">{{ c.id }}</span>
                </button>
              }
            </div>
          </div>

          <div class="af-section">
            <div class="appear-label"><app-icon name="info" style="color:var(--accent)" /> Informations</div>
            <div class="af-grid">
              <div class="field af-full">
                <label class="field-label"><app-icon name="text" style="color:var(--ink-faint);font-size:17px" /> Nom de l'établissement</label>
                <input class="input" [class.filled]="!!name" [(ngModel)]="name" placeholder="Ex : Boulangerie Martin" />
              </div>
              <div class="field">
                <label class="field-label"><app-icon name="pin" style="color:var(--ink-faint);font-size:17px" /> Adresse</label>
                <input class="input" [class.filled]="!!address" [(ngModel)]="address" placeholder="Numéro, rue, ville" />
              </div>
              <div class="field">
                <label class="field-label"><app-icon name="phone" style="color:var(--ink-faint);font-size:17px" /> Téléphone</label>
                <input class="input" [class.filled]="!!phone" [(ngModel)]="phone" placeholder="03 21 00 00 00" />
              </div>
              <div class="field">
                <label class="field-label"><app-icon name="globe" style="color:var(--ink-faint);font-size:17px" /> Site web</label>
                <input class="input" [class.filled]="!!website" [(ngModel)]="website" placeholder="votresite.fr (optionnel)" />
              </div>
              <div class="field">
                <label class="field-label"><app-icon name="clock" style="color:var(--ink-faint);font-size:17px" /> Horaires</label>
                <input class="input" [class.filled]="!!hours" [(ngModel)]="hours" placeholder="Ex : Lun-Sam 9h-19h" />
              </div>
              <div class="field af-full">
                <label class="field-label"><app-icon name="text" style="color:var(--ink-faint);font-size:17px" /> Description</label>
                <textarea class="textarea" [class.filled]="!!description" style="min-height:90px" [(ngModel)]="description" placeholder="Présentez votre commerce en quelques mots chaleureux…"></textarea>
              </div>
            </div>
          </div>

          <div class="af-foot-note">
            <div class="row" style="gap:10px">
              <div class="complete-ring af-ring" [style.--p]="score()" [style.--c]="ringColor()"><span>{{ score() }}<small>%</small></span></div>
              <div>
                <div style="font-weight:800;font-size:14px">Complétude à la création</div>
                <div class="faint" style="font-size:12.5px;font-weight:600">Vous pourrez enrichir la fiche à tout moment.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-foot">
          <button class="btn btn-quiet" (click)="onClose()">Annuler</button>
          <button class="btn btn-primary" [class.pay-btn]="!ready()" [class.disabled]="!ready()" (click)="create()"><app-icon name="check" /> Créer la fiche</button>
        </div>
      </div>
    </div>
  `,
})
export class AddFicheModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<Fiche>();

  categories = CATEGORIES;
  cat = '';
  name = ''; address = ''; phone = ''; website = ''; hours = ''; description = '';

  private tracked() { return [this.name, this.phone, this.address, this.website, this.hours, this.description]; }
  score() { return Math.round((this.tracked().filter(v => v.trim()).length / 6) * 100); }
  ringColor() { return scoreColor(this.score()); }
  ready() { return !!this.name.trim() && !!this.cat; }

  onClose() { this.close.emit(); }

  create() {
    if (!this.ready()) return;
    const fiche: Fiche = {
      id: 'local-' + Date.now(),
      nom: this.name.trim(),
      categorie: this.cat,
      adresse: this.address.trim(),
      telephone: this.phone.trim(),
      site_web: this.website.trim(),
      horaires: this.hours.trim(),
      description: this.description.trim(),
      score: this.score(),
    };
    this.created.emit(fiche);
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }
}
