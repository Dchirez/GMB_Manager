import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-800 mb-2">GMB Manager</h1>
          <p class="text-gray-600">Gérez vos fiches Google My Business</p>
        </div>

        <button
          (click)="loginWithGoogle()"
          [disabled]="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
        >
          <span *ngIf="!isLoading">🔑 Se connecter avec Google</span>
          <span *ngIf="isLoading">Redirection en cours...</span>
        </button>

        <p class="text-gray-500 text-sm text-center mt-6">
          Vous serez redirigé vers Google pour vous authentifier
        </p>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  isLoading = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Rediriger vers le dashboard si déjà connecté
    if (this.authService.isAuthenticated()) {
      window.location.href = '/dashboard';
    }
  }

  loginWithGoogle(): void {
    this.isLoading = true;
    this.authService.getGoogleAuthUrl().subscribe({
      next: (response) => {
        window.location.href = response.auth_url;
      },
      error: (error) => {
        console.error('Erreur lors de la connexion:', error);
        this.isLoading = false;
        alert('Erreur lors de la connexion. Veuillez réessayer.');
      }
    });
  }
}
