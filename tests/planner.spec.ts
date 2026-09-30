import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const storageKey = 'rachel-study-plan-v1';

async function navigate(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: name !== 'My goals' }).click();
}

async function savedData(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), storageKey);
}

async function confirmDeletion(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog', { name: 'Remove this from your plan?' }).getByRole('button', { name: 'Remove item' }).click();
}

test.beforeEach(async ({ page }) => {
  // Each test gets Playwright's independent browser context and empty localStorage.
  await page.clock.install({ time: new Date('2026-10-05T07:00:00+05:30') });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hello, Rachel' })).toBeVisible();
});

test('starts with the draft targets and applies the Sunday English adjustment', async ({ page }) => {
  await navigate(page, 'Progress');
  await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Study units complete', exact: true }) })).toContainText('0/51');
  await navigate(page, 'Overview');
  for (const [subject, count] of [['Mathematics', 15], ['Physics', 16], ['Chemistry', 16], ['English', 4]] as const) {
    const card = page.getByRole('button').filter({ has: page.getByRole('heading', { name: subject, exact: true }) });
    await expect(card).toContainText(`0 / ${count}`);
  }
  await expect(page.getByText('0m of 8h 30m complete')).toBeVisible();
  await page.getByLabel('Study date').fill('2026-10-04');
  const english = page.locator('.task-row').filter({ hasText: 'English · timed practice & corrections' });
  await expect(english).toContainText('1h 30m');
  await expect(page.locator('.task-row').filter({ hasText: 'Question practice' })).toContainText('2h');
  await expect(page.getByText('0m of 8h 30m complete')).toBeVisible();
  await navigate(page, 'Study plan');
  await expect(page.getByRole('tab', { name: /October/ })).toContainText('0 / 15 complete');
  await expect(page.getByRole('tab', { name: /November/ })).toContainText('0 / 15 complete');
  await expect(page.getByRole('tab', { name: /December/ })).toContainText('0 / 16 complete');
  await expect(page.getByRole('tab', { name: /January/ })).toContainText('0 / 5 complete');
});

