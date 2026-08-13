import { Injectable, computed, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { AuthSession, OrgRole, UserProfile } from '../models/user.model';
import { CURRENT_USER } from '../data/mock-data';
import { isSupabaseBrowserConfigured } from '../config/app-config';
import { getSupabaseBrowserClient } from '../supabase/supabase-browser.client';
import { lsGet, lsRemove, lsSet } from '../services/local-storage.service';

const SESSION_KEY = 'auth-session';
const PENDING_AVATAR_KEY = 'th-pending-avatar';

export type AuthMode = 'supabase' | 'demo';

export interface AuthResult {
  ok: boolean;
  message?: string;
  /** Email confirmation required before session exists. */
  needsEmailConfirmation?: boolean;
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** Optional profile photo selected during create-account. */
  avatarFile?: File | null;
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
    await this.flushPendingAvatar(session.user.id);
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
    const phoneFromMeta = String(meta['phone'] ?? '').trim();

    let displayName = display;
    let phone = phoneFromMeta;
    let avatarUrl = String(meta['avatar_url'] ?? '').trim();
    let organizationId = '';
    let organizationName = 'Trip Hunter';
    let role: OrgRole = 'MEMBER';

    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, email, phone, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.display_name) {
        displayName = profile.display_name;
      }
      if (profile?.phone) {
        phone = profile.phone;
      }
      if (profile?.avatar_url) {
        avatarUrl = profile.avatar_url;
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
      phone: phone || undefined,
      avatarUrl: avatarUrl || undefined,
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

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const email = input.email.trim();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const phone = normalizePhone(input.phone);

    if (!email || !input.password || !firstName) {
      return { ok: false, message: 'Name, email, and password are required.' };
    }
    if (!phone) {
      return { ok: false, message: 'Enter a valid phone number (at least 10 digits).' };
    }
    if (input.password.length < 6) {
      return { ok: false, message: 'Password must be at least 6 characters.' };
    }
    if (input.avatarFile) {
      const photoError = validateAvatarFile(input.avatarFile);
      if (photoError) return { ok: false, message: photoError };
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      let avatarUrl: string | undefined;
      if (input.avatarFile) {
        avatarUrl = await fileToDataUrl(input.avatarFile);
      }
      return this.demoSignIn(email, firstName, lastName, phone, avatarUrl);
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
          phone,
        },
      },
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    if (data.session && data.user) {
      await this.saveProfileExtras(data.user.id, phone, input.avatarFile ?? null);
      await this.applySupabaseSession(data.session);
      return { ok: true };
    }

    // Email confirmation required — keep avatar until first authenticated session.
    if (input.avatarFile) {
      await this.stashPendingAvatar(email, input.avatarFile);
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

  private async saveProfileExtras(
    userId: string,
    phone: string,
    avatarFile: File | null,
  ): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let avatarUrl: string | undefined;
    if (avatarFile) {
      avatarUrl = await this.uploadAvatar(userId, avatarFile);
    }

    const patch: { phone: string; avatar_url?: string; updated_at: string } = {
      phone,
      updated_at: new Date().toISOString(),
    };
    if (avatarUrl) patch.avatar_url = avatarUrl;

    await supabase.from('profiles').update(patch).eq('id', userId);

    if (avatarUrl) {
      await supabase.auth.updateUser({
        data: { phone, avatar_url: avatarUrl },
      });
    }
  }

  private async uploadAvatar(userId: string, file: File): Promise<string | undefined> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return undefined;

    const ext = extensionForMime(file.type) || 'jpg';
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
      cacheControl: '3600',
    });

    if (error) {
      console.warn('Avatar upload failed', error.message);
      return undefined;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Bust CDN cache after replace.
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  private async stashPendingAvatar(email: string, file: File): Promise<void> {
    try {
      const dataUrl = await fileToDataUrl(file);
      sessionStorage.setItem(
        PENDING_AVATAR_KEY,
        JSON.stringify({
          email: email.trim().toLowerCase(),
          dataUrl,
          mime: file.type || 'image/jpeg',
        }),
      );
    } catch {
      // Ignore stash failures — signup still succeeds without photo.
    }
  }

  private async flushPendingAvatar(userId: string): Promise<void> {
    const raw = sessionStorage.getItem(PENDING_AVATAR_KEY);
    if (!raw) return;

    try {
      const pending = JSON.parse(raw) as {
        email?: string;
        dataUrl?: string;
        mime?: string;
      };
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !pending.dataUrl) {
        sessionStorage.removeItem(PENDING_AVATAR_KEY);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const email = (userData.user?.email ?? '').toLowerCase();
      if (pending.email && email && pending.email !== email) {
        return;
      }

      const file = dataUrlToFile(pending.dataUrl, `avatar.${extensionForMime(pending.mime ?? '') || 'jpg'}`);
      const avatarUrl = await this.uploadAvatar(userId, file);
      if (avatarUrl) {
        await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq('id', userId);
        await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
      }
      sessionStorage.removeItem(PENDING_AVATAR_KEY);
    } catch {
      sessionStorage.removeItem(PENDING_AVATAR_KEY);
    }
  }

  private demoSignIn(
    email: string,
    firstName?: string,
    lastName?: string,
    phone?: string,
    avatarUrl?: string,
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
      phone: phone || CURRENT_USER.phone,
      avatarUrl: avatarUrl || CURRENT_USER.avatarUrl,
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

/** Keep digits and leading +, require ≥10 digits. */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return '';
  return hasPlus ? `+${digits}` : digits;
}

export function validateAvatarFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    return 'Photo must be a JPG, PNG, WebP, or GIF.';
  }
  if (file.size > 2 * 1024 * 1024) {
    return 'Photo must be 2 MB or smaller.';
  }
  return null;
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    default:
      return '';
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read photo'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, body] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(header ?? '')?.[1] ?? 'image/jpeg';
  const binary = atob(body ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
