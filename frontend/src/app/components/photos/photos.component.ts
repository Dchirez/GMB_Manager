import { Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GmbService, Photo } from '../../services/gmb.service';

@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900">Galerie photos</h2>
        <label class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition">
          <span>Ajouter une photo</span>
          <input
            type="file"
            accept="image/*"
            (change)="onFileSelected($event)"
            class="hidden"
          />
        </label>
      </div>

      <!-- Upload progress -->
      <div *ngIf="uploading()" class="bg-blue-50 p-4 rounded-lg">
        <p class="text-sm text-blue-800">Téléchargement en cours...</p>
        <div class="mt-2 w-full bg-blue-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full" style="width: 50%"></div>
        </div>
      </div>

      <!-- Messages -->
      <div *ngIf="uploadSuccess()" class="bg-green-50 p-4 rounded-lg text-green-800">
        Photo téléchargée avec succès!
      </div>

      <div *ngIf="uploadError()" class="bg-red-50 p-4 rounded-lg text-red-800">
        Erreur: {{ uploadError() }}
      </div>

      <!-- Photo grid -->
      <div class="space-y-4">
        <div *ngIf="allPhotos().length === 0" class="text-center py-8 text-gray-500">
          Aucune photo pour le moment
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            *ngFor="let photo of allPhotos()"
            class="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer"
            (click)="openLightbox(photo)"
          >
            <img
              [src]="photo.url"
              [alt]="photo.caption || 'Photo'"
              class="w-full h-full object-cover group-hover:opacity-75 transition"
            />

            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center">
              <button
                (click)="deletePhoto(photo, $event)"
                class="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-full transition"
                title="Supprimer la photo"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>

            <div
              *ngIf="photo.caption"
              class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm"
            >
              {{ photo.caption }}
            </div>
          </div>
        </div>
      </div>

      <!-- Lightbox -->
      <div
        *ngIf="lightboxPhoto()"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
        (click)="closeLightbox()"
      >
        <div class="flex items-center justify-center w-full h-full" (click)="$event.stopPropagation()">
          <button
            (click)="previousPhoto()"
            class="absolute left-4 text-white hover:bg-white/20 p-2 rounded"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>

          <img
            [src]="lightboxPhoto()?.url"
            [alt]="lightboxPhoto()?.caption || 'Photo'"
            class="max-w-4xl max-h-4xl object-contain"
          />

          <button
            (click)="nextPhoto()"
            class="absolute right-4 text-white hover:bg-white/20 p-2 rounded"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>

          <button
            (click)="closeLightbox()"
            class="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PhotosComponent implements OnInit {
  ficheId = input.required<string>();
  private gmbService = inject(GmbService);

  uploading = signal(false);
  uploadSuccess = signal(false);
  uploadError = signal<string>('');
  lightboxPhoto = signal<Photo | null>(null);
  allPhotos = signal<Photo[]>([]);

  ngOnInit() {
    this.loadPhotos();
  }

  private loadPhotos() {
    this.gmbService.getPhotos(this.ficheId()).subscribe({
      next: (photos) => {
        this.allPhotos.set(photos);
      },
      error: (err) => {
        console.error('Erreur loading photos:', err);
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('Le fichier est trop volumineux (max 5MB)');
      setTimeout(() => this.uploadError.set(''), 5000);
      return;
    }

    this.uploading.set(true);
    this.uploadSuccess.set(false);
    this.uploadError.set('');

    this.gmbService.uploadPhoto(this.ficheId(), file).subscribe({
      next: (photo) => {
        this.uploading.set(false);
        this.uploadSuccess.set(true);
        this.allPhotos.update(photos => [photo, ...photos]);
        setTimeout(() => this.uploadSuccess.set(false), 3000);
        // Reset input
        input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err.error?.error || 'Erreur lors du téléchargement');
        setTimeout(() => this.uploadError.set(''), 5000);
      }
    });
  }

  deletePhoto(photo: Photo, event: Event) {
    event.stopPropagation();

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo?')) return;

    this.gmbService.deletePhoto(this.ficheId(), photo.id).subscribe({
      next: () => {
        this.allPhotos.update(photos => photos.filter(p => p.id !== photo.id));
        if (this.lightboxPhoto()?.id === photo.id) {
          this.closeLightbox();
        }
      },
      error: (err) => {
        console.error('Erreur deleting photo:', err);
        alert('Erreur lors de la suppression');
      }
    });
  }

  openLightbox(photo: Photo) {
    this.lightboxPhoto.set(photo);
  }

  closeLightbox() {
    this.lightboxPhoto.set(null);
  }

  previousPhoto() {
    const current = this.lightboxPhoto();
    if (!current) return;

    const currentIndex = this.allPhotos().findIndex(p => p.id === current.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : this.allPhotos().length - 1;
    this.lightboxPhoto.set(this.allPhotos()[previousIndex]);
  }

  nextPhoto() {
    const current = this.lightboxPhoto();
    if (!current) return;

    const currentIndex = this.allPhotos().findIndex(p => p.id === current.id);
    const nextIndex = currentIndex < this.allPhotos().length - 1 ? currentIndex + 1 : 0;
    this.lightboxPhoto.set(this.allPhotos()[nextIndex]);
  }
}
