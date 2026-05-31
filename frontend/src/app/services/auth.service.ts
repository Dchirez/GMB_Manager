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

  getGoogleAuthUrl(): Observable<{ auth_url: string }> {
    // withCredentials so the browser stores the session cookie that carries the
    // OAuth `state` (verified server-side at /auth/callback).
    return this.http.get<{ auth_url: string }>(`${this.apiUrl}/auth/login`, {
      withCredentials: true
    });
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

  logout(): void {
    localStorage.removeItem('auth_token');
  }

  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/me`);
  }
}
