export type TripStatus =
  | 'draft'
  | 'planning'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Trip {
  id: string;
  organizationId: string;
  teamId: string;
  name: string;
  description: string;
  destination: string;
  status: TripStatus;
  startDate: string;
  endDate: string;
  budgetCents: number;
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const now = '2026-08-01T10:00:00.000Z';

/** In-memory seed: Acme eng team outing to Goa */
const trips: Trip[] = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    organizationId: '22222222-2222-2222-2222-222222222222',
    teamId: '44444444-4444-4444-4444-444444444444',
    name: 'Goa Team Outing 2026',
    description:
      'Annual engineering offsite — beaches, team bonding, and a light planning day in North Goa.',
    destination: 'Goa, India',
    status: 'planning',
    startDate: '2026-11-14',
    endDate: '2026-11-17',
    budgetCents: 45000000,
    currency: 'INR',
    createdBy: '11111111-1111-1111-1111-111111111111',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    organizationId: '22222222-2222-2222-2222-222222222222',
    teamId: '44444444-4444-4444-4444-444444444444',
    name: 'Goa Reunion Weekend',
    description: 'Follow-up long weekend for remote teammates who missed the main outing.',
    destination: 'Goa, India',
    status: 'draft',
    startDate: '2027-01-09',
    endDate: '2027-01-11',
    budgetCents: 18000000,
    currency: 'INR',
    createdBy: '11111111-1111-1111-1111-111111111111',
    createdAt: now,
    updatedAt: now,
  },
];

export class TripRepository {
  findAll(): Trip[] {
    return [...trips];
  }

  findById(id: string): Trip | undefined {
    return trips.find((t) => t.id === id);
  }

  findByOrganization(organizationId: string): Trip[] {
    return trips.filter((t) => t.organizationId === organizationId);
  }
}
