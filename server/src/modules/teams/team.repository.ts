import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

export type TeamMemberRole = 'lead' | 'member';

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  email: string;
  role: TeamMemberRole;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  createdBy: string | null;
  memberCount: number;
  createdAt: string;
  members?: TeamMember[];
}

interface TeamRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  profiles: { display_name: string; email: string } | null;
}

const memoryTeams: Team[] = [];
const memoryTeamMembers: TeamMember[] = [];

function mapTeam(row: TeamRow, memberCount = 0): Team {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description ?? '',
    createdBy: row.created_by,
    memberCount,
    createdAt: row.created_at,
  };
}

function mapMember(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    name: row.profiles?.display_name ?? 'Teammate',
    email: row.profiles?.email ?? '',
    role: row.role,
  };
}

export class TeamRepository {
  async findByOrganization(organizationId: string): Promise<Team[]> {
    if (assertDbOrMock('teams') === 'memory') {
      return memoryTeams
        .filter((t) => t.organizationId === organizationId)
        .map((t) => ({
          ...t,
          memberCount: memoryTeamMembers.filter((m) => m.teamId === t.id).length,
        }));
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('teams')
      .select('id, organization_id, name, description, created_by, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const teams = ((data ?? []) as TeamRow[]).map((row) => mapTeam(row));
    if (teams.length === 0) {
      return [];
    }

    const { data: members, error: memberError } = await db
      .from('team_members')
      .select('team_id')
      .in(
        'team_id',
        teams.map((t) => t.id),
      );

    if (memberError) {
      throw new AppError(502, 'DB_ERROR', memberError.message);
    }

    const counts = new Map<string, number>();
    for (const row of (members ?? []) as { team_id: string }[]) {
      counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
    }

    return teams.map((t) => ({ ...t, memberCount: counts.get(t.id) ?? 0 }));
  }

  async findById(id: string): Promise<Team | null> {
    if (assertDbOrMock('teams') === 'memory') {
      const team = memoryTeams.find((t) => t.id === id);
      if (!team) return null;
      const members = await this.findMembers(id);
      return { ...team, memberCount: members.length, members };
    }

    const { data, error } = await getSupabaseAdmin()
      .from('teams')
      .select('id, organization_id, name, description, created_by, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      return null;
    }

    const members = await this.findMembers(id);
    return { ...mapTeam(data as TeamRow, members.length), members };
  }

  async create(input: {
    organizationId: string;
    name: string;
    description: string;
    createdBy: string | null;
    createdByName?: string;
    createdByEmail?: string;
  }): Promise<Team> {
    if (assertDbOrMock('teams') === 'memory') {
      const team: Team = {
        id: randomUUID(),
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        createdBy: input.createdBy,
        memberCount: input.createdBy ? 1 : 0,
        createdAt: new Date().toISOString(),
      };
      memoryTeams.push(team);
      if (input.createdBy) {
        memoryTeamMembers.push({
          id: randomUUID(),
          teamId: team.id,
          userId: input.createdBy,
          name: input.createdByName ?? 'You',
          email: input.createdByEmail ?? '',
          role: 'lead',
        });
      }
      return { ...team, members: memoryTeamMembers.filter((m) => m.teamId === team.id) };
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('teams')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        description: input.description || null,
        created_by: input.createdBy,
      })
      .select('id, organization_id, name, description, created_by, created_at')
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const team = mapTeam(data as TeamRow, 0);
    if (input.createdBy) {
      await db.from('team_members').upsert(
        { team_id: team.id, user_id: input.createdBy, role: 'lead' },
        { onConflict: 'team_id,user_id' },
      );
    }

    const created = await this.findById(team.id);
    return created ?? team;
  }

  async findMembers(teamId: string): Promise<TeamMember[]> {
    if (assertDbOrMock('teams') === 'memory') {
      return memoryTeamMembers.filter((m) => m.teamId === teamId);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('team_members')
      .select('id, team_id, user_id, role, profiles(display_name, email)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as TeamMemberRow[]).map(mapMember);
  }

  async addMemberByEmail(teamId: string, email: string, role: TeamMemberRole): Promise<TeamMember> {
    if (assertDbOrMock('teams') === 'memory') {
      const member: TeamMember = {
        id: randomUUID(),
        teamId,
        userId: randomUUID(),
        name: email.split('@')[0] || email,
        email,
        role,
      };
      memoryTeamMembers.push(member);
      return member;
    }

    const db = getSupabaseAdmin();
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, display_name, email')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      throw new AppError(502, 'DB_ERROR', profileError.message);
    }
    if (!profile) {
      throw new AppError(404, 'USER_NOT_FOUND', `No account found for ${email}. They need to sign up first.`);
    }

    const { data: teamRow, error: teamError } = await db
      .from('teams')
      .select('organization_id')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError) {
      throw new AppError(502, 'DB_ERROR', teamError.message);
    }
    if (!teamRow) {
      throw new AppError(404, 'TEAM_NOT_FOUND', 'Team was not found');
    }

    const { data: membership, error: membershipError } = await db
      .from('org_members')
      .select('id')
      .eq('organization_id', (teamRow as { organization_id: string }).organization_id)
      .eq('user_id', (profile as { id: string }).id)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError) {
      throw new AppError(502, 'DB_ERROR', membershipError.message);
    }
    if (!membership) {
      throw new AppError(
        400,
        'NOT_ORG_MEMBER',
        `${email} is not an active member of this organization`,
      );
    }

    const { data, error } = await db
      .from('team_members')
      .upsert(
        { team_id: teamId, user_id: (profile as { id: string }).id, role },
        { onConflict: 'team_id,user_id' },
      )
      .select('id, team_id, user_id, role, profiles(display_name, email)')
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return mapMember(data as unknown as TeamMemberRow);
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    if (assertDbOrMock('teams') === 'memory') {
      const index = memoryTeamMembers.findIndex((m) => m.id === memberId && m.teamId === teamId);
      if (index === -1) {
        throw new AppError(404, 'TEAM_MEMBER_NOT_FOUND', `Team member ${memberId} was not found`);
      }
      memoryTeamMembers.splice(index, 1);
      return;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('team_members')
      .delete()
      .eq('id', memberId)
      .eq('team_id', teamId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'TEAM_MEMBER_NOT_FOUND', `Team member ${memberId} was not found`);
    }
  }

  async delete(id: string): Promise<void> {
    if (assertDbOrMock('teams') === 'memory') {
      const index = memoryTeams.findIndex((t) => t.id === id);
      if (index !== -1) memoryTeams.splice(index, 1);
      for (let i = memoryTeamMembers.length - 1; i >= 0; i--) {
        if (memoryTeamMembers[i]?.teamId === id) memoryTeamMembers.splice(i, 1);
      }
      return;
    }

    const { error } = await getSupabaseAdmin().from('teams').delete().eq('id', id);
    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
  }

  async listOrgPeople(organizationId: string): Promise<
    Array<{ id: string; name: string; email: string; role: string }>
  > {
    if (assertDbOrMock('teams') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('org_members')
      .select('role, profiles(id, display_name, email)')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as Array<{
      role: string;
      profiles: { id: string; display_name: string; email: string } | { id: string; display_name: string; email: string }[] | null;
    }>).flatMap((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      if (!profile) return [];
      return [
        {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
          role: row.role,
        },
      ];
    });
  }
}
