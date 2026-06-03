import { Injectable, signal } from '@angular/core';
import { CardBrand } from '../shared/card.util';

export interface SavedCard {
  last4: string;
  brand: CardBrand;
  exp: string;
  company: string;
}

const STORAGE_KEY = 'gmb_company_card';

/**
 * Stockage local de la carte d'entreprise enregistrée (front-only — pas de
 * backend de facturation). Persisté en localStorage pour survivre au refresh.
 */
@Injectable({ providedIn: 'root' })
export class BillingService {
  card = signal<SavedCard | null>(null);

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.card.set(JSON.parse(raw));
    } catch { /* ignore */ }
  }

  saveCard(card: SavedCard) {
    this.card.set(card);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(card)); } catch { /* ignore */ }
  }
}
