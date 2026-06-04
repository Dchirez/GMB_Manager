import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

// SECURITY FIX [CWE-613]: re-valide l'expiration côté client (comme authGuard).
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

// Garde commune : exige un token valide, sinon -> /login.
// Le contrôle de rôle ci-dessous n'est qu'une commodité UX ; le backend reste
// la seule autorité d'autorisation (endpoints /api/admin/* protégés serveur-side).
function requireAuthOr(router: Router, auth: AuthService): boolean {
  const token = auth.getToken();
  if (!token || isJwtExpired(token)) {
    auth.logout();
    router.navigate(['/login']);
    return false;
  }
  return true;
}

// Réservé à l'admin : un client est renvoyé vers son espace.
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (!requireAuthOr(router, auth)) return false;
  if (auth.getRole() !== 'admin') {
    router.navigate(['/mon-commerce']);
    return false;
  }
  return true;
};

// Réservé au client : un admin est renvoyé vers son dashboard.
export const clientGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (!requireAuthOr(router, auth)) return false;
  if (auth.getRole() === 'admin') {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
