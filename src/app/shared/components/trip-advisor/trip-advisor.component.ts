import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  AdvisorApiService,
  AdvisorChatMessage,
  AdvisorInfo,
} from '../../../core/services/advisor-api.service';
import { ButtonComponent } from '../button/button.component';
import { formatBuddyMarkdown } from './buddy-markdown';

interface UiMessage {
  role: 'user' | 'model';
  text: string;
}

@Component({
  selector: 'app-trip-advisor',
  standalone: true,
  imports: [FormsModule, MatIconModule, ButtonComponent],
  templateUrl: './trip-advisor.component.html',
  styleUrl: './trip-advisor.component.scss',
})
export class TripAdvisorComponent implements OnInit {
  private readonly api = inject(AdvisorApiService);

  @ViewChild('scrollRegion') scrollRegion?: ElementRef<HTMLDivElement>;

  readonly open = signal(false);
  readonly draft = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly info = signal<AdvisorInfo | null>(null);
  readonly messages = signal<UiMessage[]>([]);

  formatMessage(text: string): string {
    return formatBuddyMarkdown(text);
  }

  ngOnInit(): void {
    this.api.info().subscribe({
      next: (info) => {
        this.info.set(info);
        this.messages.set([{ role: 'model', text: info.greeting }]);
      },
      error: () => {
        this.info.set({
          name: 'Buddy',
          title: 'India Trip Advisor',
          greeting:
            'Hi Buddy! I’m your India trip specialist — ask me about destinations, seasons, and itineraries.',
          suggestions: [
            '3-day Goa team outing from Pune',
            'Best time to visit Manali for an offsite',
            'Weekend near Bangalore under ₹8k/person',
          ],
          configured: false,
        });
        this.messages.set([
          {
            role: 'model',
            text: 'Hi Buddy! I’m online for UI preview, but Gemini isn’t configured yet on the server.',
          },
        ]);
      },
    });
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  useSuggestion(text: string): void {
    this.draft.set(text);
    void this.send();
  }

  async send(): Promise<void> {
    const text = this.draft().trim();
    if (!text || this.busy()) return;

    this.draft.set('');
    this.error.set('');
    this.messages.update((list) => [...list, { role: 'user', text }]);
    this.busy.set(true);
    this.scrollToBottom();

    const prior = this.messages().slice(0, -1);
    let start = 0;
    while (start < prior.length && prior[start].role === 'model') start += 1;
    const history: AdvisorChatMessage[] = prior
      .slice(start)
      .filter((m) => m.text.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, text: m.text }));

    this.api.chat(text, history).subscribe({
      next: (res) => {
        this.messages.update((list) => [...list, { role: 'model', text: res.reply }]);
        this.busy.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        const msg =
          err?.error?.error?.message ||
          err?.message ||
          'Could not reach Buddy. Check GEMINI_API_KEY and try again.';
        this.error.set('');
        this.messages.update((list) => [
          ...list,
          {
            role: 'model',
            text: msg.startsWith('Hmm') ? msg : `Hmm — ${msg}`,
          },
        ]);
        this.busy.set(false);
        this.scrollToBottom();
      },
    });
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      const el = this.scrollRegion?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
