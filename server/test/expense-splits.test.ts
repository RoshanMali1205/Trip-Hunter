import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SplitValidationError,
  customSplits,
  splitEvenly,
  splitModeOf,
} from '../src/modules/expenses/expense-splits.ts';

const members = [
  { userId: 'a', name: 'Alex' },
  { userId: 'b', name: 'Priya' },
  { userId: 'c', name: 'Rohan' },
];

describe('splitEvenly', () => {
  it('gives leftover paise to the first members', () => {
    const shares = splitEvenly(100, members);
    assert.deepEqual(
      shares.map((share) => share.shareCents),
      [34, 33, 33],
    );
    assert.equal(
      shares.reduce((sum, share) => sum + share.shareCents, 0),
      100,
    );
  });

  it('returns nothing when nobody is on the trip', () => {
    assert.deepEqual(splitEvenly(500, []), []);
  });
});

describe('splitModeOf', () => {
  it('treats a one-paisa remainder as an even split', () => {
    assert.equal(splitModeOf([34, 33, 33]), 'equal');
  });

  it('marks uneven shares as custom', () => {
    assert.equal(splitModeOf([20000, 5000, 5000]), 'custom');
  });
});

describe('customSplits', () => {
  it('accepts shares that add up to the expense', () => {
    const shares = customSplits(30000, members, [
      { userId: 'a', amount: 200 },
      { userId: 'b', amount: 50 },
      { userId: 'c', amount: 50 },
    ]);
    assert.deepEqual(
      shares.map((share) => share.shareCents),
      [20000, 5000, 5000],
    );
  });

  it('rejects a total that does not match', () => {
    assert.throws(
      () =>
        customSplits(30000, members, [
          { userId: 'a', amount: 100 },
          { userId: 'b', amount: 50 },
        ]),
      (err: unknown) => err instanceof SplitValidationError && /add up/.test(err.message),
    );
  });

  it('rejects people who are not accepted members', () => {
    assert.throws(
      () => customSplits(10000, members, [{ userId: 'stranger', amount: 100 }]),
      (err: unknown) => err instanceof SplitValidationError && /accepted/.test(err.message),
    );
  });

  it('rejects a person listed twice', () => {
    assert.throws(
      () =>
        customSplits(10000, members, [
          { userId: 'a', amount: 40 },
          { userId: 'a', amount: 60 },
        ]),
      (err: unknown) => err instanceof SplitValidationError && /once/.test(err.message),
    );
  });
});
