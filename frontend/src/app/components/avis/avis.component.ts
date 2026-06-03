import { Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GmbService, Avis } from '../../services/gmb.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { StarsComponent } from '../../shared/stars.component';

@Component({
  selector: 'app-avis',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, StarsComponent],
  template: `
    <div [class]="embedded() ? '' : 'container'" [style.padding]="embedded() ? '0' : '28px 0 80px'">
      @if (isLoading()) {
        <div class="center muted" style="padding:48px 0;font-weight:600">Chargement des avis…</div>
      } @else {
        <div class="avis-wrap">
          <div class="card avis-banner fade-up">
            <div class="row" style="gap:18px;flex-wrap:wrap">
              <div class="avis-big">
                <span class="avis-num">{{ noteMoyenne().toFixed(1) }}</span>
                <app-stars [value]="noteMoyenne()" [size]="18" />
                <span class="faint" style="font-size:13px;font-weight:600;margin-top:4px">{{ avis().length }} avis Google</span>
              </div>
              <div class="grow" style="min-width:220px">
                <h2 style="font-size:21px;margin-bottom:6px">Vos clients vous apprécient 💛</h2>
                <p class="muted" style="font-size:14.5px;font-weight:600;line-height:1.55">
                  @if (pending() > 0) {
                    Il reste <strong style="color:var(--accent-deep)">{{ pending() }} avis sans réponse</strong>. Répondre, même brièvement, montre que vous êtes à l'écoute.
                  } @else {
                    Vous avez répondu à tous vos avis, bravo&nbsp;! C'est la meilleure façon de fidéliser. ✨
                  }
                </p>
              </div>
            </div>
          </div>

          @if (avis().length === 0) {
            <div class="card center muted" style="padding:40px;font-weight:600">Aucun avis pour cette fiche pour l'instant.</div>
          }

          <div class="reviews-list">
            @for (a of avis(); track a.id; let i = $index) {
              <div class="card fade-up" [style.animationDelay.ms]="i * 70">
                <div class="row" style="gap:13px;margin-bottom:12px">
                  <span class="review-av">{{ initials(a.auteur) }}</span>
                  <div class="grow">
                    <div class="row" style="justify-content:space-between">
                      <strong style="font-size:15.5px">{{ a.auteur }}</strong>
                      <span class="faint" style="font-size:13px;font-weight:600">{{ a.date }}</span>
                    </div>
                    <app-stars [value]="a.note" [size]="15" />
                  </div>
                </div>
                <p style="font-size:15px;line-height:1.6;color:var(--ink)">{{ a.commentaire }}</p>

                @if (a.reponse) {
                  <div class="review-reply">
                    <span class="row" style="gap:7px;font-weight:700;font-size:13px;color:var(--primary-deep);margin-bottom:5px"><app-icon name="reply" /> Votre réponse</span>
                    <p class="muted" style="font-size:14px;line-height:1.55">{{ a.reponse }}</p>
                  </div>
                } @else if (replyingToId() === a.id) {
                  <div class="review-replybox">
                    <textarea class="textarea" style="min-height:80px" [(ngModel)]="replyText"
                              placeholder="Répondez avec le sourire… un mot gentil fait toute la différence 🌿"></textarea>
                    <div class="row" style="gap:8px;margin-top:10px;justify-content:flex-end">
                      <button class="btn btn-quiet btn-sm" (click)="cancelReply()">Annuler</button>
                      <button class="btn btn-primary btn-sm" [disabled]="isReplying()" (click)="sendReply(a.id)"><app-icon name="check" /> Publier</button>
                    </div>
                  </div>
                } @else {
                  <button class="btn btn-soft btn-sm" style="margin-top:14px" (click)="startReply(a.id)"><app-icon name="reply" /> Répondre</button>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class AvisComponent implements OnInit {
  /** Fourni quand le composant est intégré dans un onglet (sinon lu depuis la route). */
  ficheIdInput = input<string>('', { alias: 'ficheId' });

  private route = inject(ActivatedRoute);
  private gmbService = inject(GmbService);
  private toast = inject(ToastService);

  avis = signal<Avis[]>([]);
  isLoading = signal(true);
  isReplying = signal(false);
  replyingToId = signal<string | null>(null);
  replyText = '';
  ficheId = '';

  embedded = () => !!this.ficheIdInput();
  noteMoyenne = () => this.avis().length ? this.avis().reduce((s, a) => s + a.note, 0) / this.avis().length : 0;
  pending = () => this.avis().filter(a => !a.reponse).length;

  ngOnInit(): void {
    if (this.ficheIdInput()) {
      this.ficheId = this.ficheIdInput();
      this.loadAvis();
    } else {
      this.route.params.subscribe((p) => { this.ficheId = p['id']; this.loadAvis(); });
    }
  }

  loadAvis(): void {
    this.isLoading.set(true);
    this.gmbService.getAvis(this.ficheId).subscribe({
      next: (avis) => { this.avis.set(avis); this.isLoading.set(false); },
      error: (e) => { console.error('Erreur chargement avis:', e); this.isLoading.set(false); },
    });
  }

  initials(author: string): string {
    const p = (author || '').trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '🙂';
  }

  startReply(id: string) { this.replyingToId.set(id); this.replyText = ''; }
  cancelReply() { this.replyingToId.set(null); this.replyText = ''; }

  sendReply(id: string) {
    if (!this.replyText.trim()) return;
    this.isReplying.set(true);
    this.gmbService.postReponse(this.ficheId, id, this.replyText).subscribe({
      next: (updated) => {
        this.avis.update(list => list.map(a => a.id === id ? updated : a));
        this.replyingToId.set(null);
        this.replyText = '';
        this.isReplying.set(false);
        this.toast.show('Réponse publiée, merci pour votre attention 🙏');
      },
      error: (e) => { console.error('Erreur réponse:', e); this.isReplying.set(false); },
    });
  }
}
