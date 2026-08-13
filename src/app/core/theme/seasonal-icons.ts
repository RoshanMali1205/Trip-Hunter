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

export const DEFAULT_BRAND_ICON = '/icons/brand-48.png';
export const TIRANGA_BRAND_ICON = '/icons/tiranga-brand-48.png';
export const DEFAULT_FAVICON = '/favicon.svg';
export const TIRANGA_FAVICON = '/favicon-tiranga.svg';
export const DEFAULT_APPLE_TOUCH = '/icons/icon-180x180.png';
export const TIRANGA_APPLE_TOUCH = '/icons/tiranga-180x180.png';
export const DEFAULT_MANIFEST = '/manifest.webmanifest';
export const TIRANGA_MANIFEST = '/manifest-tiranga.webmanifest';

export function brandIconFor(now: Date = new Date()): string {
  return isIndependenceDayWindow(now) ? TIRANGA_BRAND_ICON : DEFAULT_BRAND_ICON;
}

/** Swap document favicon / apple-touch / manifest icons for Independence Day. */
export function applySeasonalDocumentIcons(now: Date = new Date()): void {
  if (typeof document === 'undefined') return;

  const independence = isIndependenceDayWindow(now);
  const faviconHref = independence ? TIRANGA_FAVICON : DEFAULT_FAVICON;
  const appleHref = independence ? TIRANGA_APPLE_TOUCH : DEFAULT_APPLE_TOUCH;
  const manifestHref = independence ? TIRANGA_MANIFEST : DEFAULT_MANIFEST;

  for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'))) {
    if (link.type === 'image/x-icon') {
      if (independence) {
        link.remove();
      }
      continue;
    }
    link.type = 'image/svg+xml';
    link.href = faviconHref;
  }

  let svgIcon = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');
  if (!svgIcon) {
    svgIcon = document.createElement('link');
    svgIcon.rel = 'icon';
    svgIcon.type = 'image/svg+xml';
    document.head.appendChild(svgIcon);
  }
  svgIcon.href = faviconHref;

  for (const link of Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]'),
  )) {
    link.href = appleHref;
  }

  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest) {
    manifest.href = manifestHref;
  }
}
