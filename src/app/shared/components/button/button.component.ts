import { NgTemplateOutlet } from '@angular/common';
import { Component, Input, booleanAttribute } from '@angular/core';
import { RouterLink } from '@angular/router';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'ghost-inverted'
  | 'danger'
  | 'link'
  | 'link-danger';
export type ButtonSize = 'sm' | 'md';

/**
 * Standard button across the app. Variants: primary/danger are gradient-filled
 * CTAs, secondary is outlined, ghost is a quiet neutral action, ghost-inverted
 * is a translucent action for use over photos/dark hero sections, link/link-danger
 * are inline text actions (e.g. row-level "Edit"/"Reject"). Pass `routerLink`
 * to render as a navigable `<a>` instead of a `<button>` (e.g. CTA cards).
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  template: `
    <ng-template #projected><ng-content /></ng-template>

    @if (routerLink) {
      <a
        [routerLink]="routerLink"
        [class]="'th-btn th-btn--' + variant + ' th-btn--' + size + (fullWidth ? ' th-btn--block' : '')"
      >
        <ng-container [ngTemplateOutlet]="projected" />
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
        <ng-container [ngTemplateOutlet]="projected" />
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
        position: relative;
        overflow: hidden;
        isolation: isolate;
        transition:
          transform 0.18s ease,
          box-shadow 0.18s ease,
          background 0.18s ease,
          border-color 0.18s ease,
          color 0.18s ease;
      }

      .th-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, transparent 20%, rgba(255, 255, 255, 0.28), transparent 80%);
        transform: translateX(-120%);
        transition: transform 0.45s ease;
        pointer-events: none;
        z-index: 0;
      }

      .th-btn:hover:not(:disabled)::after {
        transform: translateX(120%);
      }

      .th-btn > * {
        position: relative;
        z-index: 1;
      }

      .th-btn:disabled {
        cursor: not-allowed;
        opacity: 0.6;
        transform: none !important;
      }

      .th-btn--md {
        padding: 0.68rem 1.4rem;
        font-size: 0.92rem;
        min-height: 44px;
      }

      .th-btn--sm {
        padding: 0.42rem 0.95rem;
        font-size: 0.8rem;
        min-height: 36px;
      }

      .th-btn--block {
        width: 100%;
        height: 44px;
      }

      .th-btn--primary {
        background: var(--th-gradient-cta);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.18);
        box-shadow:
          0 12px 28px rgba(255, 106, 26, 0.34),
          0 1px 0 rgba(255, 255, 255, 0.35) inset;
      }
      .th-btn--primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow:
          0 16px 34px rgba(255, 106, 26, 0.42),
          0 1px 0 rgba(255, 255, 255, 0.4) inset;
      }
      .th-btn--primary:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 8px 18px rgba(255, 106, 26, 0.3);
      }

      .th-btn--secondary {
        background:
          linear-gradient(145deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.08)),
          color-mix(in srgb, var(--th-surface-strong) 70%, transparent);
        border-color: color-mix(in srgb, var(--th-primary) 45%, var(--th-border));
        color: var(--th-primary-dark);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: var(--th-shadow-sm);
      }
      .th-btn--secondary:hover:not(:disabled) {
        background: var(--th-gradient-cta-soft);
        border-color: var(--th-primary);
        transform: translateY(-1px);
      }

      .th-btn--ghost {
        background: color-mix(in srgb, var(--th-surface) 70%, transparent);
        border-color: var(--th-border-strong);
        color: var(--th-text-secondary);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      .th-btn--ghost:hover:not(:disabled) {
        background: var(--th-surface-muted);
        color: var(--th-text);
        border-color: color-mix(in srgb, var(--th-primary) 25%, var(--th-border));
      }

      .th-btn--ghost-inverted {
        background: rgba(255, 255, 255, 0.14);
        border-color: rgba(255, 255, 255, 0.42);
        color: #fff;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
      }
      .th-btn--ghost-inverted:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.24);
      }

      .th-btn--danger {
        background: linear-gradient(135deg, #fb7185, var(--th-error) 55%, #b91c1c);
        color: #fff;
        box-shadow: 0 12px 28px rgba(220, 38, 38, 0.28);
      }
      .th-btn--danger:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 16px 34px rgba(220, 38, 38, 0.36);
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
        box-shadow: none;
        overflow: visible;
      }
      .th-btn--link::after,
      .th-btn--link-danger::after {
        display: none;
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
        min-height: auto;
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
