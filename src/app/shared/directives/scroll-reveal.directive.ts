import { Directive, ElementRef, OnDestroy, OnInit, inject, input, output } from '@angular/core';

/**
 * Fades/slides an element in when it enters the viewport (Apple-style chapter reveals).
 * Adds `is-revealed` for CSS; emits once so callers can lazy-load the next chapter.
 */
@Directive({
  selector: '[thReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;
  private revealed = false;

  readonly thRevealOnce = input(true);
  readonly revealedChange = output<void>();

  ngOnInit(): void {
    const node = this.el.nativeElement;
    node.classList.add('th-reveal');

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add('is-revealed');
            if (!this.revealed) {
              this.revealed = true;
              this.revealedChange.emit();
            }
            if (this.thRevealOnce()) {
              this.observer?.unobserve(node);
            }
          } else if (!this.thRevealOnce()) {
            node.classList.remove('is-revealed');
          }
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}

/** Sets `img.src` only when the image is near the viewport. */
@Directive({
  selector: 'img[thLazySrc]',
  standalone: true,
})
export class LazySrcDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLImageElement>);
  private observer: IntersectionObserver | null = null;

  readonly thLazySrc = input.required<string>();

  ngOnInit(): void {
    const img = this.el.nativeElement;
    img.loading = 'lazy';
    img.decoding = 'async';

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const src = this.thLazySrc();
          if (src && img.src !== src) {
            img.src = src;
          }
          this.observer?.unobserve(img);
        }
      },
      { rootMargin: '640px 0px' },
    );
    this.observer.observe(img);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
