import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { InrCurrencyPipe, StatusLabelPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-trip-overview',
  standalone: true,
  imports: [MatIconModule, InrCurrencyPipe, StatusLabelPipe],
  template: `
    @if (trip(); as t) {
      <div class="th-grid th-grid-3">
        <article class="th-panel">
          <h3>Status</h3>
          <p>
            <span class="th-status" [class]="'th-status th-status--' + t.status.toLowerCase()">{{
              t.status | statusLabel
            }}</span>
          </p>
          <p class="muted">Approval: {{ t.approvalStatus | statusLabel }}</p>
        </article>
        <article class="th-panel">
          <h3>Organizer</h3>
          <p>{{ t.organizerName }}</p>
          <p class="muted">{{ t.tripType.replaceAll('_', ' ') }}</p>
        </article>
        <article class="th-panel">
          <h3>Budget</h3>
          <p>{{ t.estimatedBudget | inr: t.currency }} planned</p>
          <p class="muted">{{ t.actualBudget | inr: t.currency }} spent</p>
        </article>
      </div>
      <article class="th-panel desc">
        <h3>About this trip</h3>
        <p>{{ t.description || 'No description yet.' }}</p>
      </article>
    }
  `,
  styles: [
    `
      h3 {
        margin: 0 0 0.5rem;
        font-size: 0.95rem;
      }
      p {
        margin: 0.25rem 0;
      }
      .muted {
        color: var(--th-text-secondary);
      }
      .desc {
        margin-top: 1rem;
      }
    `,
  ],
})
export class TripOverviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = toSignal(
    this.route.parent!.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );
  readonly trip = computed(() => this.store.getById(this.tripId()));
}

@Component({
  selector: 'app-trip-members',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="th-panel">
      <h3>Members</h3>
      <ul>
        @for (m of members(); track m.id) {
          <li>
            <div class="who">
              <mat-icon>person</mat-icon>
              <div>
                <strong>{{ m.name }}</strong>
                <span>{{ m.role }}</span>
              </div>
            </div>
            <em
              class="th-pill"
              [class.th-pill--solid]="m.inviteStatus === 'ACCEPTED'"
              [class.th-pill--outline]="m.inviteStatus === 'INVITED' || m.inviteStatus === 'MAYBE'"
              [class.th-pill--muted]="m.inviteStatus === 'DECLINED'"
              >{{ m.inviteStatus }}</em
            >
          </li>
        } @empty {
          <li>No members yet.</li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      h3 {
        margin-top: 0;
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
        gap: 0.65rem;
        align-items: center;
        justify-content: space-between;
      }
      .who {
        display: flex;
        gap: 0.65rem;
        align-items: center;
      }
      span {
        display: block;
        color: var(--th-text-muted);
        font-size: 0.82rem;
      }
    `,
  ],
})
export class TripMembersPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = toSignal(
    this.route.parent!.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );
  readonly members = computed(() => this.store.getMembers(this.tripId()));
}

@Component({
  selector: 'app-trip-voting',
  standalone: true,
  imports: [],
  template: `
    <div class="th-grid th-grid-2">
      <section class="th-panel">
        <h3>Availability poll</h3>
        @for (opt of availability(); track opt.id) {
          <div class="row">
            <div>
              <strong>{{ opt.startDate }} → {{ opt.endDate }}</strong>
              <span>{{ opt.availableCount }}/{{ opt.totalVotes }} available</span>
            </div>
            <div class="bar">
              <i [style.width.%]="(opt.availableCount / opt.totalVotes) * 100"></i>
            </div>
          </div>
        } @empty {
          <p>No availability options yet.</p>
        }
      </section>
      <section class="th-panel">
        <h3>Destination votes</h3>
        @for (d of destinations(); track d.id) {
          <div class="row">
            <div>
              <strong>{{ d.destinationName }}</strong>
              <span>{{ d.voteCount }} votes · ~₹{{ d.estimatedCost }}/person</span>
            </div>
          </div>
        } @empty {
          <p>No destination options yet.</p>
        }
      </section>
    </div>
  `,
  styles: [
    `
      h3 {
        margin-top: 0;
      }
      .row {
        display: grid;
        gap: 0.35rem;
        margin-bottom: 0.9rem;
      }
      span {
        display: block;
        color: var(--th-text-muted);
        font-size: 0.82rem;
      }
      .bar {
        height: 8px;
        background: var(--th-surface-muted);
        border-radius: 999px;
        overflow: hidden;
      }
      .bar i {
        display: block;
        height: 100%;
        background: var(--th-primary);
      }
    `,
  ],
})
export class TripVotingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = toSignal(
    this.route.parent!.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );
  readonly availability = computed(() => this.store.getAvailability(this.tripId()));
  readonly destinations = computed(() => this.store.getDestinations(this.tripId()));
}

@Component({
  selector: 'app-trip-itinerary',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @for (day of days(); track day.id) {
      <section class="th-panel day">
        <h3>{{ day.title }}</h3>
        <p class="muted">{{ day.notes }}</p>
        <ol>
          @for (item of day.items; track item.id) {
            <li>
              <time>{{ item.startTime }}</time>
              <div>
                <em class="th-pill th-pill--outline">{{ item.type }}</em>
                <strong>{{ item.title }}</strong>
                <span>{{ item.locationName }}</span>
              </div>
            </li>
          }
        </ol>
      </section>
    } @empty {
      <div class="th-panel">Itinerary not created yet.</div>
    }
  `,
  styles: [
    `
      .day {
        margin-bottom: 1rem;
      }
      h3 {
        margin: 0 0 0.25rem;
      }
      .muted {
        color: var(--th-text-secondary);
        margin-top: 0;
      }
      ol {
        list-style: none;
        margin: 1rem 0 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }
      li {
        display: grid;
        grid-template-columns: 64px 1fr;
        gap: 0.75rem;
        padding-left: 0.75rem;
        border-left: 2px solid var(--th-primary);
      }
      time {
        font-weight: 700;
        color: var(--th-primary-light);
      }
      li > div {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .th-pill--outline {
        text-transform: uppercase;
        font-size: 0.65rem;
        letter-spacing: 0.04em;
      }
      strong {
        width: 100%;
      }
      span {
        display: block;
        color: var(--th-text-muted);
        font-size: 0.82rem;
      }
    `,
  ],
})
export class TripItineraryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = toSignal(
    this.route.parent!.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );
  readonly days = computed(() => this.store.getItinerary(this.tripId()));
}

