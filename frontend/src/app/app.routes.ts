import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FicheDetailComponent } from './components/fiche-detail/fiche-detail.component';
import { AvisComponent } from './components/avis/avis.component';
import { PublicationsComponent } from './components/publications/publications.component';
import { HomeComponent } from './components/home/home.component';
import { PrivacyComponent } from './components/privacy/privacy.component';
import { PaymentComponent } from './components/payment/payment.component';
import { InvoicesComponent } from './components/invoices/invoices.component';
import { TicketComponent } from './components/ticket/ticket.component';
import { ClientHomeComponent } from './components/client-home/client-home.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard, clientGuard } from './guards/role.guard';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'confidentialite', component: PrivacyComponent },
  { path: 'login', component: LoginComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] },
  { path: 'mon-commerce', component: ClientHomeComponent, canActivate: [clientGuard] },
  { path: 'fiche/:id', component: FicheDetailComponent, canActivate: [authGuard] },
  { path: 'fiche/:id/demande', component: TicketComponent, canActivate: [authGuard] },
  { path: 'avis/:id', component: AvisComponent, canActivate: [authGuard] },
  { path: 'publications/:id', component: PublicationsComponent, canActivate: [authGuard] },
  { path: 'paiement/:planId', component: PaymentComponent, canActivate: [authGuard] },
  { path: 'factures', component: InvoicesComponent, canActivate: [authGuard] }
];
