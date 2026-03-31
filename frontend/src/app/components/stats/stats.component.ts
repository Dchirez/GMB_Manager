import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GmbService, AvisStats } from '../../services/gmb.service';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-6">
      <h2 class="text-2xl font-bold text-gray-900">Statistiques des avis</h2>

      <div *ngIf="stats() | async as data" class="space-y-6">
        <!-- KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-sm text-gray-600">Nombre d'avis</div>
            <div class="text-3xl font-bold text-indigo-600">{{ data.total_avis }}</div>
          </div>

          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-sm text-gray-600">Note moyenne</div>
            <div class="text-3xl font-bold text-yellow-500">{{ data.note_moyenne }}/5</div>
          </div>

          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-sm text-gray-600">Taux de réponse</div>
            <div class="text-3xl font-bold text-green-600">{{ data.taux_reponse }}%</div>
          </div>

          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-sm text-gray-600">Meilleure note</div>
            <div class="text-3xl font-bold">⭐{{ data.repartition['5'] }}</div>
          </div>
        </div>

        <!-- Répartition par note -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Répartition des notes</h3>
          <div class="space-y-3">
            <div *ngFor="let note of [5, 4, 3, 2, 1]" class="flex items-center gap-3">
              <span class="w-8 text-sm font-medium">{{ note }}★</span>
              <div class="flex-1 bg-gray-200 rounded-full h-8">
                <div
                  class="h-full rounded-full transition-all"
                  [ngClass]="{
                    'bg-green-500': note >= 4,
                    'bg-yellow-500': note === 3,
                    'bg-red-500': note <= 2
                  }"
                  [style.width.%]="(data.repartition[note] / data.total_avis) * 100"
                ></div>
              </div>
              <span class="w-12 text-right text-sm">{{ data.repartition[note] }}</span>
            </div>
          </div>
        </div>

        <!-- Évolution mensuelle -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Évolution sur 12 mois</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="border-b border-gray-300">
                <tr>
                  <th class="text-left py-2">Mois</th>
                  <th class="text-center py-2">Nombre d'avis</th>
                  <th class="text-center py-2">Note moyenne</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let mois of data.evolution_mensuelle" class="border-b border-gray-200 hover:bg-gray-50">
                  <td class="py-2">{{ mois.mois }}</td>
                  <td class="text-center">{{ mois.count }}</td>
                  <td class="text-center">{{ mois.moyenne }}/5</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div *ngIf="(stats() | async) === null" class="text-center py-8">
        <p class="text-gray-500">Chargement des statistiques...</p>
      </div>
    </div>
  `,
  styles: []
})
export class StatsComponent {
  ficheId = input.required<string>();
  private gmbService = inject(GmbService);
  stats = () => this.gmbService.getAvisStats(this.ficheId());
}