@Component({
  selector: 'app-trip-bookings',
  standalone: true,
  imports: [InrCurrencyPipe],
  template: `
    <div class="th-grid th-grid-2">
      @for (b of bookings(); track b.id) {
        <article class="th-panel">
          <div class="top">
            <em class="th-pill th-pill--outline">{{ b.bookingType }}</em>
            <strong>{{ b.amount | inr: b.currency }}</strong>
          </div>
          <h3>{{ b.provider }}</h3>
          <p>Booking #: {{ b.bookingReference }}</p>
          <p>{{ b.startDatetime }} → {{ b.endDatetime }}</p>
          <p class="muted">{{ b.status }}</p>
        </article>
      } @empty {
        <div class="th-panel">No bookings yet.</div>
      }
    </div>
  `,
  styles: [
    `
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.35rem;
      }
      .th-pill--outline {
        text-transform: uppercase;
        font-size: 0.68rem;
        letter-spacing: 0.04em;
      }
      h3 {
        margin: 0.15rem 0 0.35rem;
      }
      .muted {
        color: var(--th-text-muted);
        font-size: 0.85rem;
      }
    `,
  ],
})
export class TripBookingsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = toSignal(
    this.route.parent!.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );
  readonly bookings = computed(() => this.store.getBookings(this.tripId()));
}

@Component({
  selector: 'app-trip-budget',
  standalone: true,
  imports: [InrCurrencyPipe],
  template: `
    <div class="th-grid th-grid-2">
      @for (b of budget(); track b.id) {
        <article class="th-panel">
          <h3>{{ b.category }}</h3>
          <p>{{ b.actualAmount | inr: b.currency }} / {{ b.plannedAmount | inr: b.currency }}</p>
          <div class="bar">
            <i [style.width.%]="Math.min(100, (b.actualAmount / b.plannedAmount) * 100)"></i>
          </div>
        </article>
      } @empty {
        <div class="th-panel">Budget categories not set.</div>
      }
    </div>
  `,
  styles: [
    `
      h3 {
        margin-top: 0;
      }
      .bar {
        height: 8px;
        background: var(--th-surface-muted);
        border-radius: 999px;
        overflow: hidden;
        margin-top: 0.5rem;
      }
      .bar i {
        display: block;
        height: 100%;
        background: var(--th-accent);
      }
    `,
  ],
})
export class TripBudgetPage {
  readonly Math = Math;
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = toSignal(
    this.route.parent!.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );
  readonly budget = computed(() => this.store.getBudget(this.tripId()));
}

@Component({
  selector: 'app-trip-expenses',
  standalone: true,
  imports: [InrCurrencyPipe],
  template: `
    <div class="th-panel">
      <h3>Expenses</h3>
      <ul>
        @for (e of expenses(); track e.id) {
          <li>
            <div>
              <strong>{{ e.description }}</strong>
              <span>{{ e.paidByName }} · {{ e.category }} · {{ e.expenseDate }}</span>
            </div>
            <em>{{ e.amount | inr: e.currency }}</em>
          </li>
        } @empty {
          <li>No expenses yet.</li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
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
      em {
        font-style: normal;
        font-weight: 700;
      }
    `,
  ],
})
export class TripExpensesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);
  private readonly tripId = toSignal(
    this.route.parent!.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );
  readonly expenses = computed(() => this.store.getExpenses(this.tripId()));
}

@Component({
  selector: 'app-trip-tasks',
  standalone: true,
  template: `
    <div class="th-panel">
      <h3>Tasks</h3>
      <ul>
        @for (t of tasks(); track t.id) {
          <li>
            <div>
              <strong>{{ t.title }}</strong>
              <span>{{ t.assignedToName }} · {{ t.priority }} · due {{ t.dueDate }}</span>
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
  private readonly tripId = toSignal(
    this.route.parent!.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );
  readonly tasks = computed(() => this.store.getTasks(this.tripId()));
}

@Component({
  selector: 'app-trip-documents',
  standalone: true,
  template: `
    <div class="th-panel">
      <h3>Documents</h3>
      <p>Hotel confirmations, tickets, invoices, and ID proofs will appear here.</p>
      <ul>
        <li>Taj Resort booking PDF</li>
        <li>Neeta Travels bus tickets</li>
      </ul>
    </div>
  `,
})
export class TripDocumentsPage {}

@Component({
  selector: 'app-trip-activity',
  standalone: true,
  template: `
    <div class="th-panel">
      <h3>Activity</h3>
      <ul>
        <li>Roshan created the trip</li>
        <li>Manager approved Goa Trip 2026</li>
        <li>Rahul uploaded hotel booking</li>
        <li>Mayuri added an expense</li>
      </ul>
    </div>
  `,
})
export class TripActivityPage {}
