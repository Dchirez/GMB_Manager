import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="text-center">
        <p class="text-gray-600">Traitement de votre authentification...</p>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // SECURITY FIX [CWE-598]: the JWT is delivered via URL fragment (#token=...),
    // not via the query string, so it never appears in Referer headers or server logs.
    // Fallback: still accept ?token= for backward compatibility during rollout.
    const hash = window.location.hash || '';
    let token: string | null = null;

    if (hash.startsWith('#')) {
      const params = new URLSearchParams(hash.substring(1));
      token = params.get('token');
    }

    if (!token) {
      this.route.queryParams.subscribe((params) => {
        token = params['token'];
        this.finalize(token);
      });
      return;
    }

    this.finalize(token);
  }

  private finalize(token: string | null): void {
    if (token) {
      this.authService.setToken(token);
      // Clear fragment from URL history
      try { history.replaceState(null, '', window.location.pathname); } catch {}
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
