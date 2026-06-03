import { Component, OnInit, OnDestroy, inject, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GmbService, Notification } from '../../services/gmb.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="profile-wrap">
      <!-- Cloche + badge -->
      <button (click)="togglePanel()" class="icon-btn" style="font-size:22px" title="Notifications" aria-label="Notifications">
        <app-icon name="bell" />
        @if (unreadCount() > 0) { <span class="badge">{{ unreadCount() }}</span> }
      </button>

      <!-- Panneau -->
      @if (panelOpen()) {
        <div class="profile-menu pop-in" style="width:340px">
          <div class="row" style="justify-content:space-between;padding:10px 12px 12px">
            <h3 style="font-size:15.5px;font-family:var(--font-display);font-weight:800">Notifications</h3>
            @if (unreadCount() > 0) {
              <button class="pm-plan-link" style="background:var(--primary-soft);color:var(--primary-deep)" (click)="markAllAsRead($event)">Tout marquer comme lu</button>
            }
          </div>
          <div class="pm-sep"></div>
          <div style="max-height:60vh;overflow-y:auto">
            @if (notifications().length === 0) {
              <p class="muted center" style="padding:22px 12px;font-size:14px;font-weight:600">Aucune notification 🌿</p>
            }
            @for (notif of notifications(); track notif.id) {
              <button class="pm-item" (click)="handleNotifClick(notif)" style="align-items:flex-start"
                      [style.background]="!notif.lu ? 'var(--primary-tint)' : 'transparent'">
                <span class="pm-ic"><app-icon name="bell" /></span>
                <div class="grow">
                  <div class="pm-item-t" style="white-space:normal;line-height:1.4">{{ notif.message }}</div>
                  <div class="pm-item-s">{{ formatDate(notif.created_at) }}</div>
                </div>
                @if (!notif.lu) {
                  <span (click)="markAsRead(notif, $event)" style="font-size:12px;font-weight:800;color:var(--primary-deep)">Lire</span>
                }
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private gmbService = inject(GmbService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  notifications = signal<Notification[]>([]);
  panelOpen = signal(false);
  unreadCount = () => this.notifications().filter(n => !n.lu).length;

  private pollInterval: any;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.panelOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.panelOpen.set(false);
    }
  }

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

  markAsRead(notif: Notification, event?: Event) {
    event?.stopPropagation();
    if (notif.lu) return;
    // Mise à jour optimiste : la notif reste affichée mais passe en « lu »
    // (fond clair) et le badge décrémente aussitôt. Pas de refetch car
    // l'endpoint ne renvoie que les non-lues → la notif disparaîtrait.
    this.notifications.update(list =>
      list.map(n => n.id === notif.id ? { ...n, lu: true } : n)
    );
    this.gmbService.markNotificationAsRead(notif.id).subscribe({
      error: (err) => {
        console.error('Erreur marking notification as read:', err);
        // Rollback en cas d'échec serveur
        this.notifications.update(list =>
          list.map(n => n.id === notif.id ? { ...n, lu: false } : n)
        );
      }
    });
  }

  markAllAsRead(event: Event) {
    event.stopPropagation();
    const previous = this.notifications();
    this.notifications.update(list => list.map(n => ({ ...n, lu: true })));
    this.gmbService.markAllNotificationsAsRead().subscribe({
      error: (err) => {
        console.error('Erreur marking all as read:', err);
        this.notifications.set(previous);
      }
    });
  }

  handleNotifClick(notif: Notification) {
    this.markAsRead(notif);
    if (notif.fiche_id) {
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
