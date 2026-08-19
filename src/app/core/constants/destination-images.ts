/**
 * Curated place photos for destination poll cards.
 * Prefer an explicit imageUrl; otherwise match place/city keywords.
 */

const PLACE_IMAGES: { match: RegExp; url: string }[] = [
  {
    match: /goa|anjuna|baga|calangute/i,
    url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /gokarna|karnataka/i,
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /pondicherry|puducherry|pondy/i,
    url: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /manali|himachal|shimla/i,
    url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /udaipur/i,
    url: 'https://images.unsplash.com/photo-1695956353120-54ce5e91632b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /jaipur|rajasthan/i,
    url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /kerala|alleppey|munnar|kochi/i,
    url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /ladakh|leh|spiti/i,
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /mumbai|bombay/i,
    url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /delhi|agra|taj/i,
    url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /beach|island|coast/i,
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: /mountain|hill|trek/i,
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  },
];

const DEFAULT_DESTINATION_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

export function destinationImageUrl(input: {
  imageUrl?: string | null;
  destinationName?: string;
  city?: string;
  country?: string;
}): string {
  const custom = input.imageUrl?.trim();
  if (custom) return custom;

  const haystack = [input.destinationName, input.city, input.country].filter(Boolean).join(' ');
  for (const entry of PLACE_IMAGES) {
    if (entry.match.test(haystack)) return entry.url;
  }
  return DEFAULT_DESTINATION_IMAGE;
}
