import { Component, Input, OnChanges, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Nombre animé qui compte de 0 jusqu'à `value`. */
@Component({
  selector: 'app-count-up',
  standalone: true,
  imports: [CommonModule],
  template: `<span>{{ display() }}{{ suffix }}</span>`,
})
export class CountUpComponent implements OnChanges, OnDestroy {
  @Input() value = 0;
  @Input() duration = 1100;
  @Input() decimals = 0;
  @Input() suffix = '';

  private n = signal(0);
  private raf = 0;
  private fb: any = null;

  display = () => this.n().toFixed(this.decimals);

  ngOnChanges() {
    this.cancel();
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / this.duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.n.set(this.value * eased + from * (1 - eased));
      if (t < 1) this.raf = requestAnimationFrame(tick);
      else this.n.set(this.value);
    };
    this.raf = requestAnimationFrame(tick);
    // Filet de sécurité si rAF est gelé (onglet en arrière-plan).
    this.fb = setTimeout(() => this.n.set(this.value), this.duration + 400);
  }

  ngOnDestroy() { this.cancel(); }

  private cancel() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.fb) clearTimeout(this.fb);
  }
}
