import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GmbService, Fiche } from '../../services/gmb.service';

@Component({
  selector: 'app-fiche-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow">
        <div class="max-w-3xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 class="text-3xl font-bold text-gray-900">Détail Fiche</h1>
          <button
            [routerLink]="['/dashboard']"
            class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition"
          >
            Retour
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-3xl mx-auto px-4 py-8">
        <div *ngIf="isLoading()" class="text-center py-12">
          <p class="text-gray-600">Chargement de la fiche...</p>
        </div>

        <div *ngIf="!isLoading() && fiche()" class="bg-white rounded-lg shadow-md p-8">
          <!-- Score -->
          <div *ngIf="fiche()" class="mb-6 p-4 bg-gray-50 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-lg font-medium text-gray-700">Score de complétude</span>
              <span class="text-3xl font-bold" [ngClass]="getScoreClass(fiche()!.score)">
                {{ fiche()!.score }}/100
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 mt-3">
              <div
                class="h-4 rounded-full transition-all"
                [style.width.%]="fiche()!.score"
                [ngClass]="getScoreBarClass(fiche()!.score)"
              ></div>
            </div>
          </div>

          <!-- Form -->
          <form *ngIf="fiche()" (ngSubmit)="saveFiche()" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nom de l'établissement</label>
              <input
                type="text"
                [(ngModel)]="fiche()!.nom"
                name="nom"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
              <input
                type="tel"
                [(ngModel)]="fiche()!.telephone"
                name="telephone"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
              <input
                type="text"
                [(ngModel)]="fiche()!.adresse"
                name="adresse"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Site Web</label>
              <input
                type="url"
                [(ngModel)]="fiche()!.site_web"
                name="site_web"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Horaires</label>
              <input
                type="text"
                [(ngModel)]="fiche()!.horaires"
                name="horaires"
                placeholder="Ex: Lun-Sam 9h-19h"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                [(ngModel)]="fiche()!.description"
                name="description"
                rows="4"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <button
              type="submit"
              [disabled]="isSaving()"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              {{ isSaving() ? 'Sauvegarde en cours...' : 'Sauvegarder' }}
            </button>
          </form>
        </div>
      </main>
    </div>
  `
})
export class FicheDetailComponent implements OnInit {
  fiche = signal<Fiche | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  ficheId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gmbService: GmbService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.ficheId = params['id'];
      this.loadFiche();
    });
  }

  loadFiche(): void {
    this.isLoading.set(true);
    this.gmbService.getFiche(this.ficheId).subscribe({
      next: (fiche) => {
        this.fiche.set(fiche);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la fiche:', error);
        this.isLoading.set(false);
      }
    });
  }

  saveFiche(): void {
    const ficheData = this.fiche();
    if (!ficheData) return;

    this.isSaving.set(true);
    const updates = {
      nom: ficheData.nom,
      telephone: ficheData.telephone,
      adresse: ficheData.adresse,
      site_web: ficheData.site_web,
      horaires: ficheData.horaires,
      description: ficheData.description
    };

    this.gmbService.updateFiche(this.ficheId, updates).subscribe({
      next: (updatedFiche) => {
        this.fiche.set(updatedFiche);
        this.isSaving.set(false);
        // OBLIGATOIRE: redirection vers dashboard après succès
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.isSaving.set(false);
        alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
      }
    });
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }

  getScoreBarClass(score: number): string {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  }
}
