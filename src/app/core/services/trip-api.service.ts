import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { getAppConfig } from '../config/app-config';

export type ApiTripStatus =
  | 'draft'
  | 'planning'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ApiTrip {
  id: string;
  organizationId: string;
  teamId: string | null;
  name: string;
  description: string;
  destination: string;
  status: ApiTripStatus;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number;
  currency: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  name: string;
  description?: string;
  destination?: string;
  startDate?: string | null;
  endDate?: string | null;
  currency?: string;
  budgetCents?: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class TripApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${getAppConfig().apiBaseUrl}/trips`;

  list(): Observable<ApiTrip[]> {
    return this.http
      .get<ApiEnvelope<ApiTrip[]>>(this.base)
      .pipe(map((res) => res.data));
  }

  getById(id: string): Observable<ApiTrip> {
    return this.http
      .get<ApiEnvelope<ApiTrip>>(`${this.base}/${id}`)
      .pipe(map((res) => res.data));
  }

  create(payload: CreateTripPayload): Observable<ApiTrip> {
    return this.http
      .post<ApiEnvelope<ApiTrip>>(this.base, payload)
      .pipe(map((res) => res.data));
  }
}
