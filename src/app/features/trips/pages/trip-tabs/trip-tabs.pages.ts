import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';
import { TripStore } from '../../../../core/services/trip.store';
import { InrCurrencyPipe } from '../../../../shared/pipes/format.pipe';
import { AvailabilityOption, DestinationOption, TripMember } from '../../../../core/models/trip.model';
import { ApiItineraryItem, CreateBookingType, ExpenseCategory } from '../../../../core/services/trip-api.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { bookingImageUrl } from '../../../../core/constants/booking-images';
import { destinationImageUrl } from '../../../../core/constants/destination-images';

function tripIdFromParent(route: ActivatedRoute) {
  return toSignal(route.parent!.paramMap.pipe(map((p) => p.get('tripId') || '')), {
    initialValue: '',
  });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatShortDate(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function dayPillLabel(date: string, index: number): string {
  const d = new Date(`${date}T12:00:00`);
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
  return `Day ${index + 1} · ${weekday}`;
}

function rangeLabel(start: string, end: string): string {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const sameMonth = s.getMonth() === e.getMonth();
  const day = (d: Date) => d.getDate();
  const mon = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short' });
  return sameMonth
    ? `${day(s)}–${day(e)} ${mon(s)}`
    : `${day(s)} ${mon(s)} – ${day(e)} ${mon(e)}`;
}

type AvailVote = 'available' | 'maybe' | 'not';

@Component({
  selector: 'app-trip-overview',
  standalone: true,
  imports: [MatIconModule, RouterLink, InrCurrencyPipe, FormsModule, ButtonComponent],
  template: `
    @if (trip(); as t) {
      <div class="layout">
        <div class="main">
          <div class="head">
            <h2>Trip summary</h2>
            <app-button variant="secondary" size="sm" (click)="showEdit.set(!showEdit())">
              {{ showEdit() ? 'Cancel' : 'Edit trip' }}
            </app-button>
          </div>

          @if (showEdit()) {
            <form class="th-panel edit-form" (ngSubmit)="saveEdit()">
              <label>
                Title
                <input type="text" required [(ngModel)]="editTitle" name="editTitle" />
              </label>
              <label>
                Destination
                <input type="text" [(ngModel)]="editDestination" name="editDestination" />
              </label>
              <label>
                Origin
                <input type="text" [(ngModel)]="editOrigin" name="editOrigin" />
              </label>
              <label>
                Start
                <input type="date" [(ngModel)]="editStart" name="editStart" />
              </label>
              <label>
                End
                <input type="date" [(ngModel)]="editEnd" name="editEnd" />
              </label>
              <label>
                Budget (₹)
                <input type="number" min="0" [(ngModel)]="editBudget" name="editBudget" />
              </label>
              <label class="wide">
                Description
                <textarea rows="3" [(ngModel)]="editDescription" name="editDescription"></textarea>
              </label>
              <app-button type="submit" [loading]="saving()">Save changes</app-button>
              @if (editError()) {
                <p class="add-error">{{ editError() }}</p>
              }
            </form>
          }

          <div class="stats">
            <article class="th-panel card">
              <span class="label">Estimated budget</span>
              <strong>{{ t.estimatedBudget | inr: t.currency }}</strong>
            </article>
            <article class="th-panel card">
              <span class="label">Actual spend so far</span>
              <strong>{{ t.actualBudget | inr: t.currency }}</strong>
            </article>
            <article class="th-panel card">
              <span class="label">Approval status</span>
              <strong class="approve">{{ approvalLabel(t.approvalStatus) }}</strong>
            </article>
            <article class="th-panel card">
              <span class="label">Next activity</span>
              <strong>{{ nextActivity() }}</strong>
            </article>
          </div>

          @if (pendingTripApprovals().length) {
            <article class="th-panel approvals">
              <span class="label">Pending approvals</span>
              @for (a of pendingTripApprovals(); track a.id) {
                <div class="approval-row">
                  <div>
                    <strong>{{ a.tripName }}</strong>
                    <small>Requested by {{ a.requestedByName }}</small>
                  </div>
                  <div class="approval-actions">
                    <app-button size="sm" (click)="review(a.id, 'APPROVED')">Approve</app-button>
                    <app-button variant="secondary" size="sm" (click)="review(a.id, 'REJECTED')"
                      >Reject</app-button
                    >
                  </div>
                </div>
              }
            </article>
          }

          <article class="th-panel comments">
            <span class="label">Comments</span>
            <ul class="comment-list">
              @for (c of comments(); track c.id) {
                <li>
                  <div>
                    <strong>{{ c.authorName }}</strong>
                    <small>{{ formatWhen(c.createdAt) }}</small>
                    <p>{{ c.body }}</p>
                  </div>
                  @if (canDeleteComment(c.authorId)) {
                    <app-button variant="link-danger" size="sm" (click)="removeComment(c.id)"
                      >Delete</app-button
                    >
                  }
                </li>
              } @empty {
                <li class="empty">No comments yet — start the discussion.</li>
              }
            </ul>
            <form class="comment-form" (ngSubmit)="postComment()">
              <input
                type="text"
                required
                [(ngModel)]="commentBody"
                name="commentBody"
                placeholder="Write a comment…"
              />
              <app-button type="submit" size="sm" [loading]="postingComment()">Post</app-button>
            </form>
            @if (commentError()) {
              <p class="add-error">{{ commentError() }}</p>
            }
          </article>
        </div>
        <aside class="side">
          <article class="th-panel countdown">
            <span class="label">Countdown</span>
            <strong>{{ daysUntil() }} days</strong>
            <p>until departure from {{ t.origin || 'origin' }}</p>
          </article>
          <nav class="th-panel links">
            <span class="label">Quick links</span>
            <a routerLink="../members">
              <span><mat-icon>group</mat-icon> Members</span>
              <mat-icon>chevron_right</mat-icon>
            </a>
            <a routerLink="../itinerary">
              <span><mat-icon>map</mat-icon> Itinerary</span>
              <mat-icon>chevron_right</mat-icon>
            </a>
            <a routerLink="../budget">
              <span><mat-icon>account_balance_wallet</mat-icon> Budget</span>
              <mat-icon>chevron_right</mat-icon>
            </a>
          </nav>
        </aside>
      </div>
    }
  `,
  styles: [
    `
      .layout {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr;
      }
      @media (min-width: 960px) {
        .layout {
          grid-template-columns: minmax(0, 1.6fr) minmax(240px, 0.9fr);
          align-items: start;
        }
      }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      h2 {
        margin: 0;
        font-family: var(--th-font-display);
        font-size: 1.35rem;
      }
      .edit-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .edit-form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: var(--th-text-secondary);
      }
      .edit-form label.wide {
        grid-column: 1 / -1;
      }
      .edit-form input,
      .edit-form textarea {
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
        color: var(--th-text);
      }
      .add-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        grid-column: 1 / -1;
      }
      .stats {
        display: grid;
        gap: 0.85rem;
        grid-template-columns: 1fr;
        margin-bottom: 0.85rem;
      }
      @media (min-width: 600px) {
        .stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      .label {
        display: block;
        margin-bottom: 0.45rem;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--th-primary-light);
      }
      .card strong {
        font-size: 1.2rem;
        font-weight: 700;
      }
      .approve {
        color: var(--th-success);
      }
      .approvals {
        margin-bottom: 0.85rem;
      }
      .approval-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        padding: 0.5rem 0;
      }
      .approval-row small {
        display: block;
        color: var(--th-text-muted);
      }
      .approval-actions {
        display: flex;
        gap: 0.5rem;
      }
      .comments {
        margin-top: 0.25rem;
      }
      .comment-list {
        list-style: none;
        margin: 0 0 0.85rem;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }
      .comment-list li {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: flex-start;
        padding-bottom: 0.65rem;
        border-bottom: 1px solid var(--th-border);
      }
      .comment-list li:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      .comment-list li.empty {
        color: var(--th-text-muted);
        border-bottom: 0;
      }
      .comment-list strong {
        display: block;
      }
      .comment-list small {
        color: var(--th-text-muted);
        font-size: 0.75rem;
      }
      .comment-list p {
        margin: 0.35rem 0 0;
        color: var(--th-text);
        line-height: 1.4;
      }
      .comment-form {
        display: flex;
        gap: 0.5rem;
      }
      .comment-form input {
        flex: 1;
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
        color: var(--th-text);
      }
      .countdown {
        text-align: center;
        padding: 1.75rem 1.25rem;
        margin-bottom: 0.85rem;
        background: linear-gradient(
          160deg,
          color-mix(in srgb, var(--th-primary) 28%, var(--th-surface)),
          var(--th-surface)
        );
      }
      .countdown strong {
        display: block;
        font-family: var(--th-font-display);
        font-size: 2.6rem;
        line-height: 1.1;
        margin: 0.25rem 0;
      }
      .countdown p {
        margin: 0;
        color: var(--th-text-secondary);
      }
      .links {
        display: grid;
        gap: 0.35rem;
      }
      .links a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.65rem 0.35rem;
        border-bottom: 1px solid var(--th-border);
        color: var(--th-text);
        text-decoration: none;
      }
      .links a:last-of-type {
        border-bottom: 0;
      }
      .links a span {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .links mat-icon {
        font-size: 1.15rem;
        width: 1.15rem;
        height: 1.15rem;
        color: var(--th-primary-light);
      }
    `,
  ],
})
export class TripOverviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly auth = inject(AuthService);
  private readonly tripId = tripIdFromParent(this.route);
  readonly trip = computed(() => this.store.getById(this.tripId()));
  readonly pendingTripApprovals = computed(() =>
    this.store.getApprovals(this.tripId()).filter((a) => a.status === 'PENDING'),
  );
  readonly comments = computed(() => this.store.getComments(this.tripId()));

  readonly showEdit = signal(false);
  readonly saving = signal(false);
  readonly editError = signal('');
  readonly commentBody = signal('');
  readonly postingComment = signal(false);
  readonly commentError = signal('');
  editTitle = '';
  editDestination = '';
  editOrigin = '';
  editStart = '';
  editEnd = '';
  editBudget: number | null = null;
  editDescription = '';

  constructor() {
    effect(() => {
      const id = this.tripId();
      if (id) {
        void this.store.loadItinerary(id);
        void this.store.loadApprovals(id);
        void this.store.loadComments(id);
      }
      const t = this.trip();
      if (t) {
        this.editTitle = t.title;
        this.editDestination = t.destination;
        this.editOrigin = t.origin;
        this.editStart = t.startDate ?? '';
        this.editEnd = t.endDate ?? '';
        this.editBudget = t.estimatedBudget;
        this.editDescription = t.description;
      }
    });
  }

  readonly daysUntil = computed(() => {
    const start = this.trip()?.startDate;
    if (!start) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dep = new Date(`${start}T00:00:00`);
    return Math.max(0, Math.ceil((dep.getTime() - today.getTime()) / 86400000));
  });

  readonly nextActivity = computed(() => {
    const days = this.store.getItinerary(this.tripId());
    const hotel = days.flatMap((d) => d.items).find((i) => i.type === 'HOTEL');
    if (hotel) {
      const day = days.find((d) => d.id === hotel.dayId);
      const datePart = day ? formatShortDate(day.date) : '';
      return `${hotel.title} · ${datePart}, ${formatTime(hotel.startTime)}`;
    }
    const first = days[0]?.items[0];
    return first ? first.title : 'TBD';
  });

  approvalLabel(status: string) {
    return status
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatWhen = formatDateTime;

  canDeleteComment(authorId: string): boolean {
    return this.auth.user()?.id === authorId;
  }

  async postComment(): Promise<void> {
    const id = this.tripId();
    const body = this.commentBody().trim();
    if (!id || !body) return;
    this.postingComment.set(true);
    this.commentError.set('');
    try {
      await this.store.addComment(id, { body });
      this.commentBody.set('');
    } catch {
      this.commentError.set('Could not post that comment.');
    } finally {
      this.postingComment.set(false);
    }
  }

  removeComment(commentId: string): void {
    const id = this.tripId();
    if (id) void this.store.deleteComment(id, commentId);
  }

  async saveEdit(): Promise<void> {
    const id = this.tripId();
    if (!id || !this.editTitle.trim()) return;
    this.saving.set(true);
    this.editError.set('');
    try {
      await this.store.updateTrip(id, {
        name: this.editTitle.trim(),
        destination: this.editDestination.trim(),
        origin: this.editOrigin.trim(),
        startDate: this.editStart || null,
        endDate: this.editEnd || null,
        budgetCents: Math.round((this.editBudget ?? 0) * 100),
        description: this.editDescription.trim(),
      });
      this.showEdit.set(false);
    } catch {
      this.editError.set('Could not save trip changes.');
    } finally {
      this.saving.set(false);
    }
  }

  review(approvalId: string, status: 'APPROVED' | 'REJECTED'): void {
    void this.store.reviewApproval(approvalId, status, this.tripId());
  }
}

@Component({
  selector: 'app-trip-members',
  standalone: true,
  imports: [MatIconModule, FormsModule, ButtonComponent],
  template: `
    <div class="head">
      <div>
        <h2>Members</h2>
        <p class="meta">
          {{ stats().accepted }} accepted · {{ stats().invited }} invited ·
          {{ stats().declined }} declined
        </p>
      </div>
      @if (isOwner()) {
        <app-button variant="secondary" (click)="showInviteForm.set(!showInviteForm())">
          Invite members +
        </app-button>
      }
    </div>

    @if (showInviteForm()) {
      <form class="th-panel invite-form" (ngSubmit)="sendInvite()">
        <label>
          Email of a registered teammate
          <input type="email" required [(ngModel)]="inviteEmail" name="inviteEmail" placeholder="name@company.com" />
        </label>
        <p class="invite-hint">
          They must already have a Trip Hunter account with this email. After you send, they get an
          in-app notification and can Accept/Decline from Notifications, Dashboard, or this Members tab.
        </p>
        <app-button type="submit" [loading]="inviting()">Send invite</app-button>
        @if (inviteError()) {
          <p class="invite-error">{{ inviteError() }}</p>
        }
      </form>
    }

    @if (myPendingInvite(); as mine) {
      <div class="th-panel invite-banner">
        <span>You've been invited to this trip as {{ mine.role.toLowerCase() }}.</span>
        <div class="invite-actions">
          <app-button size="sm" (click)="respond('accepted')">Accept</app-button>
          <app-button variant="secondary" size="sm" (click)="respond('declined')">Decline</app-button>
        </div>
      </div>
    }

    <div class="th-panel table-wrap desktop">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Attendance</th>
            @if (isOwner()) {
              <th></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (m of members(); track m.id) {
            <tr>
              <td>
                <div class="who">
                  <span class="avatar">{{ initials(m.name) }}</span>
                  <div>
                    <strong>{{ m.name }}</strong>
                    <small>{{ m.email }}</small>
                  </div>
                </div>
              </td>
              <td class="cap">{{ m.role.toLowerCase() }}</td>
              <td>
                <em
                  class="th-pill"
                  [class.th-pill--solid]="m.inviteStatus === 'ACCEPTED'"
                  [class.th-pill--outline]="m.inviteStatus === 'INVITED' || m.inviteStatus === 'MAYBE'"
                  [class.th-pill--muted]="m.inviteStatus === 'DECLINED'"
                  >{{ statusLabel(m.inviteStatus) }}</em
                >
              </td>
              <td>{{ attendanceLabel(m) }}</td>
              @if (isOwner()) {
                <td>
                  @if (canRemove(m)) {
                    <app-button variant="link-danger" size="sm" (click)="remove(m.id)">Remove</app-button>
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="isOwner() ? 5 : 4">No members yet.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <ul class="mobile list">
      @for (m of members(); track m.id) {
        <li class="th-panel">
          <div class="who">
            <span class="avatar">{{ initials(m.name) }}</span>
            <div>
              <strong>{{ m.name }}</strong>
              <small>{{ m.role.toLowerCase() }} · {{ attendanceLabel(m) }}</small>
            </div>
          </div>
          <div class="mobile-actions">
            <em
              class="th-pill"
              [class.th-pill--solid]="m.inviteStatus === 'ACCEPTED'"
              [class.th-pill--outline]="m.inviteStatus === 'INVITED' || m.inviteStatus === 'MAYBE'"
              [class.th-pill--muted]="m.inviteStatus === 'DECLINED'"
              >{{ statusLabel(m.inviteStatus) }}</em
            >
            @if (isOwner() && canRemove(m)) {
              <app-button variant="link-danger" size="sm" (click)="remove(m.id)">Remove</app-button>
            }
          </div>
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .head {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 1rem;
      }
      h2 {
        margin: 0;
        font-family: var(--th-font-display);
      }
      .meta {
        margin: 0.25rem 0 0;
        color: var(--th-text-secondary);
        font-size: 0.9rem;
      }
      .outline-btn {
        background: transparent;
        color: var(--th-primary-light);
        border: 1px solid var(--th-primary);
        border-radius: 999px;
        padding: 0.55rem 1rem;
        font-weight: 650;
        cursor: pointer;
      }
      .invite-form {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .invite-form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: var(--th-text-secondary);
        flex: 1;
        min-width: 220px;
      }
      .invite-form input {
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
      }
      .invite-hint {
        flex-basis: 100%;
        margin: 0;
        font-size: 0.82rem;
        color: var(--th-text-muted);
      }
      .invite-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        flex-basis: 100%;
      }
      .invite-banner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 1rem;
        border-color: var(--th-primary);
      }
      .invite-actions {
        display: flex;
        gap: 0.5rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        text-align: left;
        font-size: 0.68rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--th-primary-light);
        padding: 0.35rem 0.5rem 0.85rem;
        border-bottom: 1px solid var(--th-border);
      }
      td {
        padding: 0.85rem 0.5rem;
        border-bottom: 1px solid var(--th-border);
        vertical-align: middle;
      }
      tr:last-child td {
        border-bottom: 0;
      }
      .who {
        display: flex;
        gap: 0.7rem;
        align-items: center;
      }
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: color-mix(in srgb, var(--th-primary) 28%, var(--th-surface));
        color: var(--th-primary-light);
        font-size: 0.75rem;
        font-weight: 700;
        flex-shrink: 0;
      }
      strong {
        display: block;
      }
      small {
        color: var(--th-text-muted);
        font-size: 0.78rem;
      }
      .cap {
        text-transform: capitalize;
        color: var(--th-text-secondary);
      }
      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: none;
        gap: 0.75rem;
      }
      .list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
      }
      .mobile-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.35rem;
      }
      .desktop {
        display: block;
      }
      @media (max-width: 759px) {
        .desktop {
          display: none;
        }
        .list {
          display: grid;
        }
      }
    `,
  ],
})
export class TripMembersPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly auth = inject(AuthService);
  private readonly tripId = tripIdFromParent(this.route);
  readonly members = computed(() => this.store.getMembers(this.tripId()));
  readonly isOwner = computed(() => {
    const trip = this.store.getById(this.tripId());
    const userId = this.auth.user()?.id;
    return !!trip && !!userId && trip.organizerId === userId;
  });
  readonly myPendingInvite = computed(() => {
    const userId = this.auth.user()?.id;
    if (!userId) return undefined;
    return this.members().find(
      (m) => m.userId === userId && (m.inviteStatus === 'INVITED' || m.inviteStatus === 'MAYBE'),
    );
  });

  readonly showInviteForm = signal(false);
  readonly inviteEmail = signal('');
  readonly inviting = signal(false);
  readonly inviteError = signal('');

  constructor() {
    effect(() => {
      const id = this.tripId();
      if (id) void this.store.loadMembers(id);
    });
  }

  async sendInvite(): Promise<void> {
    const email = this.inviteEmail().trim();
    const id = this.tripId();
    if (!email || !id) return;
    this.inviting.set(true);
    this.inviteError.set('');
    try {
      await this.store.inviteMember(id, email);
      this.inviteEmail.set('');
      this.showInviteForm.set(false);
    } catch {
      this.inviteError.set('Could not invite that email. Make sure they already have an account.');
    } finally {
      this.inviting.set(false);
    }
  }

  respond(rsvpStatus: 'accepted' | 'declined'): void {
    const id = this.tripId();
    if (id) void this.store.respondToInvite(id, rsvpStatus);
  }

  canRemove(m: TripMember): boolean {
    const trip = this.store.getById(this.tripId());
    return !!trip && m.userId !== trip.organizerId;
  }

  remove(memberId: string): void {
    const id = this.tripId();
    if (id && confirm('Remove this member from the trip?')) {
      void this.store.removeMember(id, memberId);
    }
  }

  readonly stats = computed(() => {
    const list = this.members();
    return {
      accepted: list.filter((m) => m.inviteStatus === 'ACCEPTED').length,
      invited: list.filter((m) => m.inviteStatus === 'INVITED' || m.inviteStatus === 'MAYBE').length,
      declined: list.filter((m) => m.inviteStatus === 'DECLINED').length,
    };
  });
  initials = initials;
  statusLabel(s: string) {
    return s.charAt(0) + s.slice(1).toLowerCase();
  }
  attendanceLabel(m: TripMember) {
    if (m.attendanceStatus === 'CONFIRMED') return 'Going';
    if (m.attendanceStatus === 'DECLINED') return 'Not going';
    return '—';
  }
}

