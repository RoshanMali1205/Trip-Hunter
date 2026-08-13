import { describe, expect, it } from 'vitest';
import { isIndependenceDayWindow } from './independence-day-badge.component';

describe('isIndependenceDayWindow', () => {
  it('shows through 15 August EOD IST', () => {
    // 15 Aug 2026 18:29:59 UTC == 15 Aug 23:59:59 IST
    expect(isIndependenceDayWindow(new Date('2026-08-15T18:29:59.000Z'))).toBe(true);
    // 15 Aug 2026 18:30:00 UTC == 16 Aug 00:00:00 IST
    expect(isIndependenceDayWindow(new Date('2026-08-15T18:30:00.000Z'))).toBe(false);
  });

  it('shows mid-day on Independence Day', () => {
    expect(isIndependenceDayWindow(new Date('2026-08-15T06:00:00.000Z'))).toBe(true);
  });

  it('shows from 1 August IST and hides outside the window', () => {
    // 31 Jul 18:30 UTC == 1 Aug 00:00 IST
    expect(isIndependenceDayWindow(new Date('2026-07-31T18:30:00.000Z'))).toBe(true);
    // Still 31 Jul IST
    expect(isIndependenceDayWindow(new Date('2026-07-31T18:29:59.000Z'))).toBe(false);
    expect(isIndependenceDayWindow(new Date('2026-08-16T00:00:00.000Z'))).toBe(false);
    expect(isIndependenceDayWindow(new Date('2026-08-01T00:00:00.000Z'))).toBe(true);
  });
});
