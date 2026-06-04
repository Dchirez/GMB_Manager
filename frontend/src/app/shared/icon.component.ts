import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Jeu d'icônes (stroke cohérent) porté du prototype Design.
 * Usage : <app-icon name="pin" /> — la taille suit la font-size (1em),
 * la couleur suit `color` (currentColor).
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" [style.width.em]="1" [style.height.em]="1"
         style="flex-shrink:0;display:inline-block;vertical-align:-0.125em"
         [attr.aria-hidden]="true">
      @switch (name) {
        @case ('pin') {
          <path [attr.fill]="'none'" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/>
          <circle fill="none" [attr.stroke]="cur" stroke-width="1.9" cx="12" cy="10" r="2.6"/>
        }
        @case ('phone') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M6.5 4h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6L16 17l4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3 7.6 1.5 1.5 0 0 1 4.5 6Z"/>
        }
        @case ('star') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 4l2.3 4.8 5.2.7-3.8 3.6.9 5.1L12 15.8 7.4 18.2l.9-5.1L4.5 9.5l5.2-.7Z"/>
        }
        @case ('starFill') {
          <path [attr.fill]="cur" [attr.stroke]="cur" stroke-width="1.2" stroke-linejoin="round" d="M12 4l2.3 4.8 5.2.7-3.8 3.6.9 5.1L12 15.8 7.4 18.2l.9-5.1L4.5 9.5l5.2-.7Z"/>
        }
        @case ('camera') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M4 8.5h3l1.5-2h7L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z"/>
          <circle fill="none" [attr.stroke]="cur" stroke-width="1.9" cx="12" cy="13.5" r="3.3"/>
        }
        @case ('plus') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
        }
        @case ('bell') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 1.5 6.5h-15S6 14 6 9Z"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M10 19a2 2 0 0 0 4 0"/>
        }
        @case ('chart') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M5 19V5M5 19h14"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M8 16v-3M12 16V9M16 16v-6"/>
        }
        @case ('info') {
          <circle fill="none" [attr.stroke]="cur" stroke-width="1.9" cx="12" cy="12" r="8.5"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 11v5M12 8h.01"/>
        }
        @case ('globe') {
          <circle fill="none" [attr.stroke]="cur" stroke-width="1.9" cx="12" cy="12" r="8.5"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17"/>
        }
        @case ('clock') {
          <circle fill="none" [attr.stroke]="cur" stroke-width="1.9" cx="12" cy="12" r="8.5"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 7.5V12l3 2"/>
        }
        @case ('text') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M5 6h14M5 12h14M5 18h9"/>
        }
        @case ('check') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7"/>
        }
        @case ('arrowRight') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/>
        }
        @case ('arrowLeft') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M11 18l-6-6 6-6"/>
        }
        @case ('sparkle') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6ZM18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/>
        }
        @case ('heart') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 20s-7-4.6-7-9.4A3.6 3.6 0 0 1 12 7a3.6 3.6 0 0 1 7 3.6C19 15.4 12 20 12 20Z"/>
        }
        @case ('reply') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M9 7L4 12l5 5M4 12h9a6 6 0 0 1 6 6v1"/>
        }
        @case ('trend') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M4 16l5-5 3 3 7-7M16 7h4v4"/>
        }
        @case ('image') {
          <rect fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" x="3.5" y="5" width="17" height="14" rx="2.5"/>
          <circle fill="none" [attr.stroke]="cur" stroke-width="1.9" cx="8.5" cy="10" r="1.6"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M5 17l4.5-4 3 2.5L16 12l4 4.5"/>
        }
        @case ('upload') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 16V5M8 9l4-4 4 4"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M5 16v2a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18v-2"/>
        }
        @case ('edit') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M5 19h3l9-9-3-3-9 9v3ZM14 7l3 3"/>
        }
        @case ('grid') {
          <rect fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" x="4" y="4" width="7" height="7" rx="1.8"/>
          <rect fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" x="13" y="4" width="7" height="7" rx="1.8"/>
          <rect fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" x="4" y="13" width="7" height="7" rx="1.8"/>
          <rect fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" x="13" y="13" width="7" height="7" rx="1.8"/>
        }
        @case ('logout') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-7A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h7a1.5 1.5 0 0 0 1.5-1.5V17"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M9 12h11M16 8l4 4-4 4"/>
        }
        @case ('google') {
          <path [attr.fill]="cur" d="M21 12.2c0-.7-.06-1.2-.18-1.8H12v3.4h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1C19.9 17.4 21 15 21 12.2Z M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.4c-.8.6-1.9.9-2.9.9-2.3 0-4.2-1.5-4.9-3.6H3.9v2.5A9 9 0 0 0 12 21Z M7.1 13.7a5.4 5.4 0 0 1 0-3.4V7.8H3.9a9 9 0 0 0 0 8.4Z M12 6.6c1.3 0 2.4.45 3.3 1.3l2.5-2.5A9 9 0 0 0 3.9 7.8l3.2 2.5C7.8 8.1 9.7 6.6 12 6.6Z"/>
        }
        @case ('map') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M9 4v14M15 6v14"/>
        }
        @case ('handHeart') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M3 14l3.5-1.2a3 3 0 0 1 2 0L11 14l5-2c1.3-.4 2.2 1.2 1.2 2.1L12 19l-4 1-5-2v-4Z"/>
        }
        @case ('close') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6 6 18"/>
        }
        @case ('caret') {
          <path fill="none" [attr.stroke]="cur" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
        }
        @case ('message') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16H9l-4 3.5V6.5A1.5 1.5 0 0 1 5 5Z"/>
        }
        @case ('send') {
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M21 4L3 11l6.5 2.5L12 20l3-6 6-10Z"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M9.5 13.5 21 4"/>
        }
        @case ('user') {
          <circle fill="none" [attr.stroke]="cur" stroke-width="1.9" cx="12" cy="8" r="3.6"/>
          <path fill="none" [attr.stroke]="cur" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M5 20a7 7 0 0 1 14 0"/>
        }
      }
    </svg>
  `,
})
export class IconComponent {
  @Input() name = '';
  readonly cur = 'currentColor';
}