@Component({
  selector: 'app-trip-voting',
  standalone: true,
  imports: [MatIconModule, InrCurrencyPipe, FormsModule, ButtonComponent],
  template: `
    <div class="subtabs">
      <button type="button" [class.active]="tab() === 'availability'" (click)="tab.set('availability')">
        Availability
      </button>
      <button type="button" [class.active]="tab() === 'destination'" (click)="tab.set('destination')">
        Destination
      </button>
    </div>

    @if (tab() === 'availability') {
      <div class="head">
        <div>
          <h2>When should we go?</h2>
          <p class="meta">Add date ranges, then vote Available / Maybe / Not</p>
        </div>
        <app-button variant="secondary" (click)="showAvailForm.set(!showAvailForm())">
          Add dates +
        </app-button>
      </div>

      @if (showAvailForm()) {
        <form class="th-panel add-form" (ngSubmit)="submitAvail()">
          <label>
            Starts
            <input type="date" required [(ngModel)]="availStart" name="availStart" />
          </label>
          <label>
            Ends
            <input type="date" required [(ngModel)]="availEnd" name="availEnd" />
          </label>
          <app-button type="submit" [loading]="addingAvail()">Add range</app-button>
          @if (availError()) {
            <p class="add-error">{{ availError() }}</p>
          }
        </form>
      }

      <div class="options">
        @for (opt of availability(); track opt.id) {
          <article class="th-panel opt" [class.leading]="isLeadingAvail(opt)">
            <div class="opt-top">
              <strong>{{ rangeLabel(opt.startDate, opt.endDate) }}</strong>
              @if (isLeadingAvail(opt)) {
                <em class="th-pill th-pill--solid">Leading</em>
              }
            </div>
            <p class="meta">
              {{ opt.availableCount }}/{{ opt.totalVotes || '—' }} available
              @if (!opt.totalVotes) {
                <span>· no votes yet</span>
              }
            </p>
            <div class="bar">
              <i [style.width.%]="availPct(opt)"></i>
            </div>
            <div class="chips">
              <span class="chip-label">Your response</span>
              <button
                type="button"
                class="chip"
                [class.on]="availVote()[opt.id] === 'available'"
                (click)="setAvail(opt.id, 'available')"
              >
                Available
              </button>
              <button
                type="button"
                class="chip"
                [class.on]="availVote()[opt.id] === 'maybe'"
                (click)="setAvail(opt.id, 'maybe')"
              >
                Maybe
              </button>
              <button
                type="button"
                class="chip"
                [class.on]="availVote()[opt.id] === 'not'"
                (click)="setAvail(opt.id, 'not')"
              >
                Not available
              </button>
            </div>
          </article>
        } @empty {
          <div class="th-panel empty">No date options yet — add a range to start the poll.</div>
        }
      </div>
    } @else {
      <div class="head">
        <div>
          <h2>Where should we go?</h2>
          <p class="meta">Photo cards with place + city — vote for your favorite</p>
        </div>
        <app-button variant="secondary" (click)="showDestForm.set(!showDestForm())">
          Add place +
        </app-button>
      </div>

      @if (showDestForm()) {
        <form class="th-panel add-form" (ngSubmit)="submitDest()">
          <label>
            Place
            <input
              type="text"
              required
              [(ngModel)]="destName"
              name="destName"
              placeholder="North Goa"
            />
          </label>
          <label>
            City / region
            <input type="text" [(ngModel)]="destCity" name="destCity" placeholder="Goa" />
          </label>
          <label>
            Country
            <input type="text" [(ngModel)]="destCountry" name="destCountry" placeholder="India" />
          </label>
          <label>
            Est. cost / person
            <input type="number" min="0" step="100" [(ngModel)]="destCost" name="destCost" />
          </label>
          <label class="wide">
            Photo URL <span class="hint">(optional — we pick a matching place photo)</span>
            <input
              type="url"
              [(ngModel)]="destImageUrl"
              name="destImageUrl"
              placeholder="https://…"
            />
          </label>
          <label class="wide">
            Why this place?
            <input
              type="text"
              [(ngModel)]="destDescription"
              name="destDescription"
              placeholder="Beaches and easy flights"
            />
          </label>
          <app-button type="submit" [loading]="addingDest()">Add destination</app-button>
          @if (destError()) {
            <p class="add-error">{{ destError() }}</p>
          }
        </form>
      }

      <div class="dest-grid">
        @for (d of destinations(); track d.id) {
          <article class="dest-card" [class.leading]="isLeadingDest(d)">
            <div
              class="dest-photo"
              [style.--dest-image]="'url(' + imageFor(d) + ')'"
            >
              @if (isLeadingDest(d)) {
                <em class="th-pill th-pill--solid leading-pill">Leading</em>
              }
              <div class="dest-overlay">
                <div class="dest-copy">
                  <h3>{{ d.destinationName }}</h3>
                  <p class="place">
                    {{ placeLine(d) }}
                  </p>
                  <p class="votes">{{ d.voteCount }} votes · ~{{ d.estimatedCost | inr }}/person</p>
                </div>
                <button
                  type="button"
                  class="vote-btn"
                  [class.voted]="destVote() === d.id"
                  (click)="setDest(d.id); $event.stopPropagation()"
                >
                  {{ destVote() === d.id ? '✓ Your vote' : 'Vote' }}
                </button>
              </div>
            </div>
          </article>
        } @empty {
          <div class="th-panel empty">No destination options yet — add a place to start voting.</div>
        }
      </div>
    }
  `,
  styles: [
    `
      .subtabs {
        display: inline-flex;
        gap: 0.35rem;
        padding: 0.25rem;
        border-radius: 999px;
        background: var(--th-surface-muted);
        margin-bottom: 1rem;
      }
      .subtabs button {
        border: 0;
        background: transparent;
        color: var(--th-text-secondary);
        padding: 0.45rem 0.95rem;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 650;
      }
      .subtabs button.active {
        background: var(--th-primary);
        color: white;
      }
      .head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: flex-end;
        margin-bottom: 1rem;
      }
      h2 {
        margin: 0;
        font-family: var(--th-font-display);
      }
      .meta {
        margin: 0.3rem 0 0;
        color: var(--th-text-muted);
        font-size: 0.85rem;
      }
      .add-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .add-form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: var(--th-text-secondary);
      }
      .add-form label.wide {
        grid-column: 1 / -1;
      }
      .add-form .hint {
        font-weight: 500;
        color: var(--th-text-muted);
        font-size: 0.75rem;
      }
      .add-form input {
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
      }
      .add-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        grid-column: 1 / -1;
      }
      .empty {
        color: var(--th-text-secondary);
      }
      .options {
        display: grid;
        gap: 0.85rem;
      }
      .opt-top {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        align-items: center;
      }
      .bar {
        height: 8px;
        background: var(--th-surface-muted);
        border-radius: 999px;
        overflow: hidden;
        margin: 0.65rem 0;
      }
      .bar i {
        display: block;
        height: 100%;
        background: var(--th-primary);
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        align-items: center;
      }
      .chip-label {
        width: 100%;
        font-size: 0.68rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--th-primary-light);
        font-weight: 700;
      }
      .chip {
        border: 1px solid var(--th-border-strong);
        background: transparent;
        color: var(--th-text-secondary);
        border-radius: 999px;
        padding: 0.35rem 0.75rem;
        cursor: pointer;
        font-size: 0.82rem;
      }
      .chip.on {
        background: var(--th-primary);
        border-color: var(--th-primary);
        color: white;
      }
      .dest-grid {
        display: grid;
        gap: 0.95rem;
        grid-template-columns: 1fr;
      }
      @media (min-width: 700px) {
        .dest-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      .dest-card {
        position: relative;
        border-radius: calc(var(--th-radius) + 4px);
        overflow: hidden;
        min-height: 280px;
        box-shadow: var(--th-shadow);
        transition:
          transform 0.28s ease,
          box-shadow 0.28s ease;
      }
      .dest-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
      }
      .dest-card.leading {
        outline: 2px solid color-mix(in srgb, var(--th-primary) 70%, white);
      }
      .dest-photo {
        position: relative;
        min-height: 280px;
        height: 100%;
        background:
          linear-gradient(180deg, rgba(15, 23, 42, 0.05) 20%, rgba(15, 23, 42, 0.78) 100%),
          var(--dest-image) center/cover no-repeat;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .leading-pill {
        position: absolute;
        top: 0.85rem;
        left: 0.85rem;
        z-index: 1;
      }
      .dest-overlay {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1.15rem 1.1rem 1.15rem;
        color: #fff;
      }
      .dest-copy h3 {
        margin: 0;
        font-family: var(--th-font-display);
        font-size: 1.45rem;
        letter-spacing: -0.02em;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
      }
      .dest-copy .place {
        margin: 0.2rem 0 0;
        font-size: 0.95rem;
        font-weight: 600;
        opacity: 0.95;
      }
      .dest-copy .votes {
        margin: 0.35rem 0 0;
        font-size: 0.82rem;
        opacity: 0.85;
      }
      .vote-btn {
        align-self: stretch;
        border: 1px solid rgba(255, 255, 255, 0.55);
        background: rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(10px);
        color: #fff;
        border-radius: 999px;
        padding: 0.6rem;
        font-weight: 700;
        cursor: pointer;
        transition:
          background 0.2s ease,
          border-color 0.2s ease;
      }
      .vote-btn:hover {
        background: rgba(255, 255, 255, 0.28);
      }
      .vote-btn.voted {
        background: var(--th-primary);
        border-color: var(--th-primary);
      }
      .leading .opt,
      .opt.leading {
        border-color: color-mix(in srgb, var(--th-primary) 55%, var(--th-border));
        box-shadow: 0 12px 28px rgba(15, 118, 110, 0.12);
      }
    `,
  ],
})
export class TripVotingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = tripIdFromParent(this.route);
  readonly tab = signal<'availability' | 'destination'>('availability');
  readonly availability = computed(() => this.store.getAvailability(this.tripId()));
  readonly destinations = computed(() => this.store.getDestinations(this.tripId()));
  readonly availVote = computed(() => this.store.getMyVotes(this.tripId()).availability as Record<string, AvailVote>);
  readonly destVote = computed(() => this.store.getMyVotes(this.tripId()).destinationId);
  rangeLabel = rangeLabel;
  imageFor = destinationImageUrl;

  readonly showAvailForm = signal(false);
  readonly availStart = signal('');
  readonly availEnd = signal('');
  readonly addingAvail = signal(false);
  readonly availError = signal('');

  readonly showDestForm = signal(false);
  readonly destName = signal('');
  readonly destCity = signal('');
  readonly destCountry = signal('India');
  readonly destCost = signal<number | null>(null);
  readonly destImageUrl = signal('');
  readonly destDescription = signal('');
  readonly addingDest = signal(false);
  readonly destError = signal('');

  constructor() {
    effect(() => {
      const id = this.tripId();
      if (id) {
        void this.store.loadAvailability(id);
        void this.store.loadDestinations(id);
        void this.store.loadMyVotes(id);
      }
    });
  }

  placeLine(d: DestinationOption): string {
    const parts = [d.city, d.country].map((p) => p?.trim()).filter(Boolean);
    return parts.length ? parts.join(', ') : 'Suggested destination';
  }

  setAvail(optionId: string, vote: AvailVote) {
    const id = this.tripId();
    if (id) void this.store.castAvailabilityVote(id, optionId, vote);
  }

  setDest(destId: string) {
    const id = this.tripId();
    if (id) void this.store.castDestinationVote(id, destId);
  }

  async submitAvail(): Promise<void> {
    const id = this.tripId();
    const startDate = this.availStart().trim();
    const endDate = this.availEnd().trim();
    if (!id || !startDate || !endDate) return;

    this.addingAvail.set(true);
    this.availError.set('');
    try {
      await this.store.addAvailabilityOption(id, { startDate, endDate });
      this.availStart.set('');
      this.availEnd.set('');
      this.showAvailForm.set(false);
    } catch {
      this.availError.set('Could not add that date range. Apply migration 011 if this is a new poll.');
    } finally {
      this.addingAvail.set(false);
    }
  }

  async submitDest(): Promise<void> {
    const id = this.tripId();
    const destinationName = this.destName().trim();
    if (!id || !destinationName) return;

    this.addingDest.set(true);
    this.destError.set('');
    try {
      await this.store.addDestination(id, {
        destinationName,
        city: this.destCity().trim(),
        country: this.destCountry().trim() || 'India',
        description: this.destDescription().trim(),
        estimatedCost: this.destCost() ?? 0,
        imageUrl: this.destImageUrl().trim() || undefined,
      });
      this.destName.set('');
      this.destCity.set('');
      this.destCost.set(null);
      this.destImageUrl.set('');
      this.destDescription.set('');
      this.showDestForm.set(false);
    } catch {
      this.destError.set('Could not add that destination. Please try again.');
    } finally {
      this.addingDest.set(false);
    }
  }

  isLeadingAvail(opt: AvailabilityOption) {
    const list = this.availability();
    const max = Math.max(0, ...list.map((o) => o.availableCount));
    return opt.availableCount === max && max > 0;
  }

  isLeadingDest(d: DestinationOption) {
    const list = this.destinations();
    const max = Math.max(0, ...list.map((o) => o.voteCount));
    return d.voteCount === max && max > 0;
  }

  availPct(opt: AvailabilityOption) {
    if (!opt.totalVotes) return 0;
    return Math.round((opt.availableCount / opt.totalVotes) * 100);
  }

  destPct(d: DestinationOption) {
    const total = this.destinations().reduce((s, x) => s + x.voteCount, 0) || 1;
    return Math.round((d.voteCount / total) * 100);
  }
}

