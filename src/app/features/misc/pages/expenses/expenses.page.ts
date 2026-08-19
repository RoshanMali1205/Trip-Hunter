import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripStore } from '../../../../core/services/trip.store';
import { InrCurrencyPipe } from '../../../../shared/pipes/format.pipe';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ApiSettlement } from '../../../../core/services/trip-api.service';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [InrCurrencyPipe, RouterLink, ButtonComponent],
  templateUrl: './expenses.page.html',
  styleUrl: './expenses.page.scss',
})
export class ExpensesPage {
  private readonly store = inject(TripStore);
  readonly summary = computed(() => this.store.getDashboard().expenseSummary);
  readonly settlements = computed(() => this.store.getOrgSettlements());
  readonly openSettlements = computed(() => this.settlements().filter((s) => !s.paid));
  readonly paidSettlements = computed(() => this.settlements().filter((s) => s.paid));

  constructor() {
    void this.store.loadOrgSettlements();
  }

  markPaid(line: ApiSettlement): void {
    if (!line.tripId) return;
    void this.store.markSettlementPaid(line.tripId, line.fromUserId, line.toUserId);
  }
}
