import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FicheDetailComponent } from './components/fiche-detail/fiche-detail.component';
import { AvisComponent } from './components/avis/avis.component';
import { PublicationsComponent } from './components/publications/publications.component';
import { authGuard } from './guards/auth.guard';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'fiche/:id', component: FicheDetailComponent, canActivate: [authGuard] },
  { path: 'avis/:id', component: AvisComponent, canActivate: [authGuard] },
  { path: 'publications/:id', component: PublicationsComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];
