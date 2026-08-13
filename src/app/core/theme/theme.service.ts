import { Injectable, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { lsGet, lsSet } from '../services/local-storage.service';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly mode = signal<ThemeMode>(lsGet<ThemeMode>('theme', 'light'));

  constructor() {
    effect(() => {
      this.apply(this.mode());
    });
  }

  toggle(): void {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private apply(mode: ThemeMode): void {
    lsSet('theme', mode);
    const root = this.document.documentElement;
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;

    const meta = this.document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', mode === 'dark' ? '#0f1218' : '#ff6a1a');
    }
  }
}
