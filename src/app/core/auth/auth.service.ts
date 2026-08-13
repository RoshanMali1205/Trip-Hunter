import { Injectable, computed, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { AuthSession, OrgRole, UserProfile } from '../models/user.model';
import { CURRENT_USER } from '../data/mock-data';
import { isSupabaseBrowserConfigured } from '../config/app-config';
import { getSupabaseBrowserClient } from '../supabase/supabase-browser.client';
import { lsGet, lsRemove, lsSet } from '../services/local-storage.service';

const SESSION_KEY = 'auth-session';

export type AuthMode = 'supabase' | 'demo';

export interface AuthResult {
  ok: boolean;
  message?: string;
  /** Email confirmation required before session exists. */
  needsEmailConfirmation?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly readySignal = signal(false);
  private readonly sessionSignal = signal<AuthSession | null>(null);
  private readonly modeSignal = signal<AuthMode>(
    isSupabaseBrowserConfigured() ? 'supabase' : 'demo',
  );

  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this.sessionSignal());
  readonly authMode = this.modeSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();

  constructor() {
    void this.bootstrap();
  }

  private persist(session: AuthSession | null): void {
    if (session) lsSet(SESSION_KEY, session);
    else lsRemove(SESSION_KEY);
  }

  private async bootstrap(): Promise<void> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      // Demo: restore prior session only — do not auto-login.
      const stored = lsGet<AuthSession | null>(SESSION_KEY, null);
      if (stored?.accessToken && stored.user) {
        this.sessionSignal.set(stored);
      }
      this.readySignal.set(true);
      return;
    }

    this.modeSignal.set('supabase');

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await this.applySupabaseSession(data.session);
    } else {
      this.sessionSignal.set(null);
      this.persist(null);
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (session) {
          await this.applySupabaseSession(session);
        } else {
          this.sessionSignal.set(null);
          this.persist(null);
        }
      })();
    });

    this.readySignal.set(true);
  }

  private async applySupabaseSession(session: Session): Promise<void> {
    const profile = await this.resolveProfile(session.user);
    const next: AuthSession = {
      user: profile,
      accessToken: session.access_token,
    };
    this.sessionSignal.set(next);
    this.persist(next);
  }

  private async resolveProfile(user: User): Promise<UserProfile> {
    const supabase = getSupabaseBrowserClient();
    const meta = user.user_metadata ?? {};
    const email = user.email ?? '';
    const firstFromMeta = String(meta['first_name'] ?? '').trim();
    const lastFromMeta = String(meta['last_name'] ?? '').trim();
    const display = String(meta['display_name'] ?? '').trim();

    let displayName = display;
    let organizationId = '';
    let organizationName = 'Trip Hunter';
    let role: OrgRole = 'MEMBER';

    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.display_name) {
        displayName = profile.display_name;
      }

      const { data: membership } = await supabase
        .from('org_members')
        .select('organization_id, role, organizations(name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membership) {
        organizationId = membership.organization_id;
        role = mapOrgRole(String(membership.role ?? 'member'));
        const org = membership.organizations as
          | { name?: string }
          | { name?: string }[]
          | null;
        if (Array.isArray(org)) {
          organizationName = org[0]?.name ?? organizationName;
        } else if (org?.name) {
          organizationName = org.name;
        }
      }
    }

    const nameParts = (displayName || email.split('@')[0] || 'User').split(/\s+/);
    const firstName = firstFromMeta || nameParts[0] || 'User';
    const lastName = lastFromMeta || nameParts.slice(1).join(' ') || '';

    return {
      id: user.id,
      firstName,
      lastName,
      email,
      timezone: 'Asia/Kolkata',
      organizationId: organizationId || 'pending-org',
      organizationName,
      role,
    };
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      return { ok: false, message: 'Enter email and password.' };
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return this.demoSignIn(trimmed);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });

    if (error) {
      return { ok: false, message: error.message };
    }
    if (data.session) {
      await this.applySupabaseSession(data.session);
    }
    return { ok: true };
  }

  async signUp(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResult> {
    const email = input.email.trim();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();

    if (!email || !input.password || !firstName) {
      return { ok: false, message: 'Name, email, and password are required.' };
    }
    if (input.password.length < 6) {
      return { ok: false, message: 'Password must be at least 6 characters.' };
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return this.demoSignIn(email, firstName, lastName);
    }

    const displayName = [firstName, lastName].filter(Boolean).join(' ');
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
        },
      },
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    if (data.session) {
      await this.applySupabaseSession(data.session);
      return { ok: true };
    }

    return {
      ok: true,
      needsEmailConfirmation: true,
      message: 'Account created. Check your email to confirm, then sign in.',
    };
  }

  async signInWithMicrosoft(): Promise<AuthResult> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      const session = { user: CURRENT_USER, accessToken: 'demo-ms-token' };
      this.sessionSignal.set(session);
      this.persist(session);
      return { ok: true };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'email profile openid',
      },
    });

    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  /** Finish PKCE / magic-link redirect on `/auth/callback`. */
  async handleAuthCallback(): Promise<AuthResult> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { ok: false, message: 'Supabase is not configured.' };
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { ok: false, message: error.message };
    }
    if (!data.session) {
      return { ok: false, message: 'No session found after redirect.' };
    }
    await this.applySupabaseSession(data.session);
    return { ok: true };
  }

  async logout(): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    this.sessionSignal.set(null);
    this.persist(null);
  }

  private demoSignIn(
    email: string,
    firstName?: string,
    lastName?: string,
  ): AuthResult {
    const derivedFirst =
      firstName ||
      email.split('@')[0]?.split('.')[0] ||
      CURRENT_USER.firstName;
    const user: UserProfile = {
      ...CURRENT_USER,
      email,
      firstName: capitalize(derivedFirst),
      lastName: lastName ?? CURRENT_USER.lastName,
    };
    const session = { user, accessToken: 'demo-token' };
    this.sessionSignal.set(session);
    this.persist(session);
    return { ok: true };
  }
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mapOrgRole(role: string): OrgRole {
  switch (role.toLowerCase()) {
    case 'owner':
      return 'OWNER';
    case 'admin':
      return 'ORG_ADMIN';
    case 'viewer':
      return 'VIEWER';
    default:
      return 'MEMBER';
  }
}
