import type { RequestHandler } from 'express';
import { ok } from '../../types/api.js';
import { MemberRepository } from './member.repository.js';

const repo = new MemberRepository();

export const listMembers: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const members = await repo.findByTrip(tripId);
    res.json(ok(members, 'Trip members retrieved successfully'));
  } catch (err) {
    next(err);
  }
};
