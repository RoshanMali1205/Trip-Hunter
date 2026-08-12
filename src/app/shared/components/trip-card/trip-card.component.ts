import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Trip } from '../../../core/models/trip.model';
import { InrCurrencyPipe, StatusLabelPipe, TripDatePipe } from '../../pipes/format.pipe';

@Component({
  selector: 'app-trip-card',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, InrCurrencyPipe, TripDatePipe, StatusLabelPipe],
  template: `
    <article class="trip-card" [style.--cover]="coverStyle">
      <div class="trip-card__media" [class.trip-card__media--fallback]="!trip.coverImageUrl"></div>
      <div class="trip-card__body">
        <div class="trip-card__top">
          <span class="th-status" [class]="'th-status th-status--' + trip.status.toLowerCase()">
            {{ trip.status | statusLabel }}
          </span>
          <span class="trip-card__type">{{ trip.tripType.replaceAll('_', ' ') }}</span>
        </div>
        <h3>{{ trip.title }}</h3>
        <p class="trip-card__route">
          <mat-icon>place</mat-icon>
          {{ trip.origin || 'Origin TBD' }} → {{ trip.destination || 'Destination TBD' }}
        </p>
        <p class="trip-card__meta">
          <span><mat-icon>event</mat-icon>{{ trip.startDate | tripDate: trip.endDate }}</span>
          <span><mat-icon>group</mat-icon>{{ trip.memberCount }} members</span>
          <span><mat-icon>payments</mat-icon>{{ trip.estimatedBudget | inr: trip.currency }}</span>
        </p>
        <a mat-stroked-button color="primary" [routerLink]="['/trips', trip.id]">View trip</a>
      </div>
    </article>
  `,
  styles: [
    `
      .trip-card {
        display: grid;
        grid-template-rows: 140px 1fr;
        border-radius: var(--th-radius-lg);
        overflow: hidden;
        border: 1px solid var(--th-border);
        background: var(--th-surface);
        box-shadow: var(--th-shadow-sm);
        transition:
          transform 0.25s ease,
          box-shadow 0.25s ease;
        height: 100%;
      }

      .trip-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--th-shadow);
      }

      .trip-card__media {
        background:
          linear-gradient(180deg, transparent 20%, rgba(10, 63, 76, 0.55)),
          var(--cover) center/cover no-repeat;
      }

      .trip-card__media--fallback {
        background: var(--th-gradient-hero);
      }

      .trip-card__body {
        padding: 1rem 1.1rem 1.2rem;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .trip-card__top {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        align-items: center;
      }

      .trip-card__type {
        font-size: 0.72rem;
        color: var(--th-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 650;
      }

      h3 {
        margin: 0;
        font-size: 1.05rem;
        line-height: 1.35;
      }

      .trip-card__route,
      .trip-card__meta span {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--th-text-secondary);
        margin: 0;
        font-size: 0.88rem;
      }

      .trip-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin: 0;
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      a[mat-stroked-button] {
        margin-top: auto;
        align-self: flex-start;
      }
    `,
  ],
})
export class TripCardComponent {
  @Input({ required: true }) trip!: Trip;

  get coverStyle(): string {
    return this.trip.coverImageUrl ? `url(${this.trip.coverImageUrl})` : 'none';
  }
}
