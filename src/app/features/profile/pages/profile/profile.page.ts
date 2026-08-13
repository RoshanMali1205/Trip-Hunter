import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, validateAvatarFile } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal('');

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (validation) {
      this.error.set(validation);
      this.message.set('');
      input.value = '';
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.auth.updateAvatar(file);
      if (!result.ok) {
        this.error.set(result.message ?? 'Could not update photo.');
        return;
      }
      this.message.set('Profile photo updated.');
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }
}
