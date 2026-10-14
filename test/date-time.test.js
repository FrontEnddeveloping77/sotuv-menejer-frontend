import test from 'node:test';
import assert from 'node:assert/strict';
import {
    formatLocalDateTime,
    timestampToEpoch
} from '../src/utils/dateTime.js';

test('formats UTC timestamps using the device local timezone', () => {
    const value = '2026-10-13T10:00:00Z';
    const expected = new Intl.DateTimeFormat('uz-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).format(new Date(value));

    assert.equal(formatLocalDateTime(value), expected);
    assert.equal(formatLocalDateTime('2026-10-13 10:00:00'), expected);
});

test('normalizes naive PostgreSQL timestamps as UTC for expiry comparisons', () => {
    assert.equal(
        timestampToEpoch('2026-10-13 10:00:00'),
        timestampToEpoch('2026-10-13T10:00:00Z')
    );
    assert.equal(timestampToEpoch('not-a-timestamp'), NaN);
});
