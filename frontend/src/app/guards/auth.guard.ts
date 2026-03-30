import { Injectable } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = new (class {
    constructor(
      private auth: AuthService,
      private router: Router
    ) {}

    canActivate(): boolean {
      if (this.auth.isAuthenticated()) {
        return true;
      }
      this.router.navigate(['/login']);
      return false;
    }
  })(new AuthService(null as any), new Router());

  // Simple implementation
  const isAuthenticated = localStorage.getItem('auth_token');
  if (isAuthenticated) {
    return true;
  }

  const router = new Router();
  router.navigate(['/login']);
  return false;
};
