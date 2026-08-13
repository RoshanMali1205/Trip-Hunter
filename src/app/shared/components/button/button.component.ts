import { Component, Input, booleanAttribute } from '@angular/core';
import { RouterLink } from '@angular/router';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link' | 'link-danger';
export type ButtonSize = 'sm' | 'md';

/**
 * Standard button across the app. Variants: primary/danger are gradient-filled
 * CTAs, secondary is outlined, ghost is a quiet neutral action, link/link-danger
 * are inline text actions (e.g. row-level "Edit"/"Reject"). Pass `routerLink`
 * to render as a navigable `<a>` instead of a `<button>` (e.g. CTA cards).
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (routerLink) {
      <a
        [routerLink]="routerLink"
        [class]="'th-btn th-btn--' + variant + ' th-btn--' + size + (fullWidth ? ' th-btn--block' : '')"
      >
        <ng-content />
      </a>
    } @else {
      <button
        [type]="type"
        [disabled]="disabled || loading"
        [class]="'th-btn th-btn--' + variant + ' th-btn--' + size + (fullWidth ? ' th-btn--block' : '')"
      >
        @if (loading) {
          <span class="th-btn__spinner" aria-hidden="true"></span>
        }
        <ng-content />
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .th-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        border: 1px solid transparent;
        border-radius: 999px;
        font-family: var(--th-font-body);
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease,
          background-color 0.15s ease,
          color 0.15s ease;
      }

      .th-btn:disabled {
        cursor: not-allowed;
        opacity: 0.6;
        transform: none !important;
      }

      .th-btn--md {
        padding: 0.65rem 1.35rem;
        font-size: 0.92rem;
      }

      .th-btn--sm {
        padding: 0.4rem 0.9rem;
        font-size: 0.8rem;
      }

      .th-btn--block {
        width: 100%;
        height: 44px;
      }

      .th-btn--primary {
        background: linear-gradient(135deg, var(--th-primary-light), var(--th-primary) 55%, var(--th-primary-dark));
        color: #fff;
        box-shadow: 0 10px 24px rgba(255, 106, 26, 0.28);
      }
      .th-btn--primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 14px 30px rgba(255, 106, 26, 0.36);
      }
      .th-btn--primary:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 6px 16px rgba(255, 106, 26, 0.3);
      }

      .th-btn--secondary {
        background: transparent;
        border-color: var(--th-primary);
        color: var(--th-primary-dark);
      }
      .th-btn--secondary:hover:not(:disabled) {
        background: var(--th-accent-soft);
      }

      .th-btn--ghost {
        background: transparent;
        border-color: var(--th-border-strong);
        color: var(--th-text-secondary);
      }
      .th-btn--ghost:hover:not(:disabled) {
        background: var(--th-surface-muted);
        color: var(--th-text);
      }

      .th-btn--danger {
        background: linear-gradient(135deg, #f87171, var(--th-error) 60%, #b91c1c);
        color: #fff;
        box-shadow: 0 10px 24px rgba(220, 38, 38, 0.25);
      }
      .th-btn--danger:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 14px 30px rgba(220, 38, 38, 0.32);
      }
      .th-btn--danger:active:not(:disabled) {
        transform: translateY(0);
      }

      .th-btn--link,
      .th-btn--link-danger {
        background: none;
        border: none;
        padding: 0;
        font-weight: 650;
      }
      .th-btn--link {
        color: var(--th-primary-dark);
      }
      .th-btn--link-danger {
        color: var(--th-error);
      }
      .th-btn--link:hover:not(:disabled),
      .th-btn--link-danger:hover:not(:disabled) {
        text-decoration: underline;
      }
      .th-btn--link.th-btn--sm,
      .th-btn--link-danger.th-btn--sm {
        font-size: 0.8rem;
      }

      .th-btn__spinner {
        width: 13px;
        height: 13px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        opacity: 0.8;
        animation: th-btn-spin 0.7s linear infinite;
      }

      @keyframes th-btn-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class ButtonComponent {
  @Input() routerLink?: string | unknown[];
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' = 'button';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) fullWidth = false;
}
