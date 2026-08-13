import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

/**
 * Keeps installed / returning mobile users on the latest deploy.
 * Angular's service worker otherwise can keep serving a stale shell until
 * the user hard-refreshes or clears site data.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly updates = inject(SwUpdate, { optional: true });

  readonly updateAvailable = signal(false);

  start(): void {
    if (!this.updates?.isEnabled) return;

    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.updateAvailable.set(true));

    this.updates.unrecoverable.subscribe(() => {
      // Corrupt cache — force a clean reload.
      document.location.reload();
    });

    // Check on launch and when the tab becomes visible again (common on mobile).
    void this.updates.checkForUpdate();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.updates?.checkForUpdate();
      }
    });

    // Periodic check while the app stays open.
    window.setInterval(
      () => {
        void this.updates?.checkForUpdate();
      },
      30 * 60 * 1000,
    );
  }

  async activateUpdate(): Promise<void> {
    if (!this.updates?.isEnabled) {
      document.location.reload();
      return;
    }
    try {
      await this.updates.activateUpdate();
    } finally {
      document.location.reload();
    }
  }
}
