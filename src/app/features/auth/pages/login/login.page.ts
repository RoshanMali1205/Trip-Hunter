import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';

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

  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['roshan.deshmukh@company.com', [Validators.required, Validators.email]],
    password: ['demo1234', [Validators.required, Validators.minLength(6)]],
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
        'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=700&q=80',
    },
  ] as const;

  submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter a valid email and password.');
      return;
    }
    const { email, password } = this.form.getRawValue();
    if (this.auth.login(email, password)) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }
    this.error.set('Invalid credentials. Please try again.');
  }

  microsoftLogin(): void {
    this.auth.loginWithMicrosoft();
    void this.router.navigateByUrl('/dashboard');
  }
}
