export function scoreColor(score: number): string {
  if (score >= 80) return 'var(--score-high)';
  if (score >= 50) return 'var(--score-mid)';
  return 'var(--score-low)';
}

export function scoreLabel(score: number): string {
  if (score >= 100) return 'Fiche au top 🎉';
  if (score >= 80) return 'Presque parfait';
  if (score >= 50) return 'En bonne voie';
  if (score >= 30) return 'À enrichir';
  return 'À démarrer';
}

/** Emoji représentatif dérivé de la catégorie du commerce. */
export function categoryEmoji(category: string | undefined | null): string {
  const c = (category || '').toLowerCase();
  if (/(boulang|pâtiss|patiss|pain)/.test(c)) return '🥐';      // 🥐
  if (/(coiff|hair|beaut|salon|esth)/.test(c)) return '✂️';      // ✂️
  if (/(frite|restau|food|pizz|burger|traiteur|snack)/.test(c)) return '🍟'; // 🍟
  if (/(auto|garage|mécan|mecan|voiture)/.test(c)) return '🚗';  // 🚗
  if (/(fleur|jardin)/.test(c)) return '💐';                     // 💐
  if (/(café|cafe|bar|brasserie)/.test(c)) return '☕';               // ☕
  if (/(pharm|santé|sante|médic|medic)/.test(c)) return '💊';    // 💊
  if (/(boutique|magasin|mode|vêtem|vetem)/.test(c)) return '🛒'; // 🛒
  return '🏪';                                                    // 🏪
}