@Component({
  selector: 'app-trip-itinerary',
  standalone: true,
  imports: [MatIconModule, FormsModule, ButtonComponent],
  template: `
    <div class="head">
      <h2>Itinerary</h2>
      <app-button variant="secondary" (click)="showForm.set(!showForm())">Add item +</app-button>
    </div>

    @if (showForm()) {
      <form class="th-panel add-form" (ngSubmit)="submit()">
        <label>
          Title
          <input type="text" required [(ngModel)]="title" name="title" placeholder="Team dinner" />
        </label>
        <label>
          Type
          <select [(ngModel)]="type" name="type">
            <option value="TRAVEL">Travel</option>
            <option value="HOTEL">Hotel</option>
            <option value="FOOD">Food</option>
            <option value="ACTIVITY">Activity</option>
            <option value="MEETING">Meeting</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label>
          Date
          <input type="date" required [(ngModel)]="date" name="date" />
        </label>
        <label>
          Start time
          <input type="time" [(ngModel)]="startTime" name="startTime" />
        </label>
        <label>
          End time
          <input type="time" [(ngModel)]="endTime" name="endTime" />
        </label>
        <label class="wide">
          Location
          <input type="text" [(ngModel)]="locationName" name="locationName" placeholder="Curlies, Anjuna" />
        </label>
        <app-button type="submit" [loading]="adding()">Add to itinerary</app-button>
        @if (addError()) {
          <p class="add-error">{{ addError() }}</p>
        }
      </form>
    }

    <div class="pills">
      @for (day of days(); track day.id; let i = $index) {
        <button type="button" class="pill" [class.on]="selected() === day.id" (click)="selected.set(day.id)">
          {{ dayPill(day.date, i) }}
        </button>
      }
    </div>
    @if (activeDay(); as day) {
      <ol class="timeline">
        @for (item of day.items; track item.id; let i = $index) {
          <li>
            <time>{{ formatTime(item.startTime) }}</time>
            <article class="th-panel item">
              <div class="item-top">
                <em class="th-pill" [class.th-pill--solid]="i % 2 === 0" [class.th-pill--outline]="i % 2 === 1">{{
                  item.type
                }}</em>
                <app-button variant="link-danger" size="sm" (click)="removeItem(item.id)">Delete</app-button>
              </div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.locationName }}</span>
            </article>
          </li>
        }
      </ol>
    } @else {
      <div class="th-panel">Itinerary not created yet.</div>
    }
  `,
  styles: [
    `
      .head {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .outline-btn {
        background: transparent;
        color: var(--th-primary-light);
        border: 1px solid var(--th-primary);
        border-radius: 999px;
        padding: 0.55rem 1rem;
        font-weight: 650;
        cursor: pointer;
      }
      .add-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .add-form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: var(--th-text-secondary);
      }
      .add-form label.wide {
        grid-column: 1 / -1;
      }
      .add-form input,
      .add-form select {
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
      }
      .add-form button {
        align-self: end;
      }
      .add-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        grid-column: 1 / -1;
      }
      h2 {
        margin: 0;
        font-family: var(--th-font-display);
      }
      .pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .pill {
        border: 1px solid var(--th-border-strong);
        background: transparent;
        color: var(--th-text-secondary);
        border-radius: 999px;
        padding: 0.4rem 0.85rem;
        cursor: pointer;
        font-weight: 650;
        font-size: 0.85rem;
      }
      .pill.on {
        background: var(--th-primary);
        border-color: var(--th-primary);
        color: white;
      }
      .timeline {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.85rem;
      }
      li {
        display: grid;
        grid-template-columns: 88px minmax(0, 1fr);
        gap: 0.75rem;
      }
      time {
        font-weight: 700;
        color: var(--th-primary-light);
        padding-top: 1.1rem;
        font-size: 0.88rem;
      }
      .item {
        display: grid;
        gap: 0.35rem;
      }
      .item .th-pill {
        width: fit-content;
        text-transform: uppercase;
        font-size: 0.65rem;
        letter-spacing: 0.05em;
      }
      .item span {
        color: var(--th-text-muted);
        font-size: 0.85rem;
      }
      .item-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.35rem;
      }
      @media (max-width: 520px) {
        li {
          grid-template-columns: 1fr;
        }
        time {
          padding-top: 0;
        }
      }
    `,
  ],
})
export class TripItineraryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = tripIdFromParent(this.route);
  readonly days = computed(() => this.store.getItinerary(this.tripId()));
  readonly selected = signal('');

  readonly showForm = signal(false);
  readonly title = signal('');
  readonly type = signal<ApiItineraryItem['type']>('ACTIVITY');
  readonly date = signal('');
  readonly startTime = signal('');
  readonly endTime = signal('');
  readonly locationName = signal('');
  readonly adding = signal(false);
  readonly addError = signal('');

  constructor() {
    effect(() => {
      const id = this.tripId();
      if (id) void this.store.loadItinerary(id);
    });
  }

  async submit(): Promise<void> {
    const id = this.tripId();
    const title = this.title().trim();
    const date = this.date();
    if (!id || !title || !date) return;

    this.adding.set(true);
    this.addError.set('');
    try {
      await this.store.addItineraryItem(id, {
        title,
        type: this.type(),
        date,
        startTime: this.startTime() || undefined,
        endTime: this.endTime() || undefined,
        locationName: this.locationName() || undefined,
      });
      this.title.set('');
      this.startTime.set('');
      this.endTime.set('');
      this.locationName.set('');
      this.showForm.set(false);
    } catch {
      this.addError.set('Could not add that item. Please try again.');
    } finally {
      this.adding.set(false);
    }
  }

  readonly activeDay = computed(() => {
    const list = this.days();
    if (!list.length) return undefined;
    const id = this.selected() || list[0].id;
    return list.find((d) => d.id === id) ?? list[0];
  });
  dayPill = dayPillLabel;
  formatTime = formatTime;

  removeItem(itemId: string): void {
    const id = this.tripId();
    if (id && confirm('Delete this itinerary item?')) {
      void this.store.deleteItineraryItem(id, itemId);
    }
  }
}

