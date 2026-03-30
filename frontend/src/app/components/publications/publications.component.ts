import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GmbService, Publication } from '../../services/gmb.service';

@Component({
  selector: 'app-publications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow">
        <div class="max-w-3xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 class="text-3xl font-bold text-gray-900">Publications</h1>
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
          <p class="text-gray-600">Chargement des publications...</p>
        </div>

        <!-- Formulaire Création -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Créer une publication</h2>
          <form (ngSubmit)="createPublication()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Titre</label>
              <input
                type="text"
                [(ngModel)]="newTitle"
                name="title"
                placeholder="Ex: Promotion spéciale..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Contenu</label>
              <textarea
                [(ngModel)]="newContent"
                name="content"
                placeholder="Écrivez votre publication..."
                rows="4"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <button
              type="submit"
              [disabled]="!newTitle || !newContent || isCreating()"
              class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition"
            >
              {{ isCreating() ? 'Publication en cours...' : 'Publier' }}
            </button>
          </form>
        </div>

        <!-- Publications List -->
        <div *ngIf="!isLoading() && publications().length === 0" class="text-center py-12 bg-white rounded-lg">
          <p class="text-gray-600">Aucune publication pour cette fiche</p>
        </div>

        <div class="space-y-4">
          <div *ngFor="let pub of publications()" class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ pub.titre }}</h3>
            <p class="text-sm text-gray-600 mb-3">{{ pub.date }}</p>
            <p class="text-gray-700 mb-3">{{ pub.contenu }}</p>
            <span class="inline-block bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
              {{ pub.statut }}
            </span>
          </div>
        </div>
      </main>
    </div>
  `
})
export class PublicationsComponent implements OnInit {
  publications = signal<Publication[]>([]);
  isLoading = signal(true);
  isCreating = signal(false);
  newTitle = '';
  newContent = '';
  ficheId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gmbService: GmbService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.ficheId = params['id'];
      this.loadPublications();
    });
  }

  loadPublications(): void {
    this.isLoading.set(true);
    this.gmbService.getPublications(this.ficheId).subscribe({
      next: (publications) => {
        this.publications.set(publications);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des publications:', error);
        this.isLoading.set(false);
      }
    });
  }

  createPublication(): void {
    if (!this.newTitle.trim() || !this.newContent.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    this.isCreating.set(true);
    this.gmbService.createPublication(this.ficheId, this.newTitle, this.newContent).subscribe({
      next: (newPub) => {
        this.publications.set([...this.publications(), newPub]);
        this.newTitle = '';
        this.newContent = '';
        this.isCreating.set(false);
      },
      error: (error) => {
        console.error('Erreur lors de la création de la publication:', error);
        this.isCreating.set(false);
        alert('Erreur lors de la création de la publication');
      }
    });
  }
}
