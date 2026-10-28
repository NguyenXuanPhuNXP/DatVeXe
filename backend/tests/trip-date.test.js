const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const helper = pathToFileURL(path.resolve(__dirname, '../../frontend/src/utils/trip-date.js')).href;

for (const tz of ['Asia/Ho_Chi_Minh', 'UTC', 'America/Los_Angeles']) {
  test(`Trip date remains October 28 across booking screens in ${tz}`, () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { vietnamToday, calendarDate, formatTripDate } from ${JSON.stringify(helper)};
      // Vietnam has entered October 28 while UTC is still October 27.
      assert.equal(vietnamToday(new Date('2026-10-27T17:30:00Z')), '2026-10-28');
      assert.equal(vietnamToday(new Date('2026-12-31T17:00:00Z')), '2027-01-01');
      for (const date of ['2026-10-28', '2026-10-28T00:00:00.000Z']) {
        assert.equal(calendarDate(date), '2026-10-28');
        assert.equal(formatTripDate(date, {day:'2-digit',month:'2-digit',year:'numeric'}), '28/10/2026');
      }
      assert.equal(calendarDate('2026-02-30'), '');
      assert.equal(calendarDate('invalid'), '');
      assert.equal(formatTripDate(null), '—');
    `], { env: {...process.env, TZ: tz}, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
}
