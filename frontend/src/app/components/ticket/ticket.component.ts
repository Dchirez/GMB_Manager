import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GmbService, Fiche } from '../../services/gmb.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';

interface TicketPhoto { id: string; url: string; name: string; }

/** Formulaire de demande de modification (ticket) sur une fiche. */
@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <main class="container ticket">
      <button class="btn btn-quiet back-btn fade-up" (click)="back()">
        <app-icon name="arrowLeft" /> Retour à la fiche
      </button>

      <div class="ticket-head fade-up" style="animation-delay:40ms">
        <div class="ticket-head-ic"><app-icon name="message" /></div>
        <div class="grow">
          <h1 style="font-size:28px;line-height:1.15">Demander une modification</h1>
          <p class="muted" style="font-size:15.5px;font-weight:600;margin-top:6px;max-width:560px">
            Expliquez-nous ce que vous souhaitez modifier ou ajouter. On s'occupe de tout mettre à jour sur votre fiche Google.
          </p>
        </div>
        @if (fiche(); as f) {
          <div class="ticket-fiche">
            <span class="ticket-fiche-l">Fiche concernée</span>
            <span class="ticket-fiche-n">{{ f.nom }}</span>
            @if (f.categorie) { <span class="pill pill-muted" style="margin-top:6px">{{ f.categorie }}</span> }
          </div>
        }
      </div>

      <div class="card ticket-card fade-up" style="animation-delay:80ms">
        <!-- Type de demande -->
        <div class="tk-block">
          <h3 class="tk-label">Type de demande</h3>
          <div class="req-grid">
            @for (rt of types; track rt.id) {
              <button class="req-card" [class.active]="type() === rt.id" (click)="type.set(rt.id)">
                <span class="req-ic"><app-icon [name]="rt.icon" /></span>
                <span class="req-t">{{ rt.title }}</span>
                <span class="req-d">{{ rt.desc }}</span>
                <span class="req-check"><app-icon name="check" /></span>
              </button>
            }
          </div>
        </div>

        <!-- Éléments concernés -->
        <div class="tk-block">
          <h3 class="tk-label">Éléments concernés <span class="tk-opt">facultatif</span></h3>
          <p class="tk-help">Cochez ce qui se rapproche le plus de votre demande.</p>
          <div class="area-chips">
            @for (a of areas; track a) {
              <button class="area-chip" [class.on]="selectedAreas().includes(a)" (click)="toggleArea(a)">
                @if (selectedAreas().includes(a)) { <app-icon name="check" style="font-size:14px" /> } {{ a }}
              </button>
            }
          </div>
        </div>

        <!-- Message -->
        <div class="tk-block">
          <h3 class="tk-label">Votre message</h3>
          <textarea class="textarea tk-textarea" [class.filled]="!!message().trim()"
                    [ngModel]="message()" (ngModelChange)="message.set($event)"
                    placeholder="Ex : Mes nouveaux horaires d'été sont 8h-13h du lundi au samedi. Pouvez-vous aussi ajouter la photo de la nouvelle devanture ?"></textarea>
          <div class="tk-counter">
            <span class="tk-help" style="margin:0">Plus c'est précis, plus c'est rapide à traiter.</span>
            <span class="faint" [class.ok]="message().trim().length >= 10" style="font-size:12.5px;font-weight:700">
              {{ message().trim().length }} caractères
            </span>
          </div>
        </div>

        <!-- Photos -->
        <div class="tk-block">
          <h3 class="tk-label">Photos <span class="tk-opt">facultatif</span></h3>
          <p class="tk-help">Ajoutez une ou plusieurs images pour illustrer votre demande (devanture, erreur sur la fiche…).</p>
          <input #fileInput type="file" accept="image/*" multiple style="display:none"
                 (change)="onFilesSelected($event)" />

          @if (photos().length === 0) {
            <button type="button" class="tk-drop" [class.dragging]="drag()"
                    (click)="fileInput.click()"
                    (dragover)="onDragOver($event)" (dragleave)="drag.set(false)" (drop)="onDrop($event)">
              <span class="tk-drop-ic"><app-icon name="upload" /></span>
              <span class="tk-drop-t">Glissez vos photos ici, ou parcourez votre appareil</span>
              <span class="tk-drop-s">JPG ou PNG · 5 Mo max</span>
            </button>
          } @else {
            <div class="tk-photos"
                 (dragover)="onDragOver($event)" (dragleave)="drag.set(false)" (drop)="onDrop($event)">
              @for (p of photos(); track p.id) {
                <div class="tk-photo">
                  <img [src]="p.url" [alt]="p.name" />
                  <button type="button" class="tk-photo-del" title="Retirer cette photo" (click)="removePhoto(p.id)">
                    <app-icon name="close" />
                  </button>
                </div>
              }
              <button type="button" class="tk-addphoto" (click)="fileInput.click()">
                <app-icon name="plus" />
                <span>Ajouter</span>
              </button>
            </div>
          }
        </div>

        <!-- Urgence -->
        <div class="tk-block">
          <h3 class="tk-label">Niveau d'urgence</h3>
          <div class="seg">
            @for (u of urgencies; track u.id) {
              <button class="seg-btn" [class.on]="urgency() === u.id" [class.urgent]="u.id === 'urgent'"
                      (click)="urgency.set(u.id)">{{ u.label }}</button>
            }
          </div>
        </div>

        <!-- Contact -->
        <div class="tk-block">
          <div class="field">
            <label class="field-label">
              <app-icon name="globe" [style.color]="emailValid() ? 'var(--primary)' : 'var(--ink-faint)'" style="font-size:17px" />
              Pour vous répondre
              @if (emailValid()) { <span class="field-done"><app-icon name="check" /></span> }
            </label>
            <input class="input" [class.filled]="!!email().trim()" [ngModel]="email()" (ngModelChange)="email.set($event)" placeholder="vous@exemple.fr" />
            <span class="field-hint">Nous vous confirmons dès que la modification est en ligne.</span>
          </div>
        </div>

        <div class="form-foot">
          <span class="row faint" style="gap:8px;font-size:13.5px;font-weight:600">
            <app-icon name="clock" style="color:var(--primary)" /> Réponse sous 24-48 h ouvrées
          </span>
          <button class="btn btn-primary" [class.pay-btn]="!canSend()" [class.disabled]="!canSend()" (click)="submit()">
            <app-icon name="send" /> Envoyer la demande
          </button>
        </div>
      </div>
    </main>
  `,
})
export class TicketComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gmbService = inject(GmbService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  readonly types = [
    { id: 'modifier', icon: 'edit', title: 'Modifier une information', desc: 'Horaire, adresse, téléphone…' },
    { id: 'ajouter', icon: 'plus', title: 'Ajouter un élément', desc: 'Photo, service, nouveauté…' },
    { id: 'retirer', icon: 'close', title: 'Retirer un élément', desc: "Une info plus d'actualité" },
    { id: 'autre', icon: 'message', title: 'Autre demande', desc: 'Une question particulière' },
  ];
  readonly areas = ['Nom', 'Adresse', 'Téléphone', 'Horaires', 'Site web', 'Description', 'Photos', 'Catégorie'];
  readonly urgencies = [
    { id: 'normal', label: 'Pas pressé' },
    { id: 'important', label: 'Important' },
    { id: 'urgent', label: 'Urgent' },
  ];

  ficheId = '';
  fiche = signal<Fiche | null>(null);
  type = signal('modifier');
  selectedAreas = signal<string[]>([]);
  urgency = signal('normal');
  message = signal('');
  email = signal('');
  photos = signal<TicketPhoto[]>([]);
  drag = signal(false);

  emailValid = () => this.email().trim().length > 3 && this.email().includes('@');
  canSend = () => this.message().trim().length >= 10 && this.emailValid();

  ngOnInit() {
    this.ficheId = this.route.snapshot.params['id'];
    this.gmbService.getFiche(this.ficheId).subscribe({
      next: (f) => this.fiche.set(f),
      error: (e) => console.error('Erreur chargement fiche:', e),
    });
    this.authService.getMe().subscribe({
      next: (me: any) => { if (me?.email) this.email.set(me.email); },
      error: () => { /* laisse vide */ },
    });
  }

  ngOnDestroy() {
    this.photos().forEach(p => { try { URL.revokeObjectURL(p.url); } catch { /* ignore */ } });
  }

  toggleArea(a: string) {
    this.selectedAreas.update(list => list.includes(a) ? list.filter(x => x !== a) : [...list, a]);
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.drag.set(true); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.drag.set(false);
    this.addFiles(e.dataTransfer?.files ?? null);
  }
  onFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = '';
  }

  private addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = Array.from(list).filter(f => f.type && f.type.startsWith('image/'));
    if (!imgs.length) return;
    this.photos.update(prev => [
      ...prev,
      ...imgs.map(f => ({ id: Math.random().toString(36).slice(2), url: URL.createObjectURL(f), name: f.name })),
    ]);
  }

  removePhoto(id: string) {
    this.photos.update(prev => {
      const p = prev.find(x => x.id === id);
      if (p) { try { URL.revokeObjectURL(p.url); } catch { /* ignore */ } }
      return prev.filter(x => x.id !== id);
    });
  }

  back() { this.router.navigate(['/fiche', this.ficheId]); }

  submit() {
    if (!this.canSend()) return;
    // Pas d'endpoint backend de ticketing pour l'instant : confirmation côté front
    // (le design est volontairement front-only). À brancher sur POST /api/tickets.
    this.toast.show('Votre demande a bien été envoyée — réponse sous 24-48 h 🌿');
    this.router.navigate(['/fiche', this.ficheId]);
  }
}
