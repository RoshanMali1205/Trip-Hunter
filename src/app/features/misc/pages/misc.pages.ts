import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripStore } from '../../../core/services/trip.store';
import { TripDatePipe } from '../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [RouterLink, TripDatePipe],
  template: `
    <section class="th-page">
      <header class="th-page-header">
        <div>
          <h1>Calendar</h1>
          <p>Confirmed and proposed trip dates across your organization.</p>
        </div>
      </header>
      <div class="th-panel">
        <ul>
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
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.85rem;
      }
      a {
        display: block;
        color: inherit;
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
  template: `
    <section class="th-page">
      <header class="th-page-header">
        <div>
          <h1>Tasks</h1>
          <p>Preparation work across all your trips.</p>
        </div>
      </header>
      <div class="th-panel">
        <ul>
          @for (t of tasks; track t.id) {
            <li>
              <div>
                <strong>{{ t.title }}</strong>
                <span>{{ t.assignedToName }} · due {{ t.dueDate }}</span>
              </div>
              <em>{{ t.status.replaceAll('_', ' ') }}</em>
            </li>
          }
        </ul>
      </div>
    </section>
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
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--th-primary);
      }
    `,
  ],
})
export class TasksPage {
  readonly tasks = inject(TripStore).getTasks();
}

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [],
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
          <h3>You paid</h3>
          <strong>₹18,500</strong>
        </article>
        <article class="th-panel">
          <h3>Your share</h3>
          <strong>₹12,300</strong>
        </article>
        <article class="th-panel">
          <h3>You receive</h3>
          <strong>₹6,200</strong>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      h3 {
        margin: 0 0 0.35rem;
        color: var(--th-text-secondary);
        font-size: 0.9rem;
      }
      strong {
        font-family: var(--th-font-display);
        font-size: 1.5rem;
      }
    `,
  ],
})
export class ExpensesPage {}
