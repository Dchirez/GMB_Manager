import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
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
  `,
  styles: []
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
