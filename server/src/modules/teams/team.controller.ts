import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { TeamRepository, type TeamMemberRole } from './team.repository.js';

const repo = new TeamRepository();
const VALID_ROLES: TeamMemberRole[] = ['lead', 'member'];

export const listTeams: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.organizationId) {
      throw new AppError(400, 'ORGANIZATION_REQUIRED', 'An organization is required to list teams');
    }
    const teams = await repo.findByOrganization(req.user.organizationId);
    res.json(ok(teams, 'Teams retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

function assertSameOrg(team: { organizationId: string }, organizationId: string | undefined): void {
  if (organizationId && team.organizationId !== organizationId) {
    throw new AppError(404, 'TEAM_NOT_FOUND', 'Team was not found');
  }
}

export const getTeam: RequestHandler = async (req, res, next) => {
  try {
    const team = await repo.findById(String(req.params['id']));
    if (!team) {
      throw new AppError(404, 'TEAM_NOT_FOUND', 'Team was not found');
    }
    assertSameOrg(team, req.user?.organizationId);
    res.json(ok(team, 'Team retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const createTeam: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.organizationId) {
      throw new AppError(400, 'ORGANIZATION_REQUIRED', 'An organization is required to create a team');
    }
    const body = req.body as { name?: unknown; description?: unknown };
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'name is required');
    }

    const team = await repo.create({
      organizationId: req.user.organizationId,
      name: body.name.trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      createdBy: req.user.id,
      createdByName: req.user.displayName,
      createdByEmail: req.user.email,
    });
    res.status(201).json(ok(team, 'Team created successfully'));
  } catch (err) {
    next(err);
  }
};

export const deleteTeam: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const id = String(req.params['id']);
    const team = await repo.findById(id);
    if (!team) {
      throw new AppError(404, 'TEAM_NOT_FOUND', 'Team was not found');
    }
    assertSameOrg(team, req.user.organizationId);
    if (team.createdBy && team.createdBy !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'Only the team creator can delete this team');
    }
    await repo.delete(id);
    res.json(ok(null, 'Team deleted successfully'));
  } catch (err) {
    next(err);
  }
};

export const addTeamMember: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const teamId = String(req.params['id']);
    const team = await repo.findById(teamId);
    if (!team) {
      throw new AppError(404, 'TEAM_NOT_FOUND', 'Team was not found');
    }
    assertSameOrg(team, req.user.organizationId);
    if (team.createdBy && team.createdBy !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'Only the team creator can add members');
    }

    const body = req.body as { email?: unknown; role?: unknown };
    if (typeof body.email !== 'string' || !body.email.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'email is required');
    }
    const role =
      typeof body.role === 'string' && VALID_ROLES.includes(body.role as TeamMemberRole)
        ? (body.role as TeamMemberRole)
        : 'member';

    const member = await repo.addMemberByEmail(teamId, body.email.trim().toLowerCase(), role);
    res.status(201).json(ok(member, 'Team member added successfully'));
  } catch (err) {
    next(err);
  }
};

export const removeTeamMember: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const teamId = String(req.params['id']);
    const memberId = String(req.params['memberId']);
    const team = await repo.findById(teamId);
    if (!team) {
      throw new AppError(404, 'TEAM_NOT_FOUND', 'Team was not found');
    }
    assertSameOrg(team, req.user.organizationId);
    if (team.createdBy && team.createdBy !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'Only the team creator can remove members');
    }
    await repo.removeMember(teamId, memberId);
    res.json(ok(null, 'Team member removed successfully'));
  } catch (err) {
    next(err);
  }
};

export const listOrgPeople: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.organizationId) {
      throw new AppError(400, 'ORGANIZATION_REQUIRED', 'An organization is required');
    }
    const people = await repo.listOrgPeople(req.user.organizationId);
    res.json(ok(people, 'Organization members retrieved successfully'));
  } catch (err) {
    next(err);
  }
};
