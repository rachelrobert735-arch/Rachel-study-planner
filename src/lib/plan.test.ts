import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDay, createInitialData, isValidDate, localDate, MONTHS } from './plan.ts';

test('the initial plan matches the supplied monthly chapter targets with no invented progress', () => {
  const data = createInitialData();
  const expected = [
    { Mathematics: 10, Physics: 0, Chemistry: 4, English: 1 },
    { Mathematics: 0, Physics: 10, Chemistry: 4, English: 1 },
    { Mathematics: 5, Physics: 6, Chemistry: 4, English: 1 },
    { Mathematics: 0, Physics: 0, Chemistry: 4, English: 1 },
  ];
  MONTHS.forEach((month, index) => {
    for (const [subject, count] of Object.entries(expected[index])) {
      assert.equal(data.chapters.filter((chapter) => chapter.month === month.id && chapter.subject === subject).length, count);
    }
  });
  assert.equal(data.chapters.length, 51);
  assert(data.chapters.every((chapter) => chapter.status === 'not-started'));
  assert(data.goals.every((goal) => !goal.completed));
  assert.deepEqual(data.days, {});
  assert.deepEqual(data.focusSessions, []);
  assert.equal(data.settings.dailyTargetMinutes, 510);
  assert.equal(new Set(data.chapters.map((chapter) => chapter.id)).size, 51);
});

test('every day in the four-month plan retains 510 minutes and exactly three PW lectures', () => {
  const cursor = new Date('2026-10-01T12:00:00.000Z');
  while (cursor.toISOString().slice(0, 10) <= '2027-01-31') {
    const date = cursor.toISOString().slice(0, 10);
    const day = createDay(date);
    const sunday = cursor.getUTCDay() === 0;
    assert.equal(day.tasks.reduce((sum, task) => sum + task.minutes, 0), 510, date);
    const lectures = day.tasks.filter((task) => task.title.startsWith('PW lecture'));
    assert.equal(lectures.length, 3, date);
    assert(lectures.every((task) => task.minutes === 70 && !task.done));
    assert.equal(new Set(lectures.map((task) => task.subject)).size, 1);
    assert.equal(day.tasks.find((task) => task.subject === 'English')?.minutes, sunday ? 90 : 30);
    assert.equal(day.tasks.find((task) => task.title === 'Question practice')?.minutes, sunday ? 120 : 180);
    if ([3, 6].includes(cursor.getUTCDay())) assert.equal(lectures[0].subject, 'Chemistry');
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
});

test('principal subjects follow the monthly plan and December alternates on ordinary days', () => {
  assert.equal(createDay('2026-10-01').tasks[0].subject, 'Mathematics');
  assert.equal(createDay('2026-11-02').tasks[0].subject, 'Physics');
  assert.equal(createDay('2026-12-01').tasks[0].subject, 'Mathematics');
  assert.equal(createDay('2026-12-04').tasks[0].subject, 'Physics');
  assert.equal(createDay('2027-01-04').tasks[0].subject, 'Chemistry');
});

test('calendar helpers preserve local days and reject normalized invalid dates', () => {
  assert.equal(localDate(new Date(2026, 9, 1, 0, 1)), '2026-10-01');
  assert.equal(isValidDate('2028-02-29'), true);
  for (const date of ['2027-02-29', '2026-04-31', '2026-13-01', '2026-1-01', 'not a date']) {
    assert.equal(isValidDate(date), false);
    assert.throws(() => createDay(date));
  }
});

test('templates create independent editable data', () => {
  const first = createDay('2026-10-01');
  const second = createDay('2026-10-01');
  first.tasks[0].done = true;
  assert.equal(second.tasks[0].done, false);
  assert.notEqual(first.tasks[0], second.tasks[0]);
});

test('default task IDs remain stable across renders and unique across dates', () => {
  const rendered = createDay('2026-10-01');
  const nextRender = createDay('2026-10-01');
  const nextDay = createDay('2026-10-02');
  assert.deepEqual(rendered.tasks.map((task) => task.id), nextRender.tasks.map((task) => task.id));
  assert.equal(new Set([...rendered.tasks, ...nextDay.tasks].map((task) => task.id)).size, 14);
  const clickedId = rendered.tasks[0].id;
  const updated = nextRender.tasks.map((task) => task.id === clickedId ? { ...task, done: true } : task);
  assert.equal(updated[0].done, true);
  assert.equal(updated.filter((task) => task.done).length, 1);
});
