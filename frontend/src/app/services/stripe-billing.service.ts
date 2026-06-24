import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BillingPlan {
  price_id: string;
  product: string;
  description: string | null;
  unit_amount: number;        // en centimes
  currency: string;
  interval: 'month' | 'year' | string;
  interval_count: number;
}

export interface BillingConfig {
  configured: boolean;
  publishableKey: string | null;
  plans: BillingPlan[];
}

export interface SubscriptionState {
  subscription_status: string | null;
  plan: string | null;
  is_active: boolean;
  current_period_end: string | null;
  has_subscription: boolean;
}

/**
 * Service de facturation Stripe (abonnements self-service).
 * Distinct de l'ancien BillingService (carte locale, mock) pour ne pas casser
 * les écrans factures / carte d'entreprise.
 */
@Injectable({ providedIn: 'root' })
export class StripeBillingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/billing`;

  getConfig(): Observable<BillingConfig> {
    return this.http.get<BillingConfig>(`${this.apiUrl}/config`);
  }

  getSubscription(): Observable<SubscriptionState> {
    return this.http.get<SubscriptionState>(`${this.apiUrl}/subscription`);
  }

  createSubscription(priceId: string): Observable<{ subscription_id: string; client_secret: string }> {
    return this.http.post<{ subscription_id: string; client_secret: string }>(
      `${this.apiUrl}/create-subscription`, { price_id: priceId },
    );
  }

  openPortal(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.apiUrl}/portal`, {});
  }
}
