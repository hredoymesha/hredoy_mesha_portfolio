import assert from 'node:assert/strict';
import test from 'node:test';
import { dayNightStatus } from './sunPosition';

test('day and night follow the local solar position in October', () => {
  const morningInEurope = new Date('2026-10-23T07:40:00Z');
  const lateEveningUtc = new Date('2026-10-23T20:00:00Z');

  assert.equal(dayNightStatus(60.1699, 24.9384, morningInEurope), 'day');
  assert.equal(dayNightStatus(23.8103, 90.4125, morningInEurope), 'day');
  assert.equal(dayNightStatus(60.1699, 24.9384, lateEveningUtc), 'night');
  assert.equal(dayNightStatus(23.8103, 90.4125, lateEveningUtc), 'night');
});

test('polar summer night remains daylight in Longyearbyen', () => {
  assert.equal(
    dayNightStatus(78.2232, 15.6469, new Date('2026-06-21T21:00:00Z')),
    'day'
  );
});
