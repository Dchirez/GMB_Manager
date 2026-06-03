import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <main class="login-main">
      <div class="login-card fade-up">
        <img class="login-logo" src="assets/logo.png" alt="GMB Manager" />
        <h1 style="font-size:26px;margin-bottom:8px">Content de vous revoir 👋</h1>
        <p class="muted" style="font-size:15px;font-weight:600;margin-bottom:26px">
          Connectez-vous pour piloter vos fiches Google en toute simplicité. 🌿
        </p>

        <button class="btn btn-primary btn-lg btn-block" [disabled]="isLoading" (click)="loginWithGoogle()">
          @if (!isLoading) { <app-icon name="google" /> Se connecter avec Google }
          @else { <span class="spinner"></span> Redirection en cours… }
        </button>

        <div class="login-or"><span>OU</span></div>

        <button class="btn btn-ghost btn-block" (click)="loginWithGoogle()">
          <app-icon name="globe" /> Continuer avec un e-mail
        </button>

        <p class="login-foot faint">
          <app-icon name="check" style="color:var(--primary)" /> Vous serez redirigé vers Google pour vous authentifier
        </p>
      </div>
    </main>
  `,
})
export class LoginComponent implements OnInit {
  isLoading = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      window.location.href = '/dashboard';
    }
  }

  loginWithGoogle(): void {
    this.isLoading = true;
    // Navigation top-level pour que le cookie OAuth state soit posé first-party.
    window.location.href = this.authService.getLoginUrl();
  }
}