@Component({
  selector: 'app-trip-bookings',
  standalone: true,
  imports: [InrCurrencyPipe, FormsModule, ButtonComponent],
  template: `
    <div class="head">
      <h2>Bookings</h2>
      <app-button variant="secondary" (click)="showForm.set(!showForm())">Add booking +</app-button>
    </div>

    @if (showForm()) {
      <form class="th-panel add-form" (ngSubmit)="submit()">
        <label>
          Type
          <select [(ngModel)]="bookingType" name="bookingType">
            <option value="FLIGHT">Flight</option>
            <option value="TRAIN">Train</option>
            <option value="BUS">Bus (Volvo)</option>
            <option value="HOTEL">Hotel</option>
            <option value="CAB">Cab</option>
            <option value="ACTIVITY">Activity</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label class="wide">
          Provider
          <input
            type="text"
            required
            [(ngModel)]="provider"
            name="provider"
            [placeholder]="providerPlaceholder()"
          />
        </label>
        <label>
          Booking reference
          <input type="text" [(ngModel)]="bookingReference" name="bookingReference" placeholder="Optional" />
        </label>
        <label>
          Amount
          <input type="number" required min="0" step="0.01" [(ngModel)]="amount" name="amount" />
        </label>
        <label>
          Starts
          <input type="datetime-local" [(ngModel)]="startDatetime" name="startDatetime" />
        </label>
        <label>
          Ends
          <input type="datetime-local" [(ngModel)]="endDatetime" name="endDatetime" />
        </label>
        <app-button type="submit" [loading]="adding()">Add booking</app-button>
        @if (addError()) {
          <p class="add-error">{{ addError() }}</p>
        }
      </form>
    }

    <div class="grid">
      @for (b of bookings(); track b.id) {
        <article class="th-panel card">
          <div
            class="photo"
            [style.--booking-image]="'url(' + imageFor(b) + ')'"
            aria-hidden="true"
          >
            <em class="th-pill th-pill--solid type-chip">{{ b.bookingType }}</em>
          </div>
          <div class="top">
            <span class="status">{{ b.status }}</span>
            <strong>{{ b.amount | inr: b.currency }}</strong>
          </div>
          <h3>{{ b.provider }}</h3>
          <p>Booking #: {{ b.bookingReference }}</p>
          <p class="when">{{ formatWhen(b.startDatetime) }}</p>
          <app-button variant="link-danger" size="sm" (click)="remove(b.id)">Delete</app-button>
        </article>
      } @empty {
        <div class="th-panel">No bookings yet.</div>
      }
    </div>
  `,
  styles: [
    `
      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      h2 {
        margin: 0;
        font-family: var(--th-font-display);
      }
      .add-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .add-form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: var(--th-text-secondary);
      }
      .add-form label.wide {
        grid-column: 1 / -1;
      }
      .add-form input,
      .add-form select {
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
      }
      .add-form button {
        align-self: end;
      }
      .add-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        grid-column: 1 / -1;
      }
      .grid {
        display: grid;
        gap: 0.85rem;
        grid-template-columns: 1fr;
      }
      @media (min-width: 700px) {
        .grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      .card {
        overflow: hidden;
        padding: 0;
        transition:
          transform 0.22s ease,
          box-shadow 0.22s ease;
      }
      .card:hover {
        transform: translateY(-3px);
        box-shadow: var(--th-shadow);
      }
      .photo {
        position: relative;
        height: 150px;
        background:
          linear-gradient(180deg, transparent 35%, rgba(15, 23, 42, 0.55)),
          var(--booking-image) center/cover no-repeat;
      }
      .type-chip {
        position: absolute;
        left: 0.85rem;
        top: 0.85rem;
        text-transform: uppercase;
        font-size: 0.65rem;
        letter-spacing: 0.05em;
      }
      .top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        padding: 0.95rem 1.1rem 0;
      }
      h3 {
        margin: 0.35rem 1.1rem 0.25rem;
      }
      p {
        margin: 0.2rem 1.1rem;
        color: var(--th-text-secondary);
        font-size: 0.88rem;
      }
      .status {
        text-transform: capitalize;
        color: var(--th-success);
        font-weight: 700;
        font-size: 0.82rem;
      }
      .view {
        display: inline-block;
        margin: 0.75rem 1.1rem 1.1rem;
        color: var(--th-accent);
        text-decoration: none;
        font-weight: 700;
      }
    `,
  ],
})
export class TripBookingsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = tripIdFromParent(this.route);
  readonly bookings = computed(() => this.store.getBookings(this.tripId()));
  formatWhen = formatDateTime;
  imageFor = bookingImageUrl;

  readonly showForm = signal(false);
  readonly bookingType = signal<CreateBookingType>('HOTEL');
  readonly provider = signal('');
  readonly bookingReference = signal('');
  readonly amount = signal<number | null>(null);
  readonly startDatetime = signal('');
  readonly endDatetime = signal('');
  readonly adding = signal(false);
  readonly addError = signal('');

  readonly providerPlaceholder = computed(() => {
    switch (this.bookingType()) {
      case 'HOTEL':
        return 'Taj Resort Goa';
      case 'BUS':
        return 'Neeta Travels (Volvo AC)';
      case 'FLIGHT':
        return 'IndiGo / Air India';
      case 'TRAIN':
        return 'IRCTC / Rajdhani';
      case 'CAB':
        return 'Uber Airport Transfer';
      case 'ACTIVITY':
        return 'Calangute Water Sports';
      default:
        return 'Provider name';
    }
  });

  constructor() {
    effect(() => {
      const id = this.tripId();
      if (id) void this.store.loadBookings(id);
    });
  }

  async submit(): Promise<void> {
    const id = this.tripId();
    const provider = this.provider().trim();
    const amount = this.amount();
    if (!id || !provider || amount === null) return;

    this.adding.set(true);
    this.addError.set('');
    try {
      await this.store.addBooking(id, {
        bookingType: this.bookingType(),
        provider,
        bookingReference: this.bookingReference().trim() || undefined,
        amount,
        startDatetime: this.startDatetime() || undefined,
        endDatetime: this.endDatetime() || undefined,
      });
      this.provider.set('');
      this.bookingReference.set('');
      this.amount.set(null);
      this.startDatetime.set('');
      this.endDatetime.set('');
      this.showForm.set(false);
    } catch {
      this.addError.set('Could not add that booking. Please try again.');
    } finally {
      this.adding.set(false);
    }
  }

  remove(bookingId: string): void {
    const id = this.tripId();
    if (id && confirm('Delete this booking?')) {
      void this.store.deleteBooking(id, bookingId);
    }
  }
}

