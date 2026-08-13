import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  AuthService,
  normalizePhone,
  validateAvatarFile,
} from '../../../../core/auth/auth.service';

type AuthPanel = 'signin' | 'signup';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly panel = signal<AuthPanel>('signin');
  readonly error = signal('');
  readonly info = signal('');
  readonly busy = signal(false);
  readonly isDemo = computed(() => this.auth.authMode() === 'demo');

  readonly avatarPreview = signal<string | null>(null);
  readonly avatarFile = signal<File | null>(null);

  readonly signInForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly signUpForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(1)]],
    lastName: [''],
    phone: ['', [Validators.required, Validators.minLength(10)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  /** Destination photo mosaic for the login half-screen. */
  readonly visualTiles = [
    {
      label: 'Goa beach',
      size: 'hero',
      imageUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    },
    {
      label: 'Coastal cliffs',
      size: 'tall',
      imageUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: 'Hill station',
      size: 'wide',
      imageUrl:
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
    },
    {
      label: 'City lights',
      size: 'square',
      imageUrl:
        'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=700&q=80',
    },
    {
      label: 'Palm shore',
      size: 'square',
      imageUrl:
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=700&q=80',
    },
  ] as const;

  showSignIn(): void {
    this.panel.set('signin');
    this.error.set('');
    this.info.set('');
  }

  showSignUp(): void {
    this.panel.set('signup');
    this.error.set('');
    this.info.set('');
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    const err = validateAvatarFile(file);
    if (err) {
      this.error.set(err);
      input.value = '';
      return;
    }

    this.error.set('');
    this.avatarFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.avatarPreview.set(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }

  clearAvatar(input?: HTMLInputElement): void {
    this.avatarFile.set(null);
    this.avatarPreview.set(null);
    if (input) input.value = '';
  }

  async submitSignIn(): Promise<void> {
    this.error.set('');
    this.info.set('');
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      this.error.set('Enter a valid email and password.');
      return;
    }

    this.busy.set(true);
    try {
      const { email, password } = this.signInForm.getRawValue();
      const result = await this.auth.signIn(email, password);
      if (!result.ok) {
        this.error.set(result.message ?? 'Sign in failed.');
        return;
      }
      await this.router.navigateByUrl('/dashboard');
    } finally {
      this.busy.set(false);
    }
  }

  async submitSignUp(): Promise<void> {
    this.error.set('');
    this.info.set('');
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      this.error.set('Fill in name, phone, email, and a password (6+ characters).');
      return;
    }

    const raw = this.signUpForm.getRawValue();
    if (!normalizePhone(raw.phone)) {
      this.error.set('Enter a valid phone number (at least 10 digits).');
      return;
    }
    if (raw.password !== raw.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.busy.set(true);
    try {
      const result = await this.auth.signUp({
        email: raw.email,
        password: raw.password,
        firstName: raw.firstName,
        lastName: raw.lastName,
        phone: raw.phone,
        avatarFile: this.avatarFile(),
      });

      if (!result.ok) {
        this.error.set(result.message ?? 'Could not create account.');
        return;
      }

      if (result.needsEmailConfirmation) {
        this.info.set(result.message ?? 'Check your email to confirm your account.');
        this.clearAvatar();
        this.showSignIn();
        this.signInForm.patchValue({ email: raw.email, password: '' });
        return;
      }

      await this.router.navigateByUrl('/dashboard');
    } finally {
      this.busy.set(false);
    }
  }

  async microsoftLogin(): Promise<void> {
    this.error.set('');
    this.info.set('');
    this.busy.set(true);
    try {
      const result = await this.auth.signInWithMicrosoft();
      if (!result.ok) {
        this.error.set(result.message ?? 'Microsoft sign-in failed.');
        return;
      }
      // Demo mode sets session immediately; OAuth redirects away.
      if (this.auth.isAuthenticated()) {
        await this.router.navigateByUrl('/dashboard');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
