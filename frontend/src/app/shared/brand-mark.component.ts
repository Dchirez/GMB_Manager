import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { CardBrand } from './card.util';

/** Marque de carte affichée dans le champ numéro (Visa / Mastercard / Amex). */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @switch (brand) {
      @case ('mastercard') {
        <span class="brand-mark" title="Mastercard">
          <span style="background:#E0775E"></span>
          <span style="background:var(--gold);margin-left:-7px;mix-blend-mode:multiply"></span>
        </span>
      }
      @case ('visa') { <span class="brand-txt" style="color:#2A6FDB">VISA</span> }
      @case ('amex') { <span class="brand-txt" style="color:#4E9B7E">AMEX</span> }
      @default { <app-icon name="globe" style="color:var(--ink-faint);font-size:20px" /> }
    }
  `,
})
export class BrandMarkComponent {
  @Input() brand: CardBrand = null;
}
