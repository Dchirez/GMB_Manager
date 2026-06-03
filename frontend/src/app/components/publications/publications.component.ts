import { Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GmbService, Publication } from '../../services/gmb.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-publications',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div [class]="embedded() ? '' : 'container'" [style.padding]="embedded() ? '0' : '28px 0 80px'">
      <div style="display:flex;flex-direction:column;gap:var(--gap)">
        <!-- Formulaire de création -->
        <div class="card fade-up">
          <h2 style="font-size:21px;margin-bottom:6px">Partagez une actualité 📣</h2>
          <p class="muted" style="font-size:14.5px;font-weight:600;margin-bottom:18px">Une promo, une nouveauté, un événement&nbsp;: donnez des nouvelles à vos clients.</p>
          <form (ngSubmit)="createPublication()" style="display:flex;flex-direction:column;gap:18px">
            <div class="field">
              <label class="field-label"><app-icon name="text" style="color:var(--ink-faint)" /> Titre</label>
              <input class="input" [(ngModel)]="newTitle" name="title" placeholder="Ex : Promotion spéciale du week-end" />
            </div>
            <div class="field">
              <label class="field-label"><app-icon name="edit" style="color:var(--ink-faint)" /> Contenu</label>
              <textarea class="textarea" [(ngModel)]="newContent" name="content" placeholder="Écrivez votre publication…"></textarea>
            </div>

            <div class="field">
              <label class="field-label"><app-icon name="camera" style="color:var(--ink-faint)" /> Photo (optionnel)</label>
              <input type="file" #fileInput (change)="onFileSelected($event)"
                     accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" style="display:none" />
              @if (!selectedFile()) {
                <button type="button" class="btn btn-ghost" style="align-self:flex-start" (click)="fileInput.click()">
                  <app-icon name="image" /> Ajouter une photo
                </button>
              } @else {
                <div style="position:relative;max-width:360px">
                  <img [src]="imagePreview()" alt="Aperçu" style="width:100%;max-height:200px;object-fit:cover;border-radius:var(--radius-sm);border:1px solid var(--border)" />
                  <button type="button" class="photo-del" style="opacity:1" (click)="removeFile()"><app-icon name="close" /></button>
                  <p class="faint" style="font-size:12.5px;margin-top:6px;font-weight:600">{{ selectedFile()?.name }}</p>
                </div>
              }
            </div>

            <button type="submit" class="btn btn-primary" style="align-self:flex-start"
                    [disabled]="!newTitle || !newContent || isCreating()">
              <app-icon name="sparkle" /> {{ isCreating() ? 'Publication en cours…' : 'Publier' }}
            </button>
          </form>
        </div>

        <!-- Liste des publications -->
        @if (isLoading()) {
          <div class="center muted" style="padding:24px 0;font-weight:600">Chargement des publications…</div>
        } @else if (publications().length === 0) {
          <div class="card center muted" style="padding:36px;font-weight:600">Aucune publication pour l'instant — lancez-vous ✨</div>
        } @else {
          @for (pub of publications(); track pub.id; let i = $index) {
            <div class="card fade-up" [style.animationDelay.ms]="i * 60">
              <div class="row" style="justify-content:space-between;gap:10px;margin-bottom:8px">
                <h3 style="font-size:18px">{{ pub.titre }}</h3>
                <span class="pill pill-primary">{{ pub.statut }}</span>
              </div>
              <p class="faint" style="font-size:13px;font-weight:600;margin-bottom:12px">{{ pub.date }}</p>
              @if (pub.image_url) {
                <img [src]="pub.image_url" [alt]="pub.titre" style="width:100%;max-height:260px;object-fit:cover;border-radius:var(--radius-sm);margin-bottom:12px" />
              }
              <p style="font-size:15px;line-height:1.6">{{ pub.contenu }}</p>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class PublicationsComponent implements OnInit {
  ficheIdInput = input<string>('', { alias: 'ficheId' });

  private route = inject(ActivatedRoute);
  private gmbService = inject(GmbService);
  private toast = inject(ToastService);

  publications = signal<Publication[]>([]);
  isLoading = signal(true);
  isCreating = signal(false);
  selectedFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  newTitle = '';
  newContent = '';
  ficheId = '';

  embedded = () => !!this.ficheIdInput();

  ngOnInit(): void {
    if (this.ficheIdInput()) {
      this.ficheId = this.ficheIdInput();
      this.loadPublications();
    } else {
      this.route.params.subscribe((p) => { this.ficheId = p['id']; this.loadPublications(); });
    }
  }

  loadPublications(): void {
    this.isLoading.set(true);
    this.gmbService.getPublications(this.ficheId).subscribe({
      next: (pubs) => { this.publications.set(pubs); this.isLoading.set(false); },
      error: (e) => { console.error('Erreur chargement publications:', e); this.isLoading.set(false); },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.toast.show('Le fichier ne doit pas dépasser 5 Mo');
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
    if (!this.newTitle.trim() || !this.newContent.trim()) return;
    this.isCreating.set(true);
    const file = this.selectedFile() ?? undefined;
    this.gmbService.createPublication(this.ficheId, this.newTitle, this.newContent, file).subscribe({
      next: (newPub) => {
        this.publications.update(list => [newPub, ...list]);
        this.newTitle = '';
        this.newContent = '';
        this.selectedFile.set(null);
        this.imagePreview.set(null);
        this.isCreating.set(false);
        this.toast.show('Publication en ligne 📣');
      },
      error: (e) => {
        console.error('Erreur création publication:', e);
        this.isCreating.set(false);
        this.toast.show('Erreur lors de la création de la publication');
      },
    });
  }
}
