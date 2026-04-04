import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Fiche {
  id: string;
  nom: string;
  categorie: string;
  adresse: string;
  telephone: string;
  site_web: string;
  horaires: string;
  description: string;
  score: number;
}

export interface Avis {
  id: string;
  auteur: string;
  note: number;
  date: string;
  commentaire: string;
  reponse: string | null;
}

export interface Publication {
  id: string;
  titre: string;
  contenu: string;
  image_url: string | null;
  image_filename: string | null;
  date: string;
  statut: string;
}

export interface AvisStats {
  fiche_id: string;
  total_avis: number;
  note_moyenne: number;
  repartition: { [key: string]: number };
  evolution_mensuelle: Array<{ mois: string; count: number; moyenne: number }>;
  taux_reponse: number;
}

export interface DashboardStats {
  nombre_fiches: number;
  score_moyen: number;
  meilleure_fiche: { id: string; nom: string; score: number } | null;
  pire_fiche: { id: string; nom: string; score: number } | null;
  nombre_total_avis: number;
}

export interface Notification {
  id: number;
  fiche_id: string;
  type: string;
  message: string;
  lu: boolean;
  created_at: string;
}

export interface Photo {
  id: string;
  fiche_id: string;
  filename: string;
  url: string;
  caption: string;
  uploaded_at: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class GmbService {
  private apiUrl = `${environment.apiUrl}/api`;
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_PREFIX = 'gmb_cache_';

  constructor(private http: HttpClient) {}

  // ==================== CACHE HELPERS ====================

  private getCached<T>(key: string): T | null {
    // Check memory cache first
    const memEntry = this.cache.get(key);
    if (memEntry && (Date.now() - memEntry.timestamp) < this.TTL_MS) {
      return memEntry.data as T;
    }

    // Check sessionStorage
    try {
      const stored = sessionStorage.getItem(this.CACHE_PREFIX + key);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if ((Date.now() - entry.timestamp) < this.TTL_MS) {
          // Restore to memory cache
          this.cache.set(key, entry);
          return entry.data;
        }
        // Expired — clean up
        sessionStorage.removeItem(this.CACHE_PREFIX + key);
      }
    } catch {
      // sessionStorage parse error — ignore
    }

    return null;
  }

  private getStale<T>(key: string): T | null {
    // Return data even if expired (for stale-while-revalidate)
    const memEntry = this.cache.get(key);
    if (memEntry) return memEntry.data as T;

    try {
      const stored = sessionStorage.getItem(this.CACHE_PREFIX + key);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        return entry.data;
      }
    } catch {
      // ignore
    }

    return null;
  }

  private setCache<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    this.cache.set(key, entry);
    try {
      sessionStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // sessionStorage full — ignore
    }
  }

  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      try { sessionStorage.removeItem(this.CACHE_PREFIX + key); } catch {}
    } else {
      this.cache.clear();
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(this.CACHE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch {}
    }
  }

  private cachedGet<T>(key: string, httpCall: () => Observable<T>): Observable<T> {
    // Fresh cache hit — return immediately
    const fresh = this.getCached<T>(key);
    if (fresh) return of(fresh);

    // Stale data available — return stale + revalidate in background
    const stale = this.getStale<T>(key);
    if (stale) {
      // Fire HTTP in background to refresh cache
      httpCall().pipe(tap(data => this.setCache(key, data))).subscribe();
      return of(stale);
    }

    // No cache — fetch and cache
    return httpCall().pipe(tap(data => this.setCache(key, data)));
  }

  // ==================== FICHES ====================

  getFiches(): Observable<Fiche[]> {
    return this.cachedGet('fiches', () =>
      this.http.get<Fiche[]>(`${this.apiUrl}/gmb/fiches`)
    );
  }

  getFiche(id: string): Observable<Fiche> {
    return this.cachedGet(`fiche_${id}`, () =>
      this.http.get<Fiche>(`${this.apiUrl}/gmb/fiches/${id}`)
    );
  }

  updateFiche(id: string, fiche: Partial<Fiche>): Observable<Fiche> {
    this.clearCache(`fiche_${id}`);
    this.clearCache('fiches');
    return this.http.put<Fiche>(`${this.apiUrl}/gmb/fiches/${id}`, fiche).pipe(
      tap(data => this.setCache(`fiche_${id}`, data))
    );
  }

  // ==================== AVIS ====================

  getAvis(ficheId: string): Observable<Avis[]> {
    return this.cachedGet(`avis_${ficheId}`, () =>
      this.http.get<Avis[]>(`${this.apiUrl}/avis/fiches/${ficheId}/avis`)
    );
  }

  postReponse(ficheId: string, avisId: string, reponse: string): Observable<Avis> {
    this.clearCache(`avis_${ficheId}`);
    this.clearCache(`stats_${ficheId}`);
    return this.http.post<Avis>(
      `${this.apiUrl}/avis/fiches/${ficheId}/avis/${avisId}/reponse`,
      { reponse }
    );
  }

  // ==================== PUBLICATIONS ====================

  getPublications(ficheId: string): Observable<Publication[]> {
    return this.cachedGet(`publications_${ficheId}`, () =>
      this.http.get<Publication[]>(`${this.apiUrl}/publications/fiches/${ficheId}/posts`)
    );
  }

  createPublication(ficheId: string, titre: string, contenu: string, file?: File): Observable<Publication> {
    this.clearCache(`publications_${ficheId}`);
    if (file) {
      const formData = new FormData();
      formData.append('titre', titre);
      formData.append('contenu', contenu);
      formData.append('file', file);
      return this.http.post<Publication>(
        `${this.apiUrl}/publications/fiches/${ficheId}/posts`,
        formData
      );
    }
    return this.http.post<Publication>(
      `${this.apiUrl}/publications/fiches/${ficheId}/posts`,
      { titre, contenu }
    );
  }

  // ==================== STATISTIQUES ====================

  getAvisStats(ficheId: string): Observable<AvisStats> {
    return this.cachedGet(`stats_${ficheId}`, () =>
      this.http.get<AvisStats>(`${this.apiUrl}/stats/fiches/${ficheId}/avis`)
    );
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.cachedGet('dashboard_stats', () =>
      this.http.get<DashboardStats>(`${this.apiUrl}/stats/dashboard`)
    );
  }

  // ==================== NOTIFICATIONS ====================
  // (pas de cache — doivent toujours être fraîches)

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }

  markNotificationAsRead(notifId: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.apiUrl}/notifications/${notifId}/lire`, {});
  }

  markAllNotificationsAsRead(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/notifications/lire-tout`, {});
  }

  // ==================== PHOTOS ====================

  getPhotos(ficheId: string): Observable<Photo[]> {
    return this.cachedGet(`photos_${ficheId}`, () =>
      this.http.get<Photo[]>(`${this.apiUrl}/photos/fiches/${ficheId}/photos`)
    );
  }

  uploadPhoto(ficheId: string, file: File, caption?: string): Observable<Photo> {
    this.clearCache(`photos_${ficheId}`);
    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return this.http.post<Photo>(`${this.apiUrl}/photos/fiches/${ficheId}/photos`, formData);
  }

  deletePhoto(ficheId: string, photoId: string): Observable<{ message: string }> {
    this.clearCache(`photos_${ficheId}`);
    return this.http.delete<{ message: string }>(`${this.apiUrl}/photos/fiches/${ficheId}/photos/${photoId}`);
  }
}
