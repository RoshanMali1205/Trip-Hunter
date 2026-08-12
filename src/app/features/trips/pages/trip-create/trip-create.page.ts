import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { TripType } from '../../../../core/models/trip.model';
import { lsGet, lsRemove, lsSet } from '../../../../core/services/local-storage.service';

const DRAFT_KEY = 'trip-create-draft';

@Component({
  selector: 'app-trip-create-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, RouterLink],
  templateUrl: './trip-create.page.html',
  styleUrl: './trip-create.page.scss',
})
export class TripCreatePage {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(TripStore);
  private readonly router = inject(Router);

  readonly step = signal(lsGet(DRAFT_KEY + ':step', 0));
  readonly saving = signal(false);

  readonly steps = [
    'Basics',
    'Location',
    'Dates',
    'Members',
    'Budget',
    'Approval',
    'Review',
  ];

  readonly tripTypes: { value: TripType; label: string }[] = [
    { value: 'BUSINESS', label: 'Business Trip' },
    { value: 'TEAM_OUTING', label: 'Team Outing' },
    { value: 'CORPORATE_OFFSITE', label: 'Offsite' },
    { value: 'TRAINING_CONFERENCE', label: 'Training' },
    { value: 'PROJECT_VISIT', label: 'Project Visit' },
  ];

  readonly form = this.fb.nonNullable.group({
    title: ['Pune Dev Team – Goa Trip 2026', Validators.required],
    tripType: ['TEAM_OUTING' as TripType, Validators.required],
    description: [
      'Annual team outing for the Pune development team to unwind and plan for the next quarter.',
    ],
    origin: ['Pune', Validators.required],
    destination: ['Goa', Validators.required],
    startDate: [''],
    endDate: [''],
    maxMembers: [15, [Validators.required, Validators.min(2)]],
    currency: ['INR'],
    estimatedBudget: [140000, [Validators.required, Validators.min(0)]],
    approvalRequired: ['yes'],
  });

  constructor() {
    const draft = lsGet<Record<string, unknown> | null>(DRAFT_KEY, null);
    if (draft) {
      this.form.patchValue(draft as never);
    }
    this.form.valueChanges.subscribe((v) => lsSet(DRAFT_KEY, v));
  }

  next(): void {
    if (this.step() < this.steps.length - 1) {
      this.step.update((s) => s + 1);
      lsSet(DRAFT_KEY + ':step', this.step());
    }
  }

  back(): void {
    if (this.step() > 0) {
      this.step.update((s) => s - 1);
      lsSet(DRAFT_KEY + ':step', this.step());
    }
  }

  selectType(type: TripType): void {
    this.form.controls.tripType.setValue(type);
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.step.set(0);
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const trip = this.store.createTrip({
      title: v.title,
      tripType: v.tripType,
      description: v.description,
      origin: v.origin,
      destination: v.destination,
      startDate: v.startDate || null,
      endDate: v.endDate || null,
      maxMembers: v.maxMembers,
      estimatedBudget: v.estimatedBudget,
      currency: v.currency,
      approvalStatus: v.approvalRequired === 'yes' ? 'PENDING' : 'NOT_REQUIRED',
      memberCount: 1,
    });
    lsRemove(DRAFT_KEY);
    lsRemove(DRAFT_KEY + ':step');
    this.saving.set(false);
    void this.router.navigate(['/trips', trip.id]);
  }
}
