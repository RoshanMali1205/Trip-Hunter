import { Injectable, computed, signal } from '@angular/core';
import { AuthSession, UserProfile } from '../models/user.model';
import { CURRENT_USER } from '../data/mock-data';
import { lsGet, lsRemove, lsSet } from '../services/local-storage.service';

const SESSION_KEY = 'auth-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionSignal = signal<AuthSession | null>(
    lsGet<AuthSession | null>(SESSION_KEY, {
      user: CURRENT_USER,
      accessToken: 'demo-token',
    }),
  );

  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this.sessionSignal());

  private persist(session: AuthSession | null): void {
    if (session) lsSet(SESSION_KEY, session);
    else lsRemove(SESSION_KEY);
  }

  login(email: string, _password: string): boolean {
    if (!email.trim()) return false;
    const user: UserProfile = {
      ...CURRENT_USER,
      email,
      firstName: email.split('@')[0]?.split('.')[0] || CURRENT_USER.firstName,
    };
    const session = { user, accessToken: 'demo-token' };
    this.sessionSignal.set(session);
    this.persist(session);
    return true;
  }

  loginWithMicrosoft(): boolean {
    const session = { user: CURRENT_USER, accessToken: 'demo-ms-token' };
    this.sessionSignal.set(session);
    this.persist(session);
    return true;
  }

  logout(): void {
    this.sessionSignal.set(null);
    this.persist(null);
  }
}
