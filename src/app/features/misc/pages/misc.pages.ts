import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripStore } from '../../../core/services/trip.store';
import { TripDatePipe, InrCurrencyPipe, StatusLabelPipe } from '../../../shared/pipes/format.pipe';
import { TripTask } from '../../../core/models/trip.model';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [RouterLink, TripDatePipe],
  template: `
    <section class="th-page">
      <header class="th-page-header">
        <div>
          <h1>Calendar</h1>
          <p>Confirmed and proposed trip dates.</p>
        </div>
      </header>
      <div class="th-panel">
        <ul class="plain">
          @for (trip of trips; track trip.id) {
            <li>
              <a [routerLink]="['/trips', trip.id]">
                <strong>{{ trip.title }}</strong>
                <span>{{ trip.startDate | tripDate: trip.endDate }} · {{ trip.destination }}</span>
              </a>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: [
    `
      .plain {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.85rem;
      }
      a {
        color: inherit;
        display: block;
      }
      span {
        display: block;
        color: var(--th-text-muted);
        font-size: 0.85rem;
        margin-top: 0.2rem;
      }
    `,
  ],
})
export class CalendarPage {
  readonly trips = inject(TripStore).trips();
}

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [StatusLabelPipe],
  template: `
    <section class="th-page">
      <header class="th-page-header">
        <div>
          <h1>My tasks</h1>
          <p>{{ openCount() }} open across your trips</p>
        </div>
      </header>
      <div class="th-panel">
        <ul class="tasks">
          @for (t of tasks(); track t.id) {
            <li>
              <div>
                <strong>{{ t.title }}</strong>
                <span>{{ t.assignedToName }} · due {{ t.dueDate }} · {{ t.priority }}</span>
              </div>
              <button type="button" class="pill" (click)="cycle(t)">
                {{ t.status | statusLabel }}
              </button>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: [
    `
      .tasks {
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
        align-items: center;
      }
      span {
        display: block;
        color: var(--th-text-muted);
        font-size: 0.82rem;
        margin-top: 0.2rem;
      }
      .pill {
        border: 1px solid var(--th-border-strong);
        background: color-mix(in srgb, var(--th-primary) 18%, transparent);
        color: var(--th-primary-light);
        border-radius: 999px;
        padding: 0.35rem 0.7rem;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        cursor: pointer;
      }
    `,
  ],
})
export class TasksPage {
  private readonly store = inject(TripStore);
  readonly tasks = computed(() => this.store.getTasks());
  readonly openCount = computed(() => this.tasks().filter((t) => t.status !== 'COMPLETED').length);

  cycle(task: TripTask): void {
    const order: TripTask['status'][] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    this.store.updateTaskStatus(task.id, next);
  }
}

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [InrCurrencyPipe],
  template: `
    <section class="th-page">
      <header class="th-page-header">
        <div>
          <h1>Expenses</h1>
          <p>Shared spend and settlement across trips.</p>
        </div>
      </header>

      <div class="th-grid th-grid-3">
        <article class="th-panel">
          <span class="label">You paid</span>
          <strong>{{ summary.youPaid | inr }}</strong>
        </article>
        <article class="th-panel">
          <span class="label">Your share</span>
          <strong>{{ summary.yourShare | inr }}</strong>
        </article>
        <article class="th-panel">
          <span class="label">You receive</span>
          <strong>{{ summary.youReceive | inr }}</strong>
        </article>
      </div>

      <div class="th-panel settle">
        <h2>Settlement</h2>
        <ul>
          <li><span>Rahul owes Roshan</span><strong>₹2,450</strong></li>
          <li><span>Amit owes Roshan</span><strong>₹1,800</strong></li>
          <li><span>Roshan owes Mayuri</span><strong>₹750</strong></li>
        </ul>
      </div>
    </section>
  `,
  styles: [
    `
      .label {
        display: block;
        color: var(--th-primary-light);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin-bottom: 0.35rem;
      }
      strong {
        font-family: var(--th-font-display);
        font-size: 1.4rem;
      }
      .settle {
        margin-top: 1rem;
      }
      h2 {
        margin: 0 0 0.85rem;
        font-size: 1.05rem;
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
        justify-content: space-between;
        gap: 1rem;
        color: var(--th-text-secondary);
      }
      li strong {
        font-size: 1rem;
        color: var(--th-text);
      }
    `,
  ],
})
export class ExpensesPage {
  readonly summary = inject(TripStore).getDashboard().expenseSummary;
}
