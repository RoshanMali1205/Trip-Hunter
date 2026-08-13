import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  message: string;
  ttlMs: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly itemsSignal = signal<ToastItem[]>([]);
  private seq = 0;

  readonly items = this.itemsSignal.asReadonly();

  success(message: string, title = 'Success'): void {
    this.push('success', title, message);
  }

  error(message: string, title = 'Something went wrong'): void {
    this.push('error', title, message, 6500);
  }

  warning(message: string, title = 'Heads up'): void {
    this.push('warning', title, message, 5500);
  }

  info(message: string, title = 'Info'): void {
    this.push('info', title, message);
  }

  /** Convenience for trip / inbox style alerts. */
  notify(title: string, message: string): void {
    this.push('info', title, message, 6000);
  }

  dismiss(id: string): void {
    this.itemsSignal.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, title: string, message: string, ttlMs = 4500): void {
    const id = `toast-${Date.now()}-${++this.seq}`;
    const item: ToastItem = {
      id,
      kind,
      title: title.trim() || 'Trip Hunter',
      message: message.trim() || 'Done.',
      ttlMs,
    };
    this.itemsSignal.update((list) => [...list.slice(-4), item]);
    window.setTimeout(() => this.dismiss(id), ttlMs);
  }
}