test('creates, edits, completes, filters, persists and deletes a chapter', async ({ page }) => {
  await navigate(page, 'Study plan');
  await page.getByRole('button', { name: 'Add a chapter', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Chapter or milestone name').fill('   ');
  await dialog.getByRole('button', { name: 'Save chapter' }).click();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Add a title');
  await dialog.getByLabel('Chapter or milestone name').fill('Mathematical logic practice');
  await dialog.getByRole('combobox', { name: 'Subject', exact: true }).selectOption('Mathematics');
  await dialog.getByLabel('Notes').fill('Exercise 1 and the error notebook');
  await dialog.getByRole('button', { name: 'Save chapter' }).click();
  await page.getByLabel('Status of Mathematics Mathematical logic practice').selectOption('in-progress');
  await page.getByRole('button', { name: 'Edit Mathematics Mathematical logic practice', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Chapter or milestone name').fill('Logic: revision and practice');
  await dialog.getByRole('button', { name: 'Save chapter' }).click();
  await page.getByRole('button', { name: 'Complete: Mathematics Logic: revision and practice', exact: true }).click();
  await expect(page.getByLabel('Status of Mathematics Logic: revision and practice')).toHaveValue('complete');
  await page.reload();
  await navigate(page, 'Study plan');
  await page.getByLabel('Find a chapter').fill('Logic: revision');
  await expect(page.locator('.chapter-row')).toHaveCount(1);
  await expect(page.getByLabel('Status of Mathematics Logic: revision and practice')).toHaveValue('complete');
  await page.getByRole('button', { name: 'Edit Mathematics Logic: revision and practice', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Keep it' }).click();
  await expect(page.getByLabel('Status of Mathematics Logic: revision and practice')).toHaveValue('complete');
  await page.getByRole('button', { name: 'Edit Mathematics Logic: revision and practice', exact: true }).click();
  await confirmDeletion(page);
  await expect(page.getByRole('heading', { name: 'No chapters found' })).toBeVisible();
  await page.getByLabel('Find a chapter').fill('');
  await expect(page.getByRole('tab', { name: /October/ })).toContainText('0 / 15 complete');
});

test('creates, edits, completes, reopens and deletes a goal', async ({ page }) => {
  await navigate(page, 'My goals');
  await page.getByRole('button', { name: 'New goal', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('What would you like to achieve?').fill('Finish a timed comprehension paper');
  await dialog.getByRole('combobox', { name: 'Subject', exact: true }).selectOption('English');
  await dialog.getByLabel('Target date').fill('2026-10-18');
  await dialog.getByRole('button', { name: 'Save goal' }).click();
  await page.getByRole('button', { name: 'Edit goal: Finish a timed comprehension paper' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('What would you like to achieve?').fill('Review a timed comprehension paper');
  await dialog.getByLabel('Target date').fill('2026-10-19');
  await dialog.getByRole('button', { name: 'Save goal' }).click();
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Review a timed comprehension paper' }) });
  await card.getByRole('button', { name: 'Mark as achieved' }).click();
  await expect(card.getByRole('button', { name: /click to reopen/ })).toBeVisible();
  await page.reload();
  await navigate(page, 'My goals');
  await card.getByRole('button', { name: /click to reopen/ }).click();
  await expect(card.getByRole('button', { name: 'Mark as achieved' })).toBeVisible();
  await expect(card).toContainText('19 Oct 2026');
  await page.getByRole('button', { name: 'Edit goal: Review a timed comprehension paper' }).click();
  await confirmDeletion(page);
  await expect(page.getByRole('heading', { name: 'Review a timed comprehension paper' })).toHaveCount(0);
});

test('first task click works and daily tasks, edits and reflection stay isolated after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Complete: PW lecture 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark incomplete: PW lecture 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Edit PW lecture 2', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('What will you work on?').fill('PW lecture 2 plus recall');
  await dialog.getByLabel('Duration (minutes)').fill('80');
  await dialog.getByRole('button', { name: 'Save task' }).click();
  await page.getByRole('button', { name: 'Add a study task' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('What will you work on?').fill('Review yesterday’s error notebook');
  await dialog.getByLabel('Duration (minutes)').fill('20');
  await dialog.getByRole('button', { name: 'Save task' }).click();
  await page.getByRole('button', { name: 'Complete: Review yesterday’s error notebook', exact: true }).click();
  await page.getByLabel('Daily reflection').fill('The error notebook made algebra clearer.');
  await page.getByRole('button', { name: 'Next day', exact: true }).click();
  await expect(page.getByLabel('Daily reflection')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Complete: PW lecture 1', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Review yesterday’s error notebook', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Previous day', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Daily reflection')).toHaveValue('The error notebook made algebra clearer.');
  await expect(page.getByRole('button', { name: 'Mark incomplete: PW lecture 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Edit PW lecture 2 plus recall', exact: true })).toBeVisible();
  await expect(page.getByText('1h 30m of 9h complete')).toBeVisible();
  await page.getByRole('button', { name: 'Edit Review yesterday’s error notebook', exact: true }).click();
  await confirmDeletion(page);
  await expect(page.getByRole('button', { name: 'Edit Review yesterday’s error notebook', exact: true })).toHaveCount(0);
  await expect(page.getByText('1h 10m of 8h 40m complete')).toBeVisible();
});

test('exports JSON, rejects broken backups and restores only after confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'Complete: PW lecture 1', exact: true }).click();
  await page.getByLabel('Daily reflection').fill('Keep this saved reflection.');
  await navigate(page, 'Study plan');
  await page.getByRole('button', { name: 'Complete: Mathematics Chapter 01', exact: true }).click();
  await navigate(page, 'My goals');
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Complete all 15 Mathematics chapters', exact: true }) }).getByRole('button', { name: 'Mark as achieved' }).click();
  await page.getByRole('button', { name: 'Open settings and backup', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^rachel-study-backup-.*\.json$/);
  const json = await readFile((await download.path())!, 'utf8');
  const backup = JSON.parse(json);
  expect(backup.chapters.filter((chapter: { status: string }) => chapter.status === 'complete')).toHaveLength(1);
  expect(backup.goals.filter((goal: { completed: boolean }) => goal.completed)).toHaveLength(1);
  expect(backup.days['2026-10-05'].note).toBe('Keep this saved reflection.');
  await page.getByLabel('Your name', { exact: true }).fill('Rachel changed');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const beforeRejectedImport = await savedData(page);
  await page.getByLabel('Restore a backup file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{bad json') });
  await expect(page.getByRole('status')).toContainText('not valid JSON');
  expect(await savedData(page)).toEqual(beforeRejectedImport);
  const invalid = { ...backup, settings: { ...backup.settings, dailyTargetMinutes: -10 } };
  await page.getByLabel('Restore a backup file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(page.getByRole('status')).toContainText('not a valid Rachel study plan backup');
  expect(await savedData(page)).toEqual(beforeRejectedImport);
  const file = { name: 'restore.json', mimeType: 'application/json', buffer: Buffer.from(json) };
  await page.getByLabel('Restore a backup file').setInputFiles(file);
  await expect(page.getByRole('dialog', { name: 'Restore your study space?' })).toBeVisible();
  expect(await savedData(page)).toEqual(beforeRejectedImport);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await savedData(page)).toEqual(beforeRejectedImport);
  await page.getByLabel('Restore a backup file').setInputFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: 'Restore backup', exact: true }).click();
  await expect.poll(() => savedData(page)).toEqual(backup);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hello, Rachel' })).toBeVisible();
  await expect(page.getByLabel('Daily reflection')).toHaveValue('Keep this saved reflection.');
  await expect(page.getByRole('button', { name: 'Mark incomplete: PW lecture 1', exact: true })).toBeVisible();
});

test('timer pauses, resumes and records one completed minute exactly once', async ({ page }) => {
  await page.clock.pauseAt(new Date('2026-10-05T08:00:00+05:30'));
  await page.getByRole('button', { name: 'Start a focus session' }).click();
  await page.getByLabel('What are we working on?').selectOption('Chemistry');
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('1');
  await page.getByRole('dialog').getByRole('button', { name: /Let.s focus/ }).click();
  await page.clock.runFor(30_000);
  await page.getByRole('button', { name: 'Pause session' }).click();
  await expect(page.getByRole('timer')).toHaveText('00:30');
  await page.clock.runFor(60_000);
  await expect(page.getByRole('timer')).toHaveText('00:30');
  await page.getByRole('button', { name: 'Keep going' }).click();
  await page.clock.runFor(30_000);
  await expect(page.getByRole('heading', { name: 'A little progress, made.' })).toBeVisible();
  await expect.poll(async () => (await savedData(page))?.focusSessions.length).toBe(1);
  await page.clock.runFor(120_000);
  expect((await savedData(page)).focusSessions).toEqual([expect.objectContaining({ date: '2026-10-05', minutes: 1, subject: 'Chemistry' })]);
  await page.getByRole('button', { name: 'Back to my day' }).click();
  await navigate(page, 'Progress');
  await expect(page.getByText('1m focused', { exact: true })).toBeVisible();
  await page.reload();
  await navigate(page, 'Progress');
  await expect(page.getByText('1m focused', { exact: true })).toBeVisible();
  expect((await savedData(page)).focusSessions).toHaveLength(1);
});

test('unfinished timer requires confirmation and does not record study time', async ({ page }) => {
  await page.getByRole('button', { name: 'Start a focus session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Let.s focus/ }).click();
  await page.getByRole('button', { name: 'Close focus session' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Leave this session?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep my session' }).click();
  await expect(page.getByRole('button', { name: 'Pause session' })).toBeVisible();
  await page.getByRole('button', { name: 'Close focus session' }).click();
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await navigate(page, 'Progress');
  await expect(page.getByText('0m focused', { exact: true })).toBeVisible();
  expect((await savedData(page))?.focusSessions ?? []).toHaveLength(0);
});

test('all main pages and an edit dialog fit the viewport without horizontal overflow', async ({ page }) => {
  for (const name of ['Overview', 'Study plan', 'My goals', 'Progress']) {
    await navigate(page, name);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(width.content, `${name} should fit the viewport`).toBeLessThanOrEqual(width.viewport + 1);
  }
  await navigate(page, 'Study plan');
  await page.getByRole('button', { name: 'Add a chapter', exact: true }).click();
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
