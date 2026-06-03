import { Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GmbService, Photo } from '../../services/gmb.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <input type="file" #fileInput accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
           (change)="onFileSelected($event)" style="display:none" />

    @if (uploadError()) {
      <div class="card fade-up" style="background:#FBEAE4;border-color:#F3D3C8;color:#C2553B;font-weight:600;margin-bottom:var(--gap)">
        {{ uploadError() }}
      </div>
    }

    @if (allPhotos().length === 0 && !uploading()) {
      <!-- Empty state -->
      <div class="card photos-empty fade-up" [class.dragging]="drag()"
           (dragover)="onDragOver($event)" (dragleave)="drag.set(false)" (drop)="onDrop($event)">
        <div class="pe-illus">
          <span class="pe-frame pe-frame-1"><app-icon name="image" /></span>
          <span class="pe-frame pe-frame-2"><app-icon name="image" /></span>
          <span class="pe-frame pe-frame-3"><app-icon name="camera" /></span>
          <span class="pe-spark s1"><app-icon name="sparkle" /></span>
          <span class="pe-spark s2"><app-icon name="sparkle" /></span>
        </div>
        <h2 style="font-size:25px;margin-bottom:10px">Vos plus belles photos vont ici 📸</h2>
        <p class="muted" style="font-size:16px;max-width:460px;line-height:1.6;margin-bottom:6px">
          Les fiches avec photos reçoivent <strong style="color:var(--primary-deep)">jusqu'à 42% de demandes d'itinéraire en plus</strong>.
          Glissez vos images ici, ou parcourez votre appareil.
        </p>
        <div class="row" style="gap:12px;margin-top:22px">
          <button class="btn btn-primary btn-lg" (click)="fileInput.click()"><app-icon name="upload" /> Ajouter mes photos</button>
        </div>
        <p class="faint" style="font-size:13px;margin-top:16px;font-weight:600">JPG ou PNG · 5 Mo max · La devanture et l'intérieur fonctionnent le mieux</p>
      </div>
    } @else {
      <div class="card fade-up">
        <div class="row" style="justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
          <div>
            <h2 style="font-size:22px">Galerie photos</h2>
            <p class="muted" style="font-size:14.5px;font-weight:600;margin-top:4px">
              {{ allPhotos().length }} photo{{ allPhotos().length > 1 ? 's' : '' }} · belle vitrine ! ✨
            </p>
          </div>
          <button class="btn btn-primary" [disabled]="uploading()" (click)="fileInput.click()">
            <app-icon name="plus" /> {{ uploading() ? 'Envoi…' : 'Ajouter une photo' }}
          </button>
        </div>

        <div class="photos-grid">
          @for (photo of allPhotos(); track photo.id; let i = $index) {
            <div class="photo-tile fade-up" [style.animationDelay.ms]="i * 60">
              <div class="photo-img" (click)="openLightbox(photo)">
                <img [src]="photo.url" [alt]="photo.caption || 'Photo'" />
                @if (i === 0) { <span class="photo-cover">Couverture</span> }
                <button class="photo-del" title="Retirer" (click)="deletePhoto(photo, $event)"><app-icon name="close" /></button>
                @if (photo.caption) { <span class="photo-caption">{{ photo.caption }}</span> }
              </div>
            </div>
          }
          <button class="photo-add" [disabled]="uploading()" (click)="fileInput.click()">
            <span><app-icon name="plus" /></span>
            <span style="font-weight:700;font-size:13.5px">Ajouter</span>
          </button>
        </div>
      </div>
    }

    <!-- Modale de légende -->
    @if (pendingFile()) {
      <div class="modal-overlay" (click)="cancelUpload()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div class="row" style="gap:13px">
              <span class="modal-ic"><app-icon name="camera" /></span>
              <div><h2 style="font-size:21px">Ajouter un commentaire</h2></div>
            </div>
            <button class="modal-close" (click)="cancelUpload()"><app-icon name="close" /></button>
          </div>
          <div class="modal-body">
            <p class="faint" style="font-size:13px;font-weight:600;margin-bottom:10px">Fichier : {{ pendingFile()?.name }}</p>
            <textarea class="textarea" [(ngModel)]="captionText" placeholder="Décrivez cette photo (optionnel)…"></textarea>
          </div>
          <div class="modal-foot">
            <button class="btn btn-quiet" (click)="cancelUpload()">Annuler</button>
            <button class="btn btn-primary" (click)="confirmUpload()"><app-icon name="upload" /> Envoyer</button>
          </div>
        </div>
      </div>
    }

    <!-- Lightbox -->
    @if (lightboxPhoto()) {
      <div class="modal-overlay" style="background:rgba(20,16,12,0.92)" (click)="closeLightbox()">
        <button class="modal-close" style="position:fixed;top:18px;right:18px;color:#fff;font-size:24px;z-index:90" (click)="closeLightbox()"><app-icon name="close" /></button>
        <button class="btn btn-ghost" style="position:fixed;left:18px;top:50%;transform:translateY(-50%);z-index:90" (click)="previousPhoto($event)"><app-icon name="arrowLeft" /></button>
        <img [src]="lightboxPhoto()?.url" [alt]="lightboxPhoto()?.caption || 'Photo'"
             (click)="$event.stopPropagation()"
             style="max-width:90vw;max-height:84vh;object-fit:contain;border-radius:var(--radius-sm)" />
        <button class="btn btn-ghost" style="position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:90" (click)="nextPhoto($event)"><app-icon name="arrowRight" /></button>
      </div>
    }
  `,
})
export class PhotosComponent implements OnInit {
  ficheId = input.required<string>();
  private gmbService = inject(GmbService);
  private toast = inject(ToastService);

  uploading = signal(false);
  uploadError = signal<string>('');
  drag = signal(false);
  lightboxPhoto = signal<Photo | null>(null);
  allPhotos = signal<Photo[]>([]);
  pendingFile = signal<File | null>(null);
  captionText = '';

  ngOnInit() { this.loadPhotos(); }

  private loadPhotos() {
    this.gmbService.getPhotos(this.ficheId()).subscribe({
      next: (photos) => this.allPhotos.set(photos),
      error: (err) => console.error('Erreur chargement photos:', err),
    });
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.drag.set(true); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.drag.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.queueFile(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.queueFile(input.files[0]);
    input.value = '';
  }

  private queueFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('Le fichier est trop volumineux (max 5 Mo)');
      setTimeout(() => this.uploadError.set(''), 5000);
      return;
    }
    this.captionText = '';
    this.pendingFile.set(file);
  }

  cancelUpload() { this.pendingFile.set(null); this.captionText = ''; }

  confirmUpload() {
    const file = this.pendingFile();
    if (!file) return;
    const caption = this.captionText.trim();
    this.pendingFile.set(null);
    this.uploading.set(true);
    this.uploadError.set('');

    this.gmbService.uploadPhoto(this.ficheId(), file, caption || undefined).subscribe({
      next: (photo) => {
        this.uploading.set(false);
        this.allPhotos.update(photos => [photo, ...photos]);
        this.toast.show('Photo ajoutée à votre galerie 📸');
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err.error?.error || 'Erreur lors du téléchargement');
        setTimeout(() => this.uploadError.set(''), 5000);
      },
    });
    this.captionText = '';
  }

  deletePhoto(photo: Photo, event: Event) {
    event.stopPropagation();
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return;
    this.gmbService.deletePhoto(this.ficheId(), photo.id).subscribe({
      next: () => {
        this.allPhotos.update(photos => photos.filter(p => p.id !== photo.id));
        if (this.lightboxPhoto()?.id === photo.id) this.closeLightbox();
      },
      error: (err) => { console.error('Erreur suppression photo:', err); this.toast.show('Erreur lors de la suppression'); },
    });
  }

  openLightbox(photo: Photo) { this.lightboxPhoto.set(photo); }
  closeLightbox() { this.lightboxPhoto.set(null); }

  previousPhoto(e: Event) {
    e.stopPropagation();
    const current = this.lightboxPhoto();
    if (!current) return;
    const idx = this.allPhotos().findIndex(p => p.id === current.id);
    const prev = idx > 0 ? idx - 1 : this.allPhotos().length - 1;
    this.lightboxPhoto.set(this.allPhotos()[prev]);
  }

  nextPhoto(e: Event) {
    e.stopPropagation();
    const current = this.lightboxPhoto();
    if (!current) return;
    const idx = this.allPhotos().findIndex(p => p.id === current.id);
    const next = idx < this.allPhotos().length - 1 ? idx + 1 : 0;
    this.lightboxPhoto.set(this.allPhotos()[next]);
  }
}
