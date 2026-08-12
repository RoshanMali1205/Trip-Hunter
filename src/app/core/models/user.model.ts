export type OrgRole =
  | 'OWNER'
  | 'ORG_ADMIN'
  | 'TRIP_ORGANIZER'
  | 'APPROVER'
  | 'FINANCE'
  | 'MEMBER'
  | 'VIEWER';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  timezone: string;
  organizationId: string;
  organizationName: string;
  role: OrgRole;
  department?: string;
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
}
