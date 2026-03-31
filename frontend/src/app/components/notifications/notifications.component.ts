import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GmbService, Notification } from '../../services/gmb.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Bell icon with badge -->
      <button
        (click)="togglePanel()"
        class="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
        aria-label="Notifications"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          ></path>
        </svg>

        <!-- Badge -->
        <span
          *ngIf="unreadCount() > 0"
          class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full"
        >
          {{ unreadCount() }}
        </span>
      </button>

      <!-- Dropdown panel -->
      <div
        *ngIf="panelOpen()"
        class="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50"
      >
        <div class="p-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="font-semibold text-gray-900">Notifications</h3>
            <button
              *ngIf="unreadCount() > 0"
              (click)="markAllAsRead()"
              class="text-sm text-indigo-600 hover:text-indigo-700"
            >
              Tout marquer comme lu
            </button>
          </div>
        </div>

        <!-- Notifications list -->
        <div class="max-h-96 overflow-y-auto">
          <div *ngIf="notifications().length === 0" class="p-4 text-center text-gray-500">
            Aucune notification
          </div>

          <div
            *ngFor="let notif of notifications()"
            (click)="handleNotifClick(notif)"
            class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
            [ngClass]="{ 'bg-blue-50': !notif.lu }"
          >
            <div class="flex justify-between items-start gap-2">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">{{ notif.message }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ formatDate(notif.created_at) }}</p>
              </div>
              <button
                (click)="markAsRead(notif, $event)"
                *ngIf="!notif.lu"
                class="text-xs text-indigo-600 hover:text-indigo-700"
              >
                Lire
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private gmbService = inject(GmbService);
  private router = inject(Router);

  notifications = signal<Notification[]>([]);
  panelOpen = signal(false);
  unreadCount = () => this.notifications().filter(n => !n.lu).length;

  private pollInterval: any;

  ngOnInit() {
    this.loadNotifications();
    // Poll every 60 seconds
    this.pollInterval = setInterval(() => this.loadNotifications(), 60000);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  private loadNotifications() {
    this.gmbService.getNotifications().subscribe({
      next: (notifs) => {
        this.notifications.set(notifs);
      },
      error: (err) => {
        console.error('Erreur loading notifications:', err);
      }
    });
  }

  togglePanel() {
    this.panelOpen.update(v => !v);
  }

  markAsRead(notif: Notification, event: Event) {
    event.stopPropagation();
    this.gmbService.markNotificationAsRead(notif.id).subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => {
        console.error('Erreur marking notification as read:', err);
      }
    });
  }

  markAllAsRead() {
    this.gmbService.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => {
        console.error('Erreur marking all as read:', err);
      }
    });
  }

  handleNotifClick(notif: Notification) {
    if (notif.fiche_id) {
      this.markAsRead(notif, new Event('click'));
      this.router.navigate(['/fiche', notif.fiche_id]);
      this.panelOpen.set(false);
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;

    return date.toLocaleDateString('fr-FR');
  }
}
