import { Component, inject } from '@angular/core';
import { TripStore } from '../../../../core/services/trip.store';
import { InrCurrencyPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [InrCurrencyPipe],
  templateUrl: './expenses.page.html',
  styleUrl: './expenses.page.scss',
})
export class ExpensesPage {
  readonly summary = inject(TripStore).getDashboard().expenseSummary;
}
