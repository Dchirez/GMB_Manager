import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { IconComponent } from './shared/icon.component';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';

interface ConfettiBit { left: number; delay: number; dur: number; col: string; rot: number; size: number; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, IconComponent],
  template: `
    <div class="app">
      <!-- Navbar uniquement sur les pages connectées -->
      @if (showNavbar()) { <app-navbar /> }
      <router-outlet></router-outlet>
    </div>

    <!-- Toast global -->
    @if (toast.message(); as msg) {
      <div class="toast-wrap">
        <div class="toast">
          <span class="toast-icon"><app-icon name="check" /></span>
          {{ msg }}
        </div>
      </div>
    }

    <!-- Confettis 🎉 -->
    @if (toast.confetti()) {
      <div class="confetti-wrap">
        @for (b of confettiBits; track $index) {
          <span class="confetti" [style.left.%]="b.left" [style.background]="b.col"
                [style.animationDelay.s]="b.delay" [style.animationDuration.s]="b.dur"
                [style.width.px]="b.size" [style.height.px]="b.size * 1.4"
                [style.transform]="'rotate(' + b.rot + 'deg)'"></span>
        }
      </div>
    }
  `,
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  // Instancié dès le démarrage pour appliquer le thème enregistré.
  private theme = inject(ThemeService);
  toast = inject(ToastService);

  showNavbar = signal(false);

  readonly confettiBits: ConfettiBit[] = (() => {
    const cols = ['var(--primary)', 'var(--accent)', 'var(--tertiary)', 'var(--gold)'];
    return Array.from({ length: 70 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.6 + Math.random() * 1.4,
      col: cols[i % cols.length],
      rot: Math.random() * 360,
      size: 7 + Math.random() * 7,
    }));
  })();

  ngOnInit() {
    this.router.events.subscribe(() => {
      const url = this.router.url.split('?')[0].split('#')[0];
      const isPublic =
        url === '/' ||
        url === '' ||
        url.startsWith('/confidentialite') ||
        url.includes('/login') ||
        url.includes('/auth');
      this.showNavbar.set(!isPublic);
    });
  }
}
