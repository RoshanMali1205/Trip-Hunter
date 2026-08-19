import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { TripStore } from '../../../../core/services/trip.store';
import { ApiTeam, ApiTeamMember } from '../../../../core/services/trip-api.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { readApiErrorMessage } from '../../../../core/http/api-error-message';

@Component({
  selector: 'app-teams-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './teams.page.html',
  styleUrl: './teams.page.scss',
})
export class TeamsPage {
  private readonly store = inject(TripStore);
  private readonly auth = inject(AuthService);

  readonly teams = computed(() => this.store.getTeams());
  readonly people = computed(() => this.store.getOrgPeople());
  readonly expandedId = signal('');
  readonly showForm = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly name = signal('');
  readonly description = signal('');
  readonly memberEmail = signal('');
  readonly memberRole = signal<ApiTeamMember['role']>('member');
  readonly memberError = signal('');
  readonly addingMember = signal(false);

  constructor() {
    void this.store.loadTeams();
    void this.store.loadOrgPeople();
  }

  detail(teamId: string): ApiTeam | undefined {
    return this.store.getTeamDetail(teamId);
  }

  canManage(team: ApiTeam): boolean {
    const uid = this.auth.user()?.id;
    return !team.createdBy || team.createdBy === uid;
  }

  toggle(team: ApiTeam): void {
    const next = this.expandedId() === team.id ? '' : team.id;
    this.expandedId.set(next);
    this.memberError.set('');
    if (next) void this.store.loadTeam(next);
  }

  async create(): Promise<void> {
    const name = this.name().trim();
    if (!name) return;
    this.creating.set(true);
    this.createError.set('');
    try {
      const team = await this.store.createTeam(name, this.description().trim());
      this.name.set('');
      this.description.set('');
      this.showForm.set(false);
      this.expandedId.set(team.id);
      await this.store.loadTeam(team.id);
    } catch (err) {
      this.createError.set(readApiErrorMessage(err, 'Could not create that team.'));
    } finally {
      this.creating.set(false);
    }
  }

  async removeTeam(team: ApiTeam): Promise<void> {
    if (!confirm(`Delete "${team.name}"? Trips linked to it stay, but the team is removed.`)) {
      return;
    }
    try {
      await this.store.deleteTeam(team.id);
      if (this.expandedId() === team.id) this.expandedId.set('');
    } catch (err) {
      this.createError.set(readApiErrorMessage(err, 'Could not delete that team.'));
    }
  }

  async addMember(team: ApiTeam): Promise<void> {
    const email = this.memberEmail().trim().toLowerCase();
    if (!email) return;
    this.addingMember.set(true);
    this.memberError.set('');
    try {
      await this.store.addTeamMember(team.id, email, this.memberRole());
      this.memberEmail.set('');
      this.memberRole.set('member');
    } catch (err) {
      this.memberError.set(readApiErrorMessage(err, 'Could not add that person.'));
    } finally {
      this.addingMember.set(false);
    }
  }

  addFromDirectory(team: ApiTeam, email: string): void {
    this.memberEmail.set(email);
    void this.addMember(team);
  }

  removeMember(team: ApiTeam, member: ApiTeamMember): void {
    if (!confirm(`Remove ${member.name} from ${team.name}?`)) return;
    void this.store.removeTeamMember(team.id, member.id);
  }
}
