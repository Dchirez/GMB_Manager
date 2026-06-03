import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/icon.component';
import { ThemeService, PALETTES, FONTS, DENSITIES } from '../../services/theme.service';

/** Fenêtre Paramètres d'affichage — couleur, police, espacement (en direct). */
@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div class="row" style="gap:13px">
            <span class="modal-ic"><app-icon name="edit" /></span>
            <div>
              <h2 style="font-size:21px">Paramètres d'affichage</h2>
              <p class="muted" style="font-size:14px;font-weight:600;margin-top:2px">Personnalisez l'ambiance — vos choix sont enregistrés.</p>
            </div>
          </div>
          <button class="modal-close" (click)="close.emit()" title="Fermer"><app-icon name="close" /></button>
        </div>

        <div class="modal-body">
          <div class="appear">
            <div>
              <div class="appear-label"><app-icon name="sparkle" style="color:var(--accent)" /> Couleur de l'interface</div>
              <div class="palette-grid big">
                @for (p of palettes; track p.id) {
                  <button class="palette-opt" [class.on]="theme.theme() === p.id" (click)="theme.setTheme(p.id)">
                    <span class="palette-dots">
                      @for (d of p.dots; track $index) {
                        <span [style.background]="d" [style.marginLeft.px]="$index ? -5 : 0" [style.borderColor]="p.bg"></span>
                      }
                    </span>
                    <span>{{ p.name }}</span>
                    @if (theme.theme() === p.id) { <span class="palette-check"><app-icon name="check" /></span> }
                  </button>
                }
              </div>
            </div>

            <div>
              <div class="appear-label"><app-icon name="text" style="color:var(--primary)" /> Police de caractères</div>
              <div class="font-grid">
                @for (f of fonts; track f.id) {
                  <button class="font-opt" [class.on]="theme.font() === f.id" (click)="theme.setFont(f.id)">
                    <span class="font-aa" [style.fontFamily]="f.css">Aa</span>
                    <span class="font-name">{{ f.name }}</span>
                    <span class="font-note">{{ f.note }}</span>
                  </button>
                }
              </div>
            </div>

            <div>
              <div class="appear-label"><app-icon name="grid" style="color:var(--tertiary)" /> Espacement</div>
              <div class="seg">
                @for (d of densities; track d.id) {
                  <button class="seg-opt" [class.on]="theme.density() === d.id" (click)="theme.setDensity(d.id)">{{ d.name }}</button>
                }
              </div>
            </div>
          </div>
        </div>

        <div class="modal-foot">
          <button class="btn btn-primary" (click)="close.emit()"><app-icon name="check" /> C'est parfait</button>
        </div>
      </div>
    </div>
  `,
})
export class SettingsModalComponent {
  @Output() close = new EventEmitter<void>();
  palettes = PALETTES;
  fonts = FONTS;
  densities = DENSITIES;
  constructor(public theme: ThemeService) {}

  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }
}
