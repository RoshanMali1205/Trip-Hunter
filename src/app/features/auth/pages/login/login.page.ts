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
