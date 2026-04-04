import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GmbService, Publication } from '../../services/gmb.service';

@Component({
  selector: 'app-publications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
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

            <!-- Photo Upload -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Photo (optionnel)</label>
              <input
                type="file"
                #fileInput
                (change)="onFileSelected($event)"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                class="hidden"
              />
              <div *ngIf="!selectedFile()" class="flex items-center gap-3">
                <button
                  type="button"
                  (click)="fileInput.click()"
                  class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Ajouter une photo
                </button>
              </div>

              <!-- Preview -->
              <div *ngIf="selectedFile()" class="relative">
                <img
                  [src]="imagePreview()"
                  alt="Preview"
                  class="w-full max-h-48 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  (click)="removeFile()"
                  class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-md transition"
                >
                  &times;
                </button>
                <p class="text-sm text-gray-500 mt-1">{{ selectedFile()?.name }}</p>
              </div>
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
            <img
              *ngIf="pub.image_url"
              [src]="pub.image_url"
              [alt]="pub.titre"
              class="w-full max-h-64 object-cover rounded-lg mb-3"
            />
            <p class="text-gray-700 mb-3">{{ pub.contenu }}</p>
            <span class="inline-block bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
              {{ pub.statut }}
            </span>
          </div>
        </div>
      </main>
  `
})
export class PublicationsComponent implements OnInit {
  publications = signal<Publication[]>([]);
  isLoading = signal(true);
  isCreating = signal(false);
  selectedFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier ne doit pas dépasser 5 Mo');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);

    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.imagePreview.set(null);
  }

  createPublication(): void {
    if (!this.newTitle.trim() || !this.newContent.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    this.isCreating.set(true);
    const file = this.selectedFile() ?? undefined;
    this.gmbService.createPublication(this.ficheId, this.newTitle, this.newContent, file).subscribe({
      next: (newPub) => {
        this.publications.set([newPub, ...this.publications()]);
        this.newTitle = '';
        this.newContent = '';
        this.selectedFile.set(null);
        this.imagePreview.set(null);
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
