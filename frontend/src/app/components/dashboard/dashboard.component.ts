import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GmbService, Fiche } from '../../services/gmb.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="max-w-7xl mx-auto px-4 py-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Mes Fiches Google My Business</h2>

      <div *ngIf="isLoading()" class="text-center py-12">
        <p class="text-gray-600">Chargement des fiches...</p>
      </div>

      <div *ngIf="!isLoading() && fiches().length === 0" class="text-center py-12">
        <p class="text-gray-600">Aucune fiche disponible</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let fiche of fiches()" class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
          <!-- Fiche Card -->
          <div class="p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-2">{{ fiche.nom }}</h3>
            <p class="text-gray-600 text-sm mb-4">{{ fiche.categorie }}</p>

            <!-- Score Bar -->
            <div class="mb-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700">Score</span>
                <span class="text-sm font-bold" [ngClass]="getScoreClass(fiche.score)">
                  {{ fiche.score }}/100
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div
                  class="h-3 rounded-full transition-all"
                  [style.width.%]="fiche.score"
                  [ngClass]="getScoreBarClass(fiche.score)"
                ></div>
              </div>
            </div>

            <!-- Info -->
            <div class="text-sm text-gray-600 mb-4 space-y-1">
              <p *ngIf="fiche.adresse"><strong>📍</strong> {{ fiche.adresse }}</p>
              <p *ngIf="fiche.telephone"><strong>📞</strong> {{ fiche.telephone }}</p>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-2">
              <button
                [routerLink]="['/fiche', fiche.id]"
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition text-sm"
              >
                Détail
              </button>
              <button
                [routerLink]="['/avis', fiche.id]"
                class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition text-sm"
              >
                Avis
              </button>
              <button
                [routerLink]="['/publications', fiche.id]"
                class="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition text-sm"
              >
                Posts
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  `
})
export class DashboardComponent implements OnInit {
  fiches = signal<Fiche[]>([]);
  isLoading = signal(true);

  constructor(private gmbService: GmbService) {}

  ngOnInit(): void {
    this.loadFiches();
  }

  loadFiches(): void {
    this.isLoading.set(true);
    this.gmbService.getFiches().subscribe({
      next: (fiches) => {
        this.fiches.set(fiches);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des fiches:', error);
        this.isLoading.set(false);
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
