import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDay, createInitialData } from './plan.ts';
import { loadData, parseBackup, saveData, STORAGE_KEY } from './storage.ts';

test('backup round trip retains edits, goals, daily progress, settings and sessions', () => {
  const data = createInitialData();
  data.chapters[0].title = 'My exact chapter';
  data.chapters[0].status = 'in-progress';
  data.chapters[0].notes = 'Review exercise 2';
  data.goals[0].completed = true;
  data.days['2026-10-01'] = createDay('2026-10-01');
  data.days['2026-10-01'].tasks[0].done = true;
  data.days['2026-10-01'].note = 'Good progress today';
  data.settings.name = 'Rachel';
  data.focusSessions.push({ id: 'session-one', date: '2026-10-01', minutes: 25, subject: 'Physics' });
  const restored = parseBackup(JSON.stringify(data));
  assert.deepEqual(restored, data);
  assert.notEqual(restored.chapters[0], data.chapters[0]);
});

test('backup validation rejects invalid nested data and unknown properties', () => {
  const mutations: ((data: ReturnType<typeof createInitialData>) => void)[] = [
    (data) => { data.chapters[0].month = '2026-13'; },
    (data) => { data.chapters[0].month = '2026-09'; },
    (data) => { data.chapters[0].month = '2027-02'; },
    (data) => { data.chapters[0].id = ''; },
    (data) => { data.chapters[1].id = data.chapters[0].id; },
    (data) => { data.goals[0].dueDate = '2026-02-30'; },
    (data) => { data.settings.dailyTargetMinutes = -5; },
    (data) => { data.settings.dailyTargetMinutes = Infinity; },
    (data) => { data.settings.dailyTargetMinutes = 1441; },
    (data) => { data.days['2026-10-01'] = createDay('2026-10-02'); },
    (data) => { data.days['2026-10-01'] = createDay('2026-10-01'); data.days['2026-10-01'].tasks[0].minutes = 0; },
    (data) => { Object.assign(data.chapters[0], { hiddenField: true }); },
    (data) => { Object.assign(data.settings, { nested: { arbitrary: true } }); },
    (data) => { Object.assign(data, { unexpected: 1 }); },
    (data) => { Object.assign(data.chapters[0], { status: 'almost-done' }); },
    (data) => { Object.assign(data.goals[0], { completed: 'true' }); },
    (data) => { Object.assign(data.chapters[0], { subject: 'General' }); },
    (data) => { data.focusSessions.push({ id: 'focus', date: 'tomorrow', minutes: 25, subject: 'English' }); },
  ];
  mutations.forEach((mutate, index) => {
    const data = createInitialData();
    mutate(data);
    assert.throws(() => parseBackup(JSON.stringify(data)), `mutation ${index}`);
  });
  assert.throws(() => parseBackup('not json'));
  assert.throws(() => parseBackup('null'));
  assert.throws(() => parseBackup('[]'));
  assert.throws(() => parseBackup(JSON.stringify({ ...createInitialData(), version: 2 })));
  assert.throws(() => parseBackup(JSON.stringify(createInitialData()).replace('"dailyTargetMinutes":510', '"dailyTargetMinutes":1e309')));
});

test('backup validation rejects prototype keys and oversized files', () => {
  const valid = JSON.stringify(createInitialData());
  assert.throws(() => parseBackup(valid.replace('"days":{}', '"days":{"__proto__":{"polluted":true}}')));
  assert.throws(() => parseBackup(' '.repeat(5_000_001)), /too large/);
  const tooMany = createInitialData();
  tooMany.goals = Array.from({ length: 1001 }, (_, index) => ({ ...tooMany.goals[0], id: `goal-${index}` }));
  assert.throws(() => parseBackup(JSON.stringify(tooMany)));
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'), false);
});

test('load is read-only, corrupt saved data is preserved, and explicit saves can recover it', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  let writes = 0;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); writes++; },
    },
  });
  try {
    assert.equal(loadData().error, null);
    assert.equal(writes, 0);
    values.set(STORAGE_KEY, '{broken');
    const recovered = loadData();
    assert.match(recovered.error ?? '', /could not be read/);
    assert.equal(values.get(STORAGE_KEY), '{broken');
    assert.equal(writes, 0);
    recovered.data.settings.name = 'Rach';
    assert.equal(saveData(recovered.data), true);
    assert.equal(writes, 1);
    assert.equal(loadData().data.settings.name, 'Rach');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('unavailable browser storage is reported without preventing a fresh plan', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => { throw new Error('Storage denied'); },
  });
  try {
    const result = loadData();
    assert.match(result.error ?? '', /unavailable/);
    assert.equal(result.data.chapters.length, 51);
    assert.equal(saveData(result.data), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
