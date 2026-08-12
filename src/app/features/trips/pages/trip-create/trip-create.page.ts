import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { TripType } from '../../../../core/models/trip.model';

@Component({
  selector: 'app-trip-create-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    MatIconModule,
  ],
  templateUrl: './trip-create.page.html',
  styleUrl: './trip-create.page.scss',
})
export class TripCreatePage {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(TripStore);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly tripTypes: { value: TripType; label: string }[] = [
    { value: 'TEAM_OUTING', label: 'Team outing' },
    { value: 'BUSINESS', label: 'Business trip' },
    { value: 'CORPORATE_OFFSITE', label: 'Corporate offsite' },
    { value: 'TRAINING_CONFERENCE', label: 'Training / Conference' },
    { value: 'PROJECT_VISIT', label: 'Project visit' },
  ];

  readonly basics = this.fb.nonNullable.group({
    title: ['', Validators.required],
    tripType: ['TEAM_OUTING' as TripType, Validators.required],
    description: [''],
  });

  readonly location = this.fb.nonNullable.group({
    origin: ['Pune', Validators.required],
    destination: ['', Validators.required],
  });

  readonly dates = this.fb.group({
    startDate: [''],
    endDate: [''],
  });

  readonly members = this.fb.nonNullable.group({
    maxMembers: [15, [Validators.required, Validators.min(2)]],
  });

  readonly budget = this.fb.nonNullable.group({
    currency: ['INR'],
    estimatedBudget: [100000, [Validators.required, Validators.min(0)]],
  });

  readonly approval = this.fb.nonNullable.group({
    approvalRequired: ['yes'],
  });

  create(): void {
    if (
      this.basics.invalid ||
      this.location.invalid ||
      this.members.invalid ||
      this.budget.invalid
    ) {
      this.basics.markAllAsTouched();
      this.location.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const trip = this.store.createTrip({
      ...this.basics.getRawValue(),
      ...this.location.getRawValue(),
      startDate: this.dates.value.startDate || null,
      endDate: this.dates.value.endDate || null,
      maxMembers: this.members.getRawValue().maxMembers,
      estimatedBudget: this.budget.getRawValue().estimatedBudget,
      currency: this.budget.getRawValue().currency,
      approvalStatus: this.approval.value.approvalRequired === 'yes' ? 'PENDING' : 'NOT_REQUIRED',
      memberCount: 1,
    });
    this.saving.set(false);
    void this.router.navigate(['/trips', trip.id]);
  }
}