@Component({
  selector: 'app-trip-budget',
  standalone: true,
  imports: [InrCurrencyPipe, FormsModule, ButtonComponent],
  template: `
    @if (trip(); as t) {
      <div class="top-grid">
        <article class="th-panel total">
          <span class="label">Total budget</span>
          <strong>{{ t.estimatedBudget | inr: t.currency }}</strong>
          <div class="row">
            <span>Planned</span>
            <em
              class="th-pill"
              [class.th-pill--solid]="variance() >= 0"
              [class.th-pill--muted]="variance() < 0"
              >{{ variance() >= 0 ? 'Under' : 'Over' }}</em
            >
          </div>
        </article>
        <article class="th-panel">
          <span class="label">Utilization</span>
          <strong>{{ utilization() }}%</strong>
        </article>
        <article class="th-panel">
          <span class="label">Remaining</span>
          <strong>{{ remaining() | inr: t.currency }}</strong>
        </article>
      </div>
    }

    <div class="head">
      <h2>Categories</h2>
      <app-button variant="secondary" (click)="showForm.set(!showForm())">Add category +</app-button>
    </div>

    @if (showForm()) {
      <form class="th-panel add-form" (ngSubmit)="submit()">
        <label>
          Category name
          <input type="text" required [(ngModel)]="categoryName" name="categoryName" placeholder="Stay" />
        </label>
        <label>
          Planned amount
          <input type="number" required min="0" [(ngModel)]="plannedAmount" name="plannedAmount" />
        </label>
        <app-button type="submit" [loading]="adding()">Add category</app-button>
        @if (addError()) {
          <p class="add-error">{{ addError() }}</p>
        }
      </form>
    }

    <div class="cats">
      @for (b of budget(); track b.id) {
        <article class="th-panel">
          <div class="row">
            <h3>{{ b.category }}</h3>
            @if (editingId() === b.id) {
              <span class="edit-row">
                <input type="number" min="0" [(ngModel)]="editAmount" name="editAmount-{{ b.id }}" />
                <app-button size="sm" (click)="saveEdit(b.id)">Save</app-button>
                <app-button variant="ghost" size="sm" (click)="editingId.set('')">Cancel</app-button>
              </span>
            } @else {
              <span>
                {{ b.actualAmount | inr: b.currency }} / {{ b.plannedAmount | inr: b.currency }}
                <app-button variant="link" size="sm" (click)="startEdit(b.id, b.plannedAmount)">Edit</app-button>
              </span>
            }
          </div>
          <div class="bar">
            <i [style.width.%]="pct(b.actualAmount, b.plannedAmount)"></i>
          </div>
        </article>
      } @empty {
        <div class="th-panel">Budget categories not set.</div>
      }
    </div>
  `,
  styles: [
    `
      .head {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: space-between;
        align-items: center;
        margin: 1.25rem 0 0.85rem;
      }
      .head h2 {
        margin: 0;
        font-family: var(--th-font-display);
      }
      .outline-btn {
        background: transparent;
        color: var(--th-primary-light);
        border: 1px solid var(--th-primary);
        border-radius: 999px;
        padding: 0.55rem 1rem;
        font-weight: 650;
        cursor: pointer;
      }
      .add-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .add-form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: var(--th-text-secondary);
      }
      .add-form input {
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
      }
      .add-form button {
        align-self: end;
      }
      .add-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        grid-column: 1 / -1;
      }
      .link-btn {
        background: none;
        border: none;
        color: var(--th-primary-light);
        cursor: pointer;
        font-weight: 650;
        font-size: 0.82rem;
        padding: 0;
        margin-left: 0.5rem;
      }
      .edit-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .edit-row input {
        width: 100px;
        padding: 0.35rem 0.5rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
      }
      .top-grid {
        display: grid;
        gap: 0.85rem;
        grid-template-columns: 1fr;
        margin-bottom: 0.85rem;
      }
      @media (min-width: 800px) {
        .top-grid {
          grid-template-columns: 1.4fr 1fr 1fr;
        }
      }
      .label {
        display: block;
        margin-bottom: 0.4rem;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--th-primary-light);
      }
      .total strong,
      .top-grid strong {
        font-size: 1.45rem;
        font-family: var(--th-font-display);
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.55rem;
      }
      .cats {
        display: grid;
        gap: 0.85rem;
      }
      h3 {
        margin: 0;
      }
      .bar {
        height: 8px;
        background: var(--th-surface-muted);
        border-radius: 999px;
        overflow: hidden;
        margin-top: 0.65rem;
      }
      .bar i {
        display: block;
        height: 100%;
        background: var(--th-primary);
      }
    `,
  ],
})
export class TripBudgetPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = tripIdFromParent(this.route);
  readonly trip = computed(() => this.store.getById(this.tripId()));
  readonly budget = computed(() => this.store.getBudget(this.tripId()));

  readonly showForm = signal(false);
  readonly categoryName = signal('');
  readonly plannedAmount = signal<number | null>(null);
  readonly adding = signal(false);
  readonly addError = signal('');

  readonly editingId = signal('');
  readonly editAmount = signal<number | null>(null);

  constructor() {
    effect(() => {
      const id = this.tripId();
      if (id) void this.store.loadBudget(id);
    });
  }
  readonly utilization = computed(() => {
    const t = this.trip();
    if (!t?.estimatedBudget) return 0;
    return Math.round((t.actualBudget / t.estimatedBudget) * 100);
  });
  readonly remaining = computed(() => {
    const t = this.trip();
    return t ? t.estimatedBudget - t.actualBudget : 0;
  });
  readonly variance = computed(() => this.remaining());
  pct(actual: number, planned: number) {
    if (!planned) return 0;
    return Math.min(100, Math.round((actual / planned) * 100));
  }

  async submit(): Promise<void> {
    const id = this.tripId();
    const name = this.categoryName().trim();
    const amount = this.plannedAmount();
    if (!id || !name || amount === null) return;

    this.adding.set(true);
    this.addError.set('');
    try {
      await this.store.addBudgetCategory(id, { category: name, plannedAmount: amount });
      this.categoryName.set('');
      this.plannedAmount.set(null);
      this.showForm.set(false);
    } catch {
      this.addError.set('Could not add that category. Please try again.');
    } finally {
      this.adding.set(false);
    }
  }

  startEdit(categoryId: string, currentAmount: number): void {
    this.editingId.set(categoryId);
    this.editAmount.set(currentAmount);
  }

  async saveEdit(categoryId: string): Promise<void> {
    const id = this.tripId();
    const amount = this.editAmount();
    if (!id || amount === null) return;
    await this.store.updateBudgetCategory(id, categoryId, { plannedAmount: amount });
    this.editingId.set('');
  }
}

