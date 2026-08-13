import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-callback-page',
  standalone: true,
  template: `
    <section class="callback">
      <p class="callback__brand">Trip Hunter</p>
      <h1>{{ title() }}</h1>
      <p>{{ message() }}</p>
    </section>
  `,
  styles: `
    .callback {
      min-height: 100vh;
      display: grid;
      place-content: center;
      gap: 0.5rem;
      padding: 2rem;
      text-align: center;
      background:
        radial-gradient(ellipse at top, rgba(45, 140, 148, 0.18), transparent 55%),
        var(--th-bg);
    }
    .callback__brand {
      margin: 0;
      font-family: var(--th-font-display);
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--th-primary-light);
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
    }
    p {
      margin: 0;
      color: var(--th-text-secondary);
    }
  `,
})
export class AuthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly title = signal('Signing you in…');
  readonly message = signal('Finishing authentication with Supabase.');

  async ngOnInit(): Promise<void> {
    const result = await this.auth.handleAuthCallback();
    if (!result.ok) {
      this.title.set('Sign-in incomplete');
      this.message.set(result.message ?? 'Please try again from the login page.');
      setTimeout(() => void this.router.navigateByUrl('/login'), 1600);
      return;
    }
    this.title.set('Welcome');
    this.message.set('Redirecting to your dashboard…');
    await this.router.navigateByUrl('/dashboard');
  }
}
