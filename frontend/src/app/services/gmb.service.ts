import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class GmbService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // Fiches
  getFiches(): Observable<Fiche[]> {
    return this.http.get<Fiche[]>(`${this.apiUrl}/gmb/fiches`);
  }

  getFiche(id: string): Observable<Fiche> {
    return this.http.get<Fiche>(`${this.apiUrl}/gmb/fiches/${id}`);
  }

  updateFiche(id: string, fiche: Partial<Fiche>): Observable<Fiche> {
    return this.http.put<Fiche>(`${this.apiUrl}/gmb/fiches/${id}`, fiche);
  }

  // Avis
  getAvis(ficheId: string): Observable<Avis[]> {
    return this.http.get<Avis[]>(`${this.apiUrl}/avis/fiches/${ficheId}/avis`);
  }

  postReponse(ficheId: string, avisId: string, reponse: string): Observable<Avis> {
    return this.http.post<Avis>(
      `${this.apiUrl}/avis/fiches/${ficheId}/avis/${avisId}/reponse`,
      { reponse }
    );
  }

  // Publications
  getPublications(ficheId: string): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiUrl}/publications/fiches/${ficheId}/posts`);
  }

  createPublication(ficheId: string, titre: string, contenu: string): Observable<Publication> {
    return this.http.post<Publication>(
      `${this.apiUrl}/publications/fiches/${ficheId}/posts`,
      { titre, contenu }
    );
  }

  // Statistiques
  getAvisStats(ficheId: string): Observable<AvisStats> {
    return this.http.get<AvisStats>(`${this.apiUrl}/stats/fiches/${ficheId}/avis`);
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats/dashboard`);
  }

  // Notifications
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }

  markNotificationAsRead(notifId: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.apiUrl}/notifications/${notifId}/lire`, {});
  }

  markAllNotificationsAsRead(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/notifications/lire-tout`, {});
  }

  // Photos
  getPhotos(ficheId: string): Observable<Photo[]> {
    return this.http.get<Photo[]>(`${this.apiUrl}/photos/fiches/${ficheId}/photos`);
  }

  uploadPhoto(ficheId: string, file: File, caption?: string): Observable<Photo> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return this.http.post<Photo>(`${this.apiUrl}/photos/fiches/${ficheId}/photos`, formData);
  }

  deletePhoto(ficheId: string, photoId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/photos/fiches/${ficheId}/photos/${photoId}`);
  }
}
