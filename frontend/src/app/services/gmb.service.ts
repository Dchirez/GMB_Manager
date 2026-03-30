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
}
