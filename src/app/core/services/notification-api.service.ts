import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { getAppConfig } from '../config/app-config';
import { ApiEnvelope } from './trip-api.service';

export interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${getAppConfig().apiBaseUrl}/notifications`;

  list(): Observable<ApiNotification[]> {
    return this.http
      .get<ApiEnvelope<ApiNotification[]>>(this.base)
      .pipe(map((res) => res.data));
  }

  markRead(id: string): Observable<ApiNotification> {
    return this.http
      .patch<ApiEnvelope<ApiNotification>>(`${this.base}/${id}/read`, {})
      .pipe(map((res) => res.data));
  }

  markAllRead(): Observable<void> {
    return this.http
      .post<ApiEnvelope<null>>(`${this.base}/read-all`, {})
      .pipe(map(() => undefined));
  }
}
