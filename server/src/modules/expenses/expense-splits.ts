export interface SplitMember {
  userId: string;
  name: string;
}

export interface ShareSplit {
  userId: string;
  name: string;
  shareCents: number;
}

export class SplitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SplitValidationError';
  }
}

/** Split cents across members. The first members absorb leftover paise. */
export function splitEvenly(amountCents: number, members: SplitMember[]): ShareSplit[] {
  if (members.length === 0) {
    return [];
  }
  const base = Math.floor(amountCents / members.length);
  let remainder = amountCents - base * members.length;
  return members.map((member) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) {
      remainder -= 1;
    }
    return { userId: member.userId, name: member.name, shareCents: base + extra };
  });
}

/** Shares within one paisa of each other are an even split (remainder paise). */
export function splitModeOf(shareCents: number[]): 'equal' | 'custom' {
  if (shareCents.length <= 1) {
    return 'equal';
  }
  const max = Math.max(...shareCents);
  const min = Math.min(...shareCents);
  return max - min > 1 ? 'custom' : 'equal';
}

export function customSplits(
  amountCents: number,
  members: SplitMember[],
  requested: unknown,
): ShareSplit[] {
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new SplitValidationError('splits must list each person and their share');
  }

  const names = new Map(members.map((member) => [member.userId, member.name]));
  const seen = new Set<string>();
  const splits: ShareSplit[] = [];
  let total = 0;

  for (const item of requested) {
    if (!item || typeof item !== 'object') {
      throw new SplitValidationError('each split needs a userId and an amount');
    }
    const userId = (item as { userId?: unknown }).userId;
    const amount = (item as { amount?: unknown }).amount;
    if (typeof userId !== 'string' || !userId) {
      throw new SplitValidationError('each split needs a userId');
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      throw new SplitValidationError('each share must be a non-negative amount');
    }
    const name = names.get(userId);
    if (!name) {
      throw new SplitValidationError('shares can only include accepted trip members');
    }
    if (seen.has(userId)) {
      throw new SplitValidationError('each person can only appear once in the split');
    }
    seen.add(userId);
    const shareCents = Math.round(amount * 100);
    total += shareCents;
    splits.push({ userId, name, shareCents });
  }

  if (!splits.some((split) => split.shareCents > 0)) {
    throw new SplitValidationError('at least one share must be greater than zero');
  }
  if (total !== amountCents) {
    throw new SplitValidationError('custom shares must add up to the expense amount');
  }
  return splits;
}
