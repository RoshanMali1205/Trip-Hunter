import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { getAppConfig } from '../config/app-config';
import { ApiEnvelope } from './trip-api.service';

export interface AdvisorInfo {
  name: string;
  title: string;
  greeting: string;
  suggestions: string[];
  configured: boolean;
}

export interface AdvisorChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AdvisorChatResult {
  reply: string;
  model: string;
}

@Injectable({ providedIn: 'root' })
export class AdvisorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${getAppConfig().apiBaseUrl}/advisor`;

  info(): Observable<AdvisorInfo> {
    return this.http.get<ApiEnvelope<AdvisorInfo>>(this.base).pipe(map((res) => res.data));
  }

  chat(message: string, history: AdvisorChatMessage[]): Observable<AdvisorChatResult> {
    return this.http
      .post<ApiEnvelope<AdvisorChatResult>>(`${this.base}/chat`, { message, history })
      .pipe(map((res) => res.data));
  }
}
