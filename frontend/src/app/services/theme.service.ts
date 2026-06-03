import { Injectable, signal } from '@angular/core';

export type ThemeId = 'verger' | 'lavande' | 'terracotta' | 'sauge';
export type FontId = 'bricolage' | 'nunito' | 'fraunces' | 'mulish';
export type DensityId = 'compact' | 'regular' | 'comfy';

export interface Palette { id: ThemeId; name: string; dots: string[]; bg: string; }
export interface FontDef { id: FontId; name: string; note: string; css: string; }
export interface DensityDef { id: DensityId; name: string; }

export const PALETTES: Palette[] = [
  { id: 'verger',     name: 'Verger',     dots: ['#57916A', '#E08C4E', '#C9733A'], bg: '#FBF6EC' },
  { id: 'lavande',    name: 'Lavande',    dots: ['#7E6DB2', '#E0A05F', '#5FA694'], bg: '#FAF6F4' },
  { id: 'terracotta', name: 'Terracotta', dots: ['#C9733A', '#DDA94B', '#9A7B5B'], bg: '#FDF7EE' },
  { id: 'sauge',      name: 'Sauge',      dots: ['#4E9B7E', '#88C0A8', '#E0AB55'], bg: '#F3F7F2' },
];

export const FONTS: FontDef[] = [
  { id: 'bricolage', name: 'Bricolage', note: 'Chaleureux', css: "'Bricolage Grotesque', sans-serif" },
  { id: 'nunito',    name: 'Nunito',    note: 'Tout doux',  css: "'Nunito', sans-serif" },
  { id: 'fraunces',  name: 'Fraunces',  note: 'Élégant',    css: "'Fraunces', serif" },
  { id: 'mulish',    name: 'Mulish',    note: 'Épuré',      css: "'Mulish', sans-serif" },
];

export const DENSITIES: DensityDef[] = [
  { id: 'compact', name: 'Compact' },
  { id: 'regular', name: 'Normal' },
  { id: 'comfy',   name: 'Confort' },
];

const STORAGE_KEY = 'gmb_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<ThemeId>('verger');
  font = signal<FontId>('bricolage');
  density = signal<DensityId>('comfy');

  constructor() {
    this.restore();
    this.apply();
  }

  setTheme(id: ThemeId)   { this.theme.set(id); this.persist(); this.apply(); }
  setFont(id: FontId)     { this.font.set(id); this.persist(); this.apply(); }
  setDensity(id: DensityId) { this.density.set(id); this.persist(); this.apply(); }

  private apply() {
    const el = document.documentElement;
    el.setAttribute('data-theme', this.theme());
    el.setAttribute('data-font', this.font());
    el.setAttribute('data-density', this.density());
  }

  private restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const t = JSON.parse(raw);
      if (t.theme) this.theme.set(t.theme);
      if (t.font) this.font.set(t.font);
      if (t.density) this.density.set(t.density);
    } catch { /* ignore */ }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        theme: this.theme(), font: this.font(), density: this.density(),
      }));
    } catch { /* ignore */ }
  }
}
