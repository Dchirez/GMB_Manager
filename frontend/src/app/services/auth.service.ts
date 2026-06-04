import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Top-level navigation to /auth/login: the backend sets the session cookie
  // (carrying the OAuth `state`) first-party and 302-redirects to Google. This
  // avoids the cross-origin XHR cookie-storage issues that broke the state check.
  getLoginUrl(): string {
    return `${this.apiUrl}/auth/login`;
  }

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Décode le payload du JWT (sans vérif de signature — usage UX uniquement,
  // l'autorisation réelle est faite côté backend).
  private decodeToken(): any | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  }

  // Rôle applicatif pour le routing front. Défaute à 'client' si le claim est
  // absent (ex. anciens JWT émis avant l'ajout du rôle) — jamais 'admin' par défaut.
  getRole(): 'admin' | 'client' {
    return this.decodeToken()?.role === 'admin' ? 'admin' : 'client';
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  logout(): void {
    localStorage.removeItem('auth_token');
  }

  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/me`);
  }

  // RGPD — droit à l'effacement : supprime le compte et toutes les données
  // associées côté serveur, et révoque l'accès Google.
  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/auth/account`);
  }
}
