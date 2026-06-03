export type CardBrand = 'visa' | 'mastercard' | 'amex' | null;

/** Détecte la marque de carte d'après le préfixe du numéro. */
export function cardBrand(num: string): CardBrand {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return null;
}

/** Formate un numéro de carte par blocs de 4 (max 16 chiffres). */
export function fmtCard(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 16);
  return n.replace(/(.{4})/g, '$1 ').trim();
}

/** Formate une date d'expiration en MM/AA. */
export function fmtExp(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 4);
  if (n.length <= 2) return n;
  return n.slice(0, 2) + '/' + n.slice(2);
}
