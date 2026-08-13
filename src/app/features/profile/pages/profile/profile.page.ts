import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, validateAvatarFile } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../core/ui/toast.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly user = this.auth.user;
  readonly busy = signal(false);
  readonly loggingOut = signal(false);

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (validation) {
      this.toast.warning(validation, 'Photo not accepted');
      input.value = '';
      return;
    }

    this.busy.set(true);
    try {
      const result = await this.auth.updateAvatar(file);
      if (!result.ok) {
        this.toast.error(result.message ?? 'Could not update photo.', 'Upload failed');
        return;
      }
      this.toast.success('Your profile photo was updated.', 'Photo updated');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not update photo. Please try again.';
      this.toast.error(message, 'Upload failed');
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  async logout(): Promise<void> {
    this.loggingOut.set(true);
    try {
      await this.auth.logout();
      this.toast.info('You have been signed out.', 'Logged out');
      await this.router.navigateByUrl('/login');
    } finally {
      this.loggingOut.set(false);
    }
  }
}
