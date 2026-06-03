import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { scoreColor, scoreLabel } from './score.util';

/** Barre de score animée /100 avec label de qualité. */
@Component({
  selector: 'app-score-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <span style="font-weight:700;font-size:13.5px;color:var(--ink-soft);display:flex;align-items:center;gap:7px">
          @if (showLabel) {
            <span [style.color]="color" style="font-size:16px">●</span>{{ label }}
          }
        </span>
        <span style="font-family:var(--font-display);font-weight:800;font-size:16px" [style.color]="color">
          {{ score }}<span style="color:var(--ink-faint);font-weight:700;font-size:13px">/100</span>
        </span>
      </div>
      <div class="scorebar-track">
        <div class="scorebar-fill" [style.width.%]="w()"
             [style.background]="'linear-gradient(90deg, ' + color + ', color-mix(in srgb, ' + color + ' 70%, white))'"></div>
      </div>
    </div>
  `,
})
export class ScoreBarComponent implements OnInit {
  @Input() score = 0;
  @Input() animate = true;
  @Input() showLabel = true;

  w = signal(0);

  get color() { return scoreColor(this.score); }
  get label() { return scoreLabel(this.score); }

  ngOnInit() {
    if (!this.animate) { this.w.set(this.score); return; }
    setTimeout(() => this.w.set(this.score), 120);
  }
}
