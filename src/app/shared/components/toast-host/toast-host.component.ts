import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ToastKind, ToastService } from '../../../core/ui/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './toast-host.component.html',
  styleUrl: './toast-host.component.scss',
})
export class ToastHostComponent {
  readonly toasts = inject(ToastService);

  iconFor(kind: ToastKind): string {
    switch (kind) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'notifications';
    }
  }

  dismiss(id: string): void {
    this.toasts.dismiss(id);
  }
}
