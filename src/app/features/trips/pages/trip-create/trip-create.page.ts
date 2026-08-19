import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { TripType } from '../../../../core/models/trip.model';
import { lsGet, lsRemove, lsSet } from '../../../../core/services/local-storage.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ToastService } from '../../../../core/ui/toast.service';
import { readApiErrorMessage } from '../../../../core/http/api-error-message';

const DRAFT_KEY = 'trip-create-draft';

type CreateField =
  | 'title'
  | 'tripType'
  | 'description'
  | 'origin'
  | 'destination'
  | 'startDate'
  | 'endDate'
  | 'maxMembers'
  | 'currency'
  | 'estimatedBudget'
  | 'approvalRequired';

@Component({
  selector: 'app-trip-create-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, RouterLink, ButtonComponent],
  templateUrl: './trip-create.page.html',
  styleUrl: './trip-create.page.scss',
})
export class TripCreatePage {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(TripStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly step = signal(lsGet(DRAFT_KEY + ':step', 0));
  readonly saving = signal(false);
  readonly error = signal('');

  readonly steps = [
    'Basics',
    'Location',
    'Dates',
    'Members',
    'Budget',
    'Approval',
    'Review',
  ];

  private readonly stepFields: CreateField[][] = [
    ['title', 'tripType'],
    ['origin', 'destination'],
    ['startDate', 'endDate'],
    ['maxMembers'],
    ['estimatedBudget', 'currency'],
    ['approvalRequired'],
    [],
  ];

  readonly tripTypes: { value: TripType; label: string }[] = [
    { value: 'BUSINESS', label: 'Business Trip' },
    { value: 'TEAM_OUTING', label: 'Team Outing' },
    { value: 'CORPORATE_OFFSITE', label: 'Offsite' },
    { value: 'TRAINING_CONFERENCE', label: 'Training' },
    { value: 'PROJECT_VISIT', label: 'Project Visit' },
  ];

  readonly teams = computed(() => this.store.getTeams());

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
    teamId: [''],
  });

  constructor() {
    const draft = lsGet<Record<string, unknown> | null>(DRAFT_KEY, null);
    if (draft) {
      this.form.patchValue(draft as never);
    }
    this.form.valueChanges.subscribe((v) => lsSet(DRAFT_KEY, v));
    void this.store.loadTeams();
  }

  next(): void {
    if (!this.validateStep(this.step())) {
      return;
    }
    if (this.step() < this.steps.length - 1) {
      this.step.update((s) => s + 1);
      lsSet(DRAFT_KEY + ':step', this.step());
    }
  }

  back(): void {
    this.error.set('');
    if (this.step() > 0) {
      this.step.update((s) => s - 1);
      lsSet(DRAFT_KEY + ':step', this.step());
    }
  }

  selectType(type: TripType): void {
    this.form.controls.tripType.setValue(type);
  }

  async create(): Promise<void> {
    if (!this.validateAll()) {
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    try {
      const trip = await this.store.createTrip({
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
        approvalRequired: v.approvalRequired === 'yes',
        approvalStatus: v.approvalRequired === 'yes' ? 'PENDING' : 'NOT_REQUIRED',
        memberCount: 1,
        teamId: v.teamId || null,
      });
      lsRemove(DRAFT_KEY);
      lsRemove(DRAFT_KEY + ':step');
      this.toast.success(`${trip.title} is ready for planning.`, 'Trip created');
      void this.router.navigate(['/trips', trip.id]);
    } catch (err) {
      const message = readApiErrorMessage(
        err,
        'Could not create the trip. Please try again.',
      );
      this.error.set(message);
      this.toast.error(message, 'Could not create trip');
    } finally {
      this.saving.set(false);
    }
  }

  private dateRangeInvalid(): boolean {
    const start = this.form.controls.startDate.value;
    const end = this.form.controls.endDate.value;
    return Boolean(start && end && start > end);
  }

  private validateStep(index: number): boolean {
    const names = this.stepFields[index] ?? [];
    let ok = true;
    for (const name of names) {
      const control = this.form.controls[name];
      control.markAsTouched();
      if (control.invalid) {
        ok = false;
      }
    }
    if (index === 2 && this.dateRangeInvalid()) {
      this.error.set('End date must be on or after the start date.');
      return false;
    }
    this.error.set(ok ? '' : 'Please complete the required fields on this step.');
    return ok;
  }

  private validateAll(): boolean {
    this.form.markAllAsTouched();
    if (this.dateRangeInvalid()) {
      this.step.set(2);
      this.error.set('End date must be on or after the start date.');
      return false;
    }
    if (this.form.invalid) {
      const firstInvalid = this.stepFields.findIndex((names) =>
        names.some((name) => this.form.controls[name].invalid),
      );
      this.step.set(firstInvalid === -1 ? 0 : firstInvalid);
      this.error.set('Please complete the required fields before creating the trip.');
      return false;
    }
    this.error.set('');
    return true;
  }
}
