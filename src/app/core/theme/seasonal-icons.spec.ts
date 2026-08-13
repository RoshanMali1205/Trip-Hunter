import { describe, expect, it } from 'vitest';
import { brandIconFor, isIndependenceDayWindow } from './seasonal-icons';

describe('isIndependenceDayWindow', () => {
  it('shows through 15 August EOD IST', () => {
    expect(isIndependenceDayWindow(new Date('2026-08-15T18:29:59.000Z'))).toBe(true);
    expect(isIndependenceDayWindow(new Date('2026-08-15T18:30:00.000Z'))).toBe(false);
  });

  it('shows mid-day on Independence Day', () => {
    expect(isIndependenceDayWindow(new Date('2026-08-15T06:00:00.000Z'))).toBe(true);
  });

  it('shows from 1 August IST and hides outside the window', () => {
    expect(isIndependenceDayWindow(new Date('2026-07-31T18:30:00.000Z'))).toBe(true);
    expect(isIndependenceDayWindow(new Date('2026-07-31T18:29:59.000Z'))).toBe(false);
    expect(isIndependenceDayWindow(new Date('2026-08-16T00:00:00.000Z'))).toBe(false);
    expect(isIndependenceDayWindow(new Date('2026-08-01T00:00:00.000Z'))).toBe(true);
  });
});

describe('brandIconFor', () => {
  it('returns Tiranga brand icon during the window', () => {
    expect(brandIconFor(new Date('2026-08-13T12:00:00.000Z'))).toBe('/icons/tiranga-brand-48.png');
  });

  it('returns default brand icon after the window', () => {
    expect(brandIconFor(new Date('2026-08-16T00:00:00.000Z'))).toBe('/icons/brand-48.png');
  });
});
