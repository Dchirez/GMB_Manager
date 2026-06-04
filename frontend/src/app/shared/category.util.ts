/** Catégories de commerce + emoji associé (repris du prototype Design). */
export interface Category {
  id: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { id: 'Boulangerie', emoji: '🥐' },
  { id: 'Restaurant', emoji: '🍽️' },
  { id: 'Restauration rapide', emoji: '🍟' },
  { id: 'Coiffeur', emoji: '✂️' },
  { id: 'Garage automobile', emoji: '🔧' },
  { id: 'Beauté & bien-être', emoji: '💅' },
  { id: 'Commerce', emoji: '🛒' },
  { id: 'Autre', emoji: '📍' },
];

/** Emoji d'une catégorie (insensible à la casse). Fallback : 📍 (Autre). */
export function categoryEmoji(category?: string | null): string {
  if (!category) return '📍';
  const match = CATEGORIES.find(c => c.id.toLowerCase() === category.trim().toLowerCase());
  return match?.emoji ?? '📍';
}
