import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Show navbar only if logged in (not on login page) -->
      <app-navbar *ngIf="showNavbar()" />
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  showNavbar = signal(true);

  ngOnInit() {
    this.router.events.subscribe(() => {
      // Hide navbar on login and auth/callback pages
      const url = this.router.url;
      this.showNavbar.set(!url.includes('/login') && !url.includes('/auth'));
    });
  }
}
