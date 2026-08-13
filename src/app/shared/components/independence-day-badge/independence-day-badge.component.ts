import { Component, computed, signal } from '@angular/core';

/** Visible from 1 Aug through 15 Aug EOD in Asia/Kolkata. */
export function isIndependenceDayWindow(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 0);
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 0);
  return month === 8 && day >= 1 && day <= 15;
}

@Component({
  selector: 'app-independence-day-badge',
  standalone: true,
  templateUrl: './independence-day-badge.component.html',
  styleUrl: './independence-day-badge.component.scss',
})
export class IndependenceDayBadgeComponent {
  private readonly now = signal(new Date());

  readonly visible = computed(() => isIndependenceDayWindow(this.now()));
}
