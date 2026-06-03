import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';
import { ScoreBarComponent } from '../../shared/score-bar.component';
import { StarsComponent } from '../../shared/stars.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, ScoreBarComponent, StarsComponent],
  template: `
    <div class="gmb">
      <header class="topbar">
        <div class="container topbar-inner">
          <div class="brand">
            <img src="assets/logo.png" alt="GMB Manager" />
            <span class="brand-name">GMB <span class="mark">Manager</span></span>
          </div>
          <button class="btn btn-ghost btn-sm" (click)="login()">Se connecter</button>
        </div>
      </header>

      <main class="container">
        <section class="hero">
          <div class="hero-copy">
            <div class="pill pill-accent fade-up" style="margin-bottom:22px">
              <app-icon name="handHeart" /> Pensé pour les commerçants de proximité
            </div>
            <h1 class="hero-title fade-up" style="animation-delay:60ms">
              Votre vitrine sur Google,<br /><span class="hl">enfin simple à gérer.</span>
            </h1>
            <p class="hero-sub fade-up muted" style="animation-delay:120ms">
              Avis, photos, horaires, statistiques&nbsp;: pilotez la présence Google de votre commerce
              depuis un seul endroit, sans jargon et sans prise de tête. On vous guide pas à pas. 🌿
            </p>
            <div class="hero-cta fade-up" style="animation-delay:180ms">
              <button class="btn btn-primary btn-lg" (click)="login()">
                <app-icon name="google" /> Se connecter avec Google
              </button>
              <button class="btn btn-quiet btn-lg" (click)="login()">
                Voir une démo <app-icon name="arrowRight" />
              </button>
            </div>
            <p class="hero-reassure fade-up faint" style="animation-delay:240ms">
              <app-icon name="check" style="color:var(--primary)" /> Gratuit pour démarrer · Aucune carte bancaire · Vos données restent les vôtres
            </p>
          </div>

          <div class="hero-preview">
            <div class="hp-card card pop-in" style="animation-delay:200ms">
              <div class="row" style="gap:12px;margin-bottom:16px">
                <span class="hp-emoji">✂️</span>
                <div>
                  <div style="font-family:var(--font-display);font-weight:800;font-size:17px">Salon Belle Allure</div>
                  <span class="pill pill-primary" style="margin-top:4px;font-size:11.5px;padding:3px 10px">Coiffeur</span>
                </div>
              </div>
              <app-score-bar [score]="100" />
              <div class="row" style="gap:8px;margin-top:16px;color:var(--ink-soft);font-size:13.5px;font-weight:600">
                <app-icon name="pin" style="color:var(--accent)" /> 5 Rue du Commerce, Rouvroy
              </div>
            </div>

            <div class="hp-chip hp-chip-1 pop-in" style="animation-delay:500ms">
              <app-stars [value]="5" [size]="13" />
              <span style="font-weight:800;font-size:14px">4,9</span>
              <span class="faint" style="font-size:12.5px;font-weight:600">64 avis</span>
            </div>

            <div class="hp-chip hp-chip-2 pop-in" style="animation-delay:700ms">
              <span style="width:30px;height:30px;border-radius:50%;background:var(--primary-soft);color:var(--primary-deep);display:grid;place-items:center;font-size:16px">
                <app-icon name="sparkle" />
              </span>
              <div>
                <div style="font-weight:800;font-size:13.5px;line-height:1.2">Fiche complète&nbsp;!</div>
                <div class="faint" style="font-size:11.5px;font-weight:600">+38% de vues ce mois</div>
              </div>
            </div>
          </div>
        </section>

        <section class="features">
          <div class="features-head fade-up">
            <h2 style="font-size:30px">Tout ce qu'il faut, rien de superflu</h2>
            <p class="muted" style="font-size:16px;margin-top:8px">Trois outils pour rayonner localement, présentés clairement.</p>
          </div>
          <div class="features-grid">
            <div class="card feat-card fade-up" style="animation-delay:80ms">
              <div class="feat-icon" style="background:var(--primary-soft);color:var(--primary-deep)"><app-icon name="chart" /></div>
              <h3 style="font-size:19px;margin-bottom:8px">Score de complétude</h3>
              <p class="muted" style="font-size:15px;line-height:1.6">Voyez d'un coup d'œil ce qui manque sur chaque fiche, et complétez-la en quelques minutes.</p>
            </div>
            <div class="card feat-card fade-up" style="animation-delay:160ms">
              <div class="feat-icon" style="background:var(--accent-soft);color:var(--accent-deep)"><app-icon name="star" /></div>
              <h3 style="font-size:19px;margin-bottom:8px">Gestion des avis</h3>
              <p class="muted" style="font-size:15px;line-height:1.6">Suivez votre note, lisez chaque retour et répondez avec bienveillance, directement ici.</p>
            </div>
            <div class="card feat-card fade-up" style="animation-delay:240ms">
              <div class="feat-icon" style="background:var(--tertiary-soft);color:var(--tertiary)"><app-icon name="image" /></div>
              <h3 style="font-size:19px;margin-bottom:8px">Photos & publications</h3>
              <p class="muted" style="font-size:15px;line-height:1.6">Mettez votre commerce en valeur avec de belles photos et des actualités qui donnent envie.</p>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <div class="container row" style="justify-content:space-between;flex-wrap:wrap;gap:14px">
          <span class="faint" style="font-size:13.5px;font-weight:600">© {{ year }} GMB Manager · Fait avec <app-icon name="heart" style="color:var(--accent);vertical-align:-2px" /> pour les commerces locaux</span>
          <span class="row" style="gap:22px;font-size:13.5px;font-weight:600">
            <a class="muted" routerLink="/confidentialite">Confidentialité</a>
            <a class="muted" href="mailto:dchirez59&#64;gmail.com">Contact</a>
          </span>
        </div>
      </footer>
    </div>
  `,
})
export class HomeComponent {
  year = new Date().getFullYear();

  constructor(private authService: AuthService) {}

  login(): void {
    window.location.href = this.authService.getLoginUrl();
  }
}
