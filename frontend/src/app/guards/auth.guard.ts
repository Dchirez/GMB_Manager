import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

// SECURITY FIX [CWE-613]: validate token expiry client-side, not just presence.
function isJwtExpired(token: string): boolean {
  try {
    const [, payload] = token.split('.');
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (!decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const token = auth.getToken();
  if (token && !isJwtExpired(token)) {
    return true;
  }

  // Token missing or expired — clear and redirect
  auth.logout();
  router.navigate(['/login']);
  return false;
};
