import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GmbService } from '../../services/gmb.service';
import { NotificationsComponent } from '../notifications/notifications.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationsComponent],
  template: `
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <h1 [routerLink]="['/dashboard']" class="text-3xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition">
              GMB Manager
            </h1>
          </div>

          <div class="flex items-center gap-4">
            <!-- Notifications -->
            <app-notifications />

            <!-- Delete account -->
            <button
              (click)="showDeleteModal.set(true)"
              class="text-sm text-gray-500 hover:text-red-600 transition"
            >
              Supprimer mon compte
            </button>

            <!-- Logout Button -->
            <button
              (click)="logout()"
              class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Delete account confirmation modal -->
    <div
      *ngIf="showDeleteModal()"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-2">Supprimer votre compte ?</h2>
        <p class="text-gray-600 text-sm mb-4">
          Cette action est <strong>définitive</strong>. Toutes vos données (fiches, avis,
          publications, photos) seront effacées et l'accès de GMB Manager à votre compte
          Google sera révoqué. Cette opération est irréversible.
        </p>

        <p *ngIf="deleteError()" class="text-red-600 text-sm mb-3">{{ deleteError() }}</p>

        <div class="flex justify-end gap-3">
          <button
            (click)="showDeleteModal.set(false)"
            [disabled]="isDeleting()"
            class="px-4 py-2 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            (click)="confirmDelete()"
            [disabled]="isDeleting()"
            class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50"
          >
            {{ isDeleting() ? 'Suppression…' : 'Supprimer définitivement' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private gmbService = inject(GmbService);
  private router = inject(Router);

  showDeleteModal = signal(false);
  isDeleting = signal(false);
  deleteError = signal<string | null>(null);

  logout() {
    this.gmbService.clearCache();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  confirmDelete() {
    this.isDeleting.set(true);
    this.deleteError.set(null);
    this.authService.deleteAccount().subscribe({
      next: () => {
        this.gmbService.clearCache();
        this.authService.logout();
        this.router.navigate(['/']);
      },
      error: () => {
        this.isDeleting.set(false);
        this.deleteError.set('La suppression a échoué. Réessayez ou contactez le support.');
      }
    });
  }
}