@Component({
  selector: 'app-trip-expenses',
  standalone: true,
  imports: [InrCurrencyPipe, FormsModule, ButtonComponent],
  template: `
    <div class="head">
      <h2>Expenses</h2>
      <app-button variant="secondary" (click)="showForm.set(!showForm())">Add expense +</app-button>
    </div>

    @if (showForm()) {
      <form class="th-panel add-form" (ngSubmit)="submit()">
        <label class="wide">
          Description
          <input type="text" required [(ngModel)]="description" name="description" placeholder="Welcome dinner" />
        </label>
        <label>
          Category
          <select [(ngModel)]="category" name="category">
            <option value="travel">Travel</option>
            <option value="lodging">Lodging</option>
            <option value="food">Food</option>
            <option value="activity">Activity</option>
            <option value="supplies">Supplies</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Amount
          <input type="number" required min="0.01" step="0.01" [(ngModel)]="amount" name="amount" />
        </label>
        <label>
          Date
          <input type="date" [(ngModel)]="expenseDate" name="expenseDate" />
        </label>
        <app-button type="submit" [loading]="adding()">Add expense</app-button>
        @if (addError()) {
          <p class="add-error">{{ addError() }}</p>
        }
      </form>
    }

    <div class="th-panel">
      <ul>
        @for (e of expenses(); track e.id) {
          <li>
            <div>
              <strong>{{ e.description }}</strong>
              <span>{{ e.paidByName }} · {{ e.category }} · {{ e.expenseDate }}</span>
              @if (e.status === 'PENDING') {
                <span class="pending-actions">
                  <app-button variant="link" size="sm" (click)="respond(e.id, 'APPROVED')">Approve</app-button>
                  <app-button variant="link-danger" size="sm" (click)="respond(e.id, 'REJECTED')">Reject</app-button>
                </span>
              }
            </div>
            <div class="amount-col">
              <em>{{ e.amount | inr: e.currency }}</em>
              <em
                class="th-pill"
                [class.th-pill--solid]="e.status === 'APPROVED'"
                [class.th-pill--outline]="e.status === 'PENDING'"
                [class.th-pill--muted]="e.status === 'REJECTED'"
                >{{ e.status.charAt(0) + e.status.slice(1).toLowerCase() }}</em
              >
            </div>
          </li>
        } @empty {
          <li>No expenses yet.</li>
        }
      </ul>
    </div>
    @if (settlements().length) {
      <h3 class="settle-title">Settlements</h3>
      <div class="settle-grid">
        @for (s of settlements(); track s.message) {
          <article class="th-panel settle">
            <p>{{ s.message }}</p>
          </article>
        }
      </div>
    }
  `,
  styles: [
    `
      .head {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      h2 {
        margin: 0;
        font-family: var(--th-font-display);
      }
      .outline-btn {
        background: transparent;
        color: var(--th-primary-light);
        border: 1px solid var(--th-primary);
        border-radius: 999px;
        padding: 0.55rem 1rem;
        font-weight: 650;
        cursor: pointer;
      }
      .add-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .add-form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: var(--th-text-secondary);
      }
      .add-form label.wide {
        grid-column: 1 / -1;
      }
      .add-form input,
      .add-form select {
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
      }
      .add-form button {
        align-self: end;
      }
      .add-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        grid-column: 1 / -1;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.85rem;
      }
      li {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
      }
      span {
        display: block;
        color: var(--th-text-muted);
        font-size: 0.82rem;
      }
      .pending-actions {
        margin-top: 0.3rem;
      }
      .link-btn {
        background: none;
        border: none;
        color: var(--th-primary-light);
        cursor: pointer;
        font-weight: 650;
        font-size: 0.8rem;
        padding: 0;
        margin-right: 0.85rem;
      }
      .link-btn.danger {
        color: #dc2626;
      }
      .amount-col {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.35rem;
      }
      em {
        font-style: normal;
        font-weight: 700;
      }
      .settle-title {
        margin: 1.25rem 0 0.75rem;
        font-size: 1rem;
      }
      .settle-grid {
        display: grid;
        gap: 0.75rem;
      }
      .settle p {
        margin: 0;
        color: var(--th-text);
      }
      .settle {
        border-left: 3px solid var(--th-primary);
      }
    `,
  ],
})
export class TripExpensesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = tripIdFromParent(this.route);
  readonly expenses = computed(() => this.store.getExpenses(this.tripId()));
  readonly settlements = computed(() => this.store.getSettlements(this.tripId()));

  readonly showForm = signal(false);
  readonly description = signal('');
  readonly category = signal<ExpenseCategory>('other');
  readonly amount = signal<number | null>(null);
  readonly expenseDate = signal('');
  readonly adding = signal(false);
  readonly addError = signal('');

  constructor() {
    effect(() => {
      const id = this.tripId();
      if (id) {
        void this.store.loadExpenses(id);
        void this.store.loadSettlements(id);
      }
    });
  }

  async submit(): Promise<void> {
    const id = this.tripId();
    const description = this.description().trim();
    const amount = this.amount();
    if (!id || !description || amount === null) return;

    this.adding.set(true);
    this.addError.set('');
    try {
      await this.store.addExpense(id, {
        description,
        category: this.category(),
        amount,
        expenseDate: this.expenseDate() || undefined,
      });
      this.description.set('');
      this.amount.set(null);
      this.expenseDate.set('');
      this.showForm.set(false);
    } catch {
      this.addError.set('Could not add that expense. Please try again.');
    } finally {
      this.adding.set(false);
    }
  }

  respond(expenseId: string, status: 'APPROVED' | 'REJECTED'): void {
    const id = this.tripId();
    if (id) void this.store.updateExpenseStatus(id, expenseId, status);
  }
}

