import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <!-- Header -->
      <header class="w-full px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span class="text-2xl font-bold text-gray-800">GMB Manager</span>
        <button
          (click)="login()"
          class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          Se connecter
        </button>
      </header>

      <!-- Hero -->
      <main class="flex-1 max-w-6xl mx-auto px-6 w-full">
        <section class="text-center py-16">
          <h1 class="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Gérez et optimisez vos fiches Google My Business
          </h1>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            GMB Manager aide les commerces locaux à piloter leur présence sur Google :
            score de complétude de la fiche, suivi et réponses aux avis clients,
            création de publications et statistiques — le tout depuis un seul tableau de bord.
          </p>
          <button
            (click)="login()"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition inline-flex items-center gap-2"
          >
            🔑 Se connecter avec Google
          </button>
          <p class="text-gray-500 text-sm mt-4">
            La connexion via Google permet d'accéder à vos fiches Google Business Profile.
          </p>
        </section>

        <!-- Features -->
        <section class="grid grid-cols-1 md:grid-cols-3 gap-6 pb-16">
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="font-semibold text-gray-800 mb-2">📊 Score de complétude</h3>
            <p class="text-gray-600 text-sm">
              Évaluez en un coup d'œil la qualité de chaque fiche (sur 100) et identifiez
              les informations manquantes à compléter.
            </p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="font-semibold text-gray-800 mb-2">⭐ Gestion des avis</h3>
            <p class="text-gray-600 text-sm">
              Consultez vos avis clients, suivez la note moyenne et répondez directement
              depuis l'application.
            </p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="font-semibold text-gray-800 mb-2">📣 Publications</h3>
            <p class="text-gray-600 text-sm">
              Créez des publications avec photos pour animer votre fiche et informer
              vos clients des nouveautés.
            </p>
          </div>
        </section>
      </main>

      <!-- Footer -->
      <footer class="border-t border-gray-200 bg-white/60">
        <div class="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
          <span>© {{ year }} GMB Manager</span>
          <div class="flex items-center gap-4">
            <a routerLink="/confidentialite" class="hover:text-blue-600">Politique de confidentialité</a>
            <a href="mailto:dchirez59&#64;gmail.com" class="hover:text-blue-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  `
})
export class HomeComponent {
  year = new Date().getFullYear();

  constructor(private authService: AuthService) {}

  login(): void {
    window.location.href = this.authService.getLoginUrl();
  }
}
