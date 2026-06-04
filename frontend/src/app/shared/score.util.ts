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