@Component({
  selector: 'app-trip-tasks',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  template: `
    <div class="head">
      <h2>Tasks</h2>
      <app-button variant="secondary" size="sm" (click)="showForm.set(!showForm())">
        {{ showForm() ? 'Cancel' : 'Add task' }}
      </app-button>
    </div>

    @if (showForm()) {
      <form class="add-form th-panel" (ngSubmit)="submit()">
        <label class="wide">
          Title
          <input type="text" required [(ngModel)]="title" name="title" placeholder="Book cab to airport" />
        </label>
        <label class="wide">
          Description
          <input type="text" [(ngModel)]="description" name="description" placeholder="Optional details" />
        </label>
        <label>
          Priority
          <select [(ngModel)]="priority" name="priority">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>
        <label>
          Due date
          <input type="date" [(ngModel)]="dueDate" name="dueDate" />
        </label>
        <app-button type="submit" [loading]="adding()">Add task</app-button>
        @if (addError()) {
          <p class="add-error">{{ addError() }}</p>
        }
      </form>
    }

    <div class="th-panel">
      <ul>
        @for (t of tasks(); track t.id) {
          <li>
            <div>
              <strong>{{ t.title }}</strong>
              <span>{{ t.assignedToName }} · {{ t.priority }} · due {{ t.dueDate || '—' }}</span>
            </div>
            <em
              class="th-pill"
              [class.th-pill--solid]="t.status === 'IN_PROGRESS'"
              [class.th-pill--outline]="t.status === 'TODO'"
              [class.th-pill--muted]="t.status === 'COMPLETED'"
              >{{ t.status.replaceAll('_', ' ') }}</em
            >
          </li>
        } @empty {
          <li>No tasks yet.</li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      h2 {
        margin: 0;
        font-family: var(--th-font-display);
      }
      .add-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .add-form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: var(--th-text-secondary);
      }
      .add-form label.wide {
        grid-column: 1 / -1;
      }
      .add-form input,
      .add-form select {
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
        color: var(--th-text);
      }
      .add-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        grid-column: 1 / -1;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.85rem;
      }
      li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      span {
        display: block;
        color: var(--th-text-muted);
        font-size: 0.82rem;
      }
      em {
        font-style: normal;
        text-transform: capitalize;
      }
    `,
  ],
})
export class TripTasksTabPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = tripIdFromParent(this.route);
  readonly tasks = computed(() => this.store.getTasks(this.tripId()));

  readonly showForm = signal(false);
  readonly title = signal('');
  readonly description = signal('');
  readonly priority = signal<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  readonly dueDate = signal('');
  readonly adding = signal(false);
  readonly addError = signal('');

  async submit(): Promise<void> {
    const id = this.tripId();
    const title = this.title().trim();
    if (!id || !title) return;
    this.adding.set(true);
    this.addError.set('');
    try {
      await this.store.createTask(id, {
        title,
        description: this.description().trim() || undefined,
        priority: this.priority(),
        dueDate: this.dueDate() || null,
      });
      this.title.set('');
      this.description.set('');
      this.dueDate.set('');
      this.showForm.set(false);
    } catch {
      this.addError.set('Could not create that task. Please try again.');
    } finally {
      this.adding.set(false);
    }
  }
}

