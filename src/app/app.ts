import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallService } from './core/pwa/pwa-install.service';
import { PwaUpdateService } from './core/pwa/pwa-update.service';
import { ButtonComponent } from './shared/components/button/button.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonComponent],
  template: `
    @if (updates.updateAvailable()) {
      <div class="pwa-banner pwa-banner--update" role="status">
        <span>A new version of Trip Hunter is ready.</span>
        <app-button variant="ghost-inverted" size="sm" (click)="updates.activateUpdate()">
          Refresh
        </app-button>
      </div>
    } @else if (install.canInstall()) {
      <div class="pwa-banner pwa-banner--install" role="dialog" aria-label="Install app">
        <span>Install Trip Hunter for faster access offline-ready.</span>
        <div class="pwa-banner__actions">
          <app-button variant="ghost-inverted" size="sm" (click)="install.dismiss()">
            Not now
          </app-button>
          <app-button size="sm" (click)="install.promptInstall()">Install</app-button>
        </div>
      </div>
    }
    <router-outlet />
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }

      .pwa-banner {
        position: sticky;
        top: 0;
        z-index: 1000;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        font-family: var(--th-font-body, system-ui, sans-serif);
        font-size: 0.92rem;
        color: #fff;
        background: #14181f;
        box-shadow: 0 8px 24px rgba(20, 24, 31, 0.18);
      }

      .pwa-banner--update {
        background: linear-gradient(90deg, #e85a0f, #ff6a1a);
      }

      .pwa-banner--install {
        background: #1f2937;
      }

      .pwa-banner__actions {
        display: flex;
        gap: 0.45rem;
      }
    `,
  ],
})
export class App implements OnInit {
  readonly updates = inject(PwaUpdateService);
  readonly install = inject(PwaInstallService);

  ngOnInit(): void {
    this.updates.start();
    this.install.start();
  }
}
