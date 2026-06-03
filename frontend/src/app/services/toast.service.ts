import { Injectable, signal } from '@angular/core';

/** Petit service de feedback global : toast + confettis. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  message = signal<string | null>(null);
  confetti = signal(false);

  private timer: any = null;
  private confettiTimer: any = null;

  show(message: string, withConfetti = false) {
    this.message.set(message);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message.set(null), 2600);

    if (withConfetti) {
      this.confetti.set(true);
      if (this.confettiTimer) clearTimeout(this.confettiTimer);
      this.confettiTimer = setTimeout(() => this.confetti.set(false), 3200);
    }
  }
}
