export interface ExploreStory {
  id: string;
  kicker: string;
  title: string;
  body: string;
  image: string;
  detail?: string;
}

export interface ExplorePinStage {
  kicker: string;
  title: string;
  body: string;
  image: string;
}

export const EXPLORE_HERO_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80';

export const EXPLORE_PIN_STAGES: ExplorePinStage[] = [
  {
    kicker: '01 — Vote',
    title: 'A destination, decided together.',
    body: 'Photo cards, live tallies, and a lock when the room agrees. No endless group chats.',
    image:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1800&q=80',
  },
  {
    kicker: '02 — Book',
    title: 'Stays and seats, in one reel.',
    body: 'Hotels, flights, coaches, and cabs as photo-first cards — pending until someone confirms.',
    image:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=80',
  },
  {
    kicker: '03 — Arrive',
    title: 'Then the trip actually starts.',
    body: 'Itinerary, expenses, and tasks stay on the same film strip after you land.',
    image:
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1800&q=80',
  },
];

export const EXPLORE_STORIES: ExploreStory[] = [
  {
    id: 'goa',
    kicker: 'Arabian Sea',
    title: 'Goa, after the last stand-up.',
    body: 'Anjuna dusk, a long table, and a budget that already knows who paid for dinner.',
    detail: 'Beaches · offsites · late ferries',
    image:
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'kerala',
    kicker: 'Backwaters',
    title: 'Kerala, slower than Slack.',
    body: 'Houseboats and monsoon greens — a planning week that feels like a still from a travel film.',
    detail: 'Allepey · Kochi · Munnar',
    image:
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'ladakh',
    kicker: 'High desert',
    title: 'Ladakh, above the noise.',
    body: 'Passes, prayer flags, and a packing list that actually gets assigned.',
    detail: 'Leh · Nubra · Pangong',
    image:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'jaipur',
    kicker: 'Pink city',
    title: 'Jaipur, for the colour brief.',
    body: 'Forts at golden hour, workshops in the old city, and a vote that picked palaces over malls.',
    detail: 'Amer · bazaars · rooftop dinners',
    image:
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'manali',
    kicker: 'Himachal',
    title: 'Manali, when the hills call.',
    body: 'Pine roads and cool evenings — a team outing that looks like a product keynote, not a spreadsheet.',
    detail: 'Solang · Old Manali · Rohtang',
    image:
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'udaipur',
    kicker: 'Lakes',
    title: 'Udaipur, lit for the closing dinner.',
    body: 'Marble courtyards and lake boats — the kind of frame you pin on a launch page.',
    detail: 'City Palace · Fateh Sagar',
    image:
      'https://images.unsplash.com/photo-1695956353120-54ce5e91632b?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'pondy',
    kicker: 'French quarter',
    title: 'Pondicherry, pastel and unhurried.',
    body: 'Promenade walks, filter coffee, and an itinerary that leaves room to wander.',
    detail: 'White Town · Auroville',
    image:
      'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'gokarna',
    kicker: 'Karnataka coast',
    title: 'Gokarna, quieter than Goa.',
    body: 'Cove beaches and cliff paths — for teams that want sand without the club circuit.',
    detail: 'Om Beach · Kudle',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  },
];

export const EXPLORE_FILMSTRIP: { label: string; image: string }[] = [
  {
    label: 'Coast',
    image:
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Peaks',
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Lakes',
    image:
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Cities',
    image:
      'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Trains',
    image:
      'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Stays',
    image:
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Tables',
    image:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Dusk',
    image:
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=900&q=80',
  },
];