@Component({
  selector: 'app-trip-documents',
  standalone: true,
  imports: [MatIconModule, FormsModule, ButtonComponent],
  template: `
    <div class="head">
      <h2>Documents</h2>
      <app-button variant="secondary" size="sm" (click)="showForm.set(!showForm())">
        {{ showForm() ? 'Cancel' : 'Upload' }}
      </app-button>
    </div>

    @if (showForm()) {
      <form class="add-form th-panel" (ngSubmit)="submit()">
        <label class="wide">
          Title
          <input type="text" required [(ngModel)]="title" name="title" placeholder="Hotel confirmation" />
        </label>
        <label>
          Type
          <select [(ngModel)]="docType" name="docType">
            <option value="ticket">Ticket</option>
            <option value="receipt">Receipt</option>
            <option value="itinerary">Itinerary</option>
            <option value="policy">Policy</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label class="wide">
          File (PDF or image, max 5MB)
          <input type="file" accept=".pdf,image/*,.txt,.doc,.docx" (change)="onFile($event)" />
        </label>
        @if (fileName()) {
          <p class="file-name">Selected: {{ fileName() }}</p>
        }
        <app-button type="submit" [loading]="uploading()" [disabled]="!fileBase64()">Upload</app-button>
        @if (uploadError()) {
          <p class="add-error">{{ uploadError() }}</p>
        }
      </form>
    }

    <div class="th-panel">
      <p class="lead">Hotel confirmations, tickets, invoices, and ID proofs.</p>
      <ul>
        @for (doc of documents(); track doc.id) {
          <li>
            <span class="icon"><mat-icon>description</mat-icon></span>
            <div class="meta">
              <strong>{{ doc.title }}</strong>
              <small
                >{{ doc.docType }} · {{ formatSize(doc.sizeBytes) }} ·
                {{ doc.uploadedByName }}</small
              >
            </div>
            <div class="actions">
              <a class="th-pill th-pill--outline" [href]="doc.url" target="_blank" rel="noopener"
                >View</a
              >
              <app-button variant="link-danger" size="sm" (click)="remove(doc.id)">Delete</app-button>
            </div>
          </li>
        } @empty {
          <li class="empty">No documents yet — upload a PDF or photo.</li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      h2 {
        margin: 0;
        font-family: var(--th-font-display);
      }
      .lead {
        margin: 0 0 1rem;
        color: var(--th-text-secondary);
      }
      .add-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .add-form label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: var(--th-text-secondary);
      }
      .add-form label.wide {
        grid-column: 1 / -1;
      }
      .add-form input,
      .add-form select {
        padding: 0.6rem 0.75rem;
        border-radius: var(--th-radius);
        border: 1px solid var(--th-border);
        background: var(--th-surface);
        color: var(--th-text);
      }
      .file-name {
        margin: 0;
        grid-column: 1 / -1;
        font-size: 0.85rem;
        color: var(--th-text-muted);
      }
      .add-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        grid-column: 1 / -1;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }
      li {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        padding: 0.65rem 0;
        border-bottom: 1px solid var(--th-border);
      }
      li:last-child {
        border-bottom: 0;
      }
      li.empty {
        color: var(--th-text-muted);
        border-bottom: 0;
      }
      .icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: color-mix(in srgb, var(--th-primary) 18%, var(--th-surface));
        color: var(--th-primary-light);
        flex-shrink: 0;
      }
      .meta {
        min-width: 0;
        flex: 1;
      }
      strong {
        display: block;
      }
      small {
        color: var(--th-text-muted);
        text-transform: capitalize;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        margin-left: auto;
      }
      .actions a {
        text-decoration: none;
        font-style: normal;
      }
    `,
  ],
})
export class TripDocumentsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = tripIdFromParent(this.route);
  readonly documents = computed(() => this.store.getDocuments(this.tripId()));

  readonly showForm = signal(false);
  readonly title = signal('');
  readonly docType = signal<'itinerary' | 'receipt' | 'ticket' | 'policy' | 'other'>('ticket');
  readonly fileName = signal('');
  readonly fileMime = signal('');
  readonly fileBase64 = signal('');
  readonly uploading = signal(false);
  readonly uploadError = signal('');

  constructor() {
    effect(() => {
      const id = this.tripId();
      if (id) void this.store.loadDocuments(id);
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.uploadError.set('');
    this.fileBase64.set('');
    this.fileName.set('');
    this.fileMime.set('');
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('File must be 5MB or smaller.');
      return;
    }
    this.fileName.set(file.name);
    this.fileMime.set(file.type || 'application/octet-stream');
    if (!this.title().trim()) {
      this.title.set(file.name.replace(/\.[^.]+$/, ''));
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result;
      this.fileBase64.set(base64);
    };
    reader.onerror = () => this.uploadError.set('Could not read that file.');
    reader.readAsDataURL(file);
  }

  async submit(): Promise<void> {
    const id = this.tripId();
    const title = this.title().trim();
    const contentBase64 = this.fileBase64();
    if (!id || !title || !contentBase64) return;
    this.uploading.set(true);
    this.uploadError.set('');
    try {
      await this.store.uploadDocument(id, {
        title,
        docType: this.docType(),
        fileName: this.fileName() || 'document',
        mimeType: this.fileMime() || 'application/octet-stream',
        contentBase64,
      });
      this.title.set('');
      this.fileName.set('');
      this.fileMime.set('');
      this.fileBase64.set('');
      this.showForm.set(false);
    } catch {
      this.uploadError.set('Upload failed. Try a smaller PDF or image.');
    } finally {
      this.uploading.set(false);
    }
  }

  remove(documentId: string): void {
    const id = this.tripId();
    if (id) void this.store.deleteDocument(id, documentId);
  }
}

@Component({
  selector: 'app-trip-activity',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <h2>Activity</h2>
    <div class="th-panel">
      <ul>
        @for (a of activity(); track a.id) {
          <li>
            <span class="dot"></span>
            <div>
              <strong>{{ a.message }}</strong>
              <small>{{ formatWhen(a.createdAt) }}</small>
            </div>
          </li>
        } @empty {
          <li>
            <span class="dot"></span>
            <div>
              <strong>No activity yet</strong>
              <small>Updates will show up as the trip progresses</small>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      h2 {
        margin: 0 0 1rem;
        font-family: var(--th-font-display);
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.85rem;
      }
      li {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
      }
      .dot {
        width: 10px;
        height: 10px;
        margin-top: 0.4rem;
        border-radius: 50%;
        background: var(--th-primary);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--th-primary) 22%, transparent);
        flex-shrink: 0;
      }
      strong {
        display: block;
      }
      small {
        color: var(--th-text-muted);
      }
    `,
  ],
})
export class TripActivityPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = tripIdFromParent(this.route);
  readonly activity = computed(() => this.store.getActivity(this.tripId()));

  constructor() {
    effect(() => {
      const id = this.tripId();
      if (id) void this.store.loadActivity(id);
    });
  }

  formatWhen(iso: string): string {
    return formatDateTime(iso);
  }
}
