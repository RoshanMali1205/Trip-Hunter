import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { LazySrcDirective, ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import {
  EXPLORE_FILMSTRIP,
  EXPLORE_HERO_IMAGE,
  EXPLORE_PIN_STAGES,
  EXPLORE_STORIES,
  ExploreStory,
} from './explore.content';

@Component({
  selector: 'app-explore-page',
  standalone: true,
  imports: [RouterLink, MatIconModule, ButtonComponent, ScrollRevealDirective, LazySrcDirective],
  templateUrl: './explore.page.html',
  styleUrl: './explore.page.scss',
})
export class ExplorePage implements AfterViewInit, OnDestroy {
  @ViewChild('pinTrack') private pinTrack?: ElementRef<HTMLElement>;

  readonly heroImage = EXPLORE_HERO_IMAGE;
  readonly pinStages = EXPLORE_PIN_STAGES;
  readonly filmstrip = EXPLORE_FILMSTRIP;
  readonly allStories = EXPLORE_STORIES;

  readonly visibleCount = signal(2);
  readonly pinProgress = signal(0);
  readonly pinStage = computed(() => {
    const p = this.pinProgress();
    if (p < 0.34) return 0;
    if (p < 0.67) return 1;
    return 2;
  });

  readonly stories = computed((): ExploreStory[] =>
    this.allStories.slice(0, this.visibleCount()),
  );
  readonly hasMore = computed(() => this.visibleCount() < this.allStories.length);

  private raf = 0;

  ngAfterViewInit(): void {
    this.updatePin();
  }

  ngOnDestroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.updatePin();
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updatePin();
  }

  loadMore(): void {
    if (!this.hasMore()) return;
    this.visibleCount.update((n) => Math.min(this.allStories.length, n + 2));
  }

  onStoryRevealed(isLast: boolean): void {
    if (isLast) this.loadMore();
  }

  private updatePin(): void {
    const el = this.pinTrack?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    if (total <= 0) {
      this.pinProgress.set(0);
      return;
    }
    this.pinProgress.set(Math.min(1, Math.max(0, -rect.top / total)));
  }
}
