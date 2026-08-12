import { Injectable, computed, signal } from '@angular/core';
import { AuthSession, UserProfile } from '../models/user.model';
import { CURRENT_USER } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionSignal = signal<AuthSession | null>({
    user: CURRENT_USER,
    accessToken: 'demo-token',
  });

  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this.sessionSignal());

  login(email: string, _password: string): boolean {
    if (!email.trim()) {
      return false;
    }
    const user: UserProfile = {
      ...CURRENT_USER,
      email,
      firstName: email.split('@')[0]?.split('.')[0] || 'User',
    };
    this.sessionSignal.set({ user, accessToken: 'demo-token' });
    return true;
  }

  loginWithMicrosoft(): boolean {
    this.sessionSignal.set({ user: CURRENT_USER, accessToken: 'demo-ms-token' });
    return true;
  }

  logout(): void {
    this.sessionSignal.set(null);
  }
}
