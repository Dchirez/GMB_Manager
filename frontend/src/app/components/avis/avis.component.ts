import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GmbService, Avis } from '../../services/gmb.service';

@Component({
  selector: 'app-avis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow">
        <div class="max-w-3xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 class="text-3xl font-bold text-gray-900">Avis Clients</h1>
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
          <p class="text-gray-600">Chargement des avis...</p>
        </div>

        <!-- Note Moyenne -->
        <div *ngIf="!isLoading() && avis().length > 0" class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-xl font-bold text-gray-900 mb-2">Note moyenne</h2>
          <div class="flex items-center gap-3">
            <span class="text-4xl font-bold text-yellow-500">{{ getNoteMoyenne().toFixed(1) }}/5</span>
            <span class="text-gray-600">({{ avis().length }} avis)</span>
          </div>
        </div>

        <!-- Avis List -->
        <div *ngIf="!isLoading() && avis().length === 0" class="text-center py-12 bg-white rounded-lg">
          <p class="text-gray-600">Aucun avis pour cette fiche</p>
        </div>

        <div class="space-y-4">
          <div *ngFor="let avisItem of avis()" class="bg-white rounded-lg shadow-md p-6">
            <!-- Avis Header -->
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="font-bold text-gray-900">{{ avisItem.auteur }}</h3>
                <p class="text-sm text-gray-600">{{ avisItem.date }}</p>
              </div>
              <span class="text-yellow-500">{{ getStars(avisItem.note) }}</span>
            </div>

            <!-- Commentaire -->
            <p class="text-gray-700 mb-4">{{ avisItem.commentaire }}</p>

            <!-- Réponse -->
            <div *ngIf="avisItem.reponse" class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <p class="text-sm font-medium text-green-800 mb-1">Votre réponse :</p>
              <p class="text-green-700">{{ avisItem.reponse }}</p>
            </div>

            <!-- Formulaire Réponse -->
            <div *ngIf="!avisItem.reponse && replyingToId() !== avisItem.id" class="mt-4">
              <button
                (click)="startReply(avisItem.id)"
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
              >
                Répondre
              </button>
            </div>

            <div *ngIf="replyingToId() === avisItem.id" class="mt-4 space-y-3">
              <textarea
                [(ngModel)]="replyText"
                placeholder="Écrivez votre réponse..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              ></textarea>
              <div class="flex gap-2">
                <button
                  (click)="sendReply(avisItem.id)"
                  [disabled]="!replyText || isReplying()"
                  class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition"
                >
                  {{ isReplying() ? 'Envoi...' : 'Envoyer' }}
                </button>
                <button
                  (click)="cancelReply()"
                  class="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class AvisComponent implements OnInit {
  avis = signal<Avis[]>([]);
  isLoading = signal(true);
  isReplying = signal(false);
  replyingToId = signal<string | null>(null);
  replyText = '';
  ficheId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gmbService: GmbService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.ficheId = params['id'];
      this.loadAvis();
    });
  }

  loadAvis(): void {
    this.isLoading.set(true);
    this.gmbService.getAvis(this.ficheId).subscribe({
      next: (avis) => {
        this.avis.set(avis);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des avis:', error);
        this.isLoading.set(false);
      }
    });
  }

  getNoteMoyenne(): number {
    if (this.avis().length === 0) return 0;
    const sum = this.avis().reduce((acc, a) => acc + a.note, 0);
    return sum / this.avis().length;
  }

  getStars(note: number): string {
    return '★'.repeat(note) + '☆'.repeat(5 - note);
  }

  startReply(avisId: string): void {
    this.replyingToId.set(avisId);
    this.replyText = '';
  }

  cancelReply(): void {
    this.replyingToId.set(null);
    this.replyText = '';
  }

  sendReply(avisId: string): void {
    if (!this.replyText.trim()) {
      alert('Veuillez écrire une réponse');
      return;
    }

    this.isReplying.set(true);
    this.gmbService.postReponse(this.ficheId, avisId, this.replyText).subscribe({
      next: (updatedAvis) => {
        const index = this.avis().findIndex(a => a.id === avisId);
        if (index !== -1) {
          const updated = [...this.avis()];
          updated[index] = updatedAvis;
          this.avis.set(updated);
        }
        this.replyingToId.set(null);
        this.replyText = '';
        this.isReplying.set(false);
      },
      error: (error) => {
        console.error('Erreur lors de l\'envoi de la réponse:', error);
        this.isReplying.set(false);
        alert('Erreur lors de l\'envoi de la réponse');
      }
    });
  }
}
