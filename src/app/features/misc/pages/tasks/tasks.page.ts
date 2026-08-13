import { Component, computed, inject } from '@angular/core';
import { TripStore } from '../../../../core/services/trip.store';
import { StatusLabelPipe } from '../../../../shared/pipes/format.pipe';
import { TripTask } from '../../../../core/models/trip.model';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [StatusLabelPipe],
  templateUrl: './tasks.page.html',
  styleUrl: './tasks.page.scss',
})
export class TasksPage {
  private readonly store = inject(TripStore);
  readonly tasks = computed(() => this.store.getTasks());
  readonly openCount = computed(() => this.tasks().filter((t) => t.status !== 'COMPLETED').length);

  cycle(task: TripTask): void {
    const order: TripTask['status'][] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    this.store.updateTaskStatus(task.id, next);
  }
}
