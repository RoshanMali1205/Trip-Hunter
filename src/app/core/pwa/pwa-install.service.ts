import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'th-pwa-install-dismissed';

/** Captures the browser install prompt so we can offer “Add to Home Screen”. */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferred: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal(false);
  readonly isStandalone = signal(isStandaloneDisplay());

  start(): void {
    this.isStandalone.set(isStandaloneDisplay());

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
      if (!sessionStorage.getItem(DISMISS_KEY)) {
        this.canInstall.set(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canInstall.set(false);
      this.isStandalone.set(true);
    });
  }

  async promptInstall(): Promise<void> {
    if (!this.deferred) return;
    await this.deferred.prompt();
    await this.deferred.userChoice;
    this.deferred = null;
    this.canInstall.set(false);
  }

  dismiss(): void {
    sessionStorage.setItem(DISMISS_KEY, '1');
    this.canInstall.set(false);
  }
}

function isStandaloneDisplay(): boolean {
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const ios = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone;
  return mq || !!ios;
}
