import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

/** Affichage 5 étoiles (pleines/vides) selon une note. */
@Component({
  selector: 'app-stars',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <span [style.display]="'inline-flex'" [style.gap.px]="gap" style="color:var(--gold)">
      @for (i of [1,2,3,4,5]; track i) {
        <span [style.fontSize.px]="size" style="line-height:1"
              [style.color]="i <= rounded ? 'var(--gold)' : 'var(--border)'">
          <app-icon name="starFill" />
        </span>
      }
    </span>
  `,
})
export class StarsComponent {
  @Input() value = 0;
  @Input() size = 16;
  @Input() gap = 2;

  get rounded() { return Math.round(this.value); }
}
