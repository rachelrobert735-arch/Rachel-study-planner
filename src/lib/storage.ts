import type { AppData, Chapter, Goal, Settings, StudyDay, StudyTask, Subject } from './model.ts';
import { createInitialData, isValidDate, MONTHS, SUBJECTS } from './plan.ts';

export const STORAGE_KEY = 'rachel-study-plan-v1';
const MAX_BACKUP_LENGTH = 5_000_000;
const INVALID_BACKUP = 'This file is not a valid Rachel study plan backup.';

function invalid(): never {
  throw new Error(INVALID_BACKUP);
}

function object(value: unknown, keys?: string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const record = value as Record<string, unknown>;
  if (Object.getPrototypeOf(record) !== Object.prototype && Object.getPrototypeOf(record) !== null) return invalid();
  const actualKeys = Object.keys(record);
  if (actualKeys.some((key) => ['__proto__', 'constructor', 'prototype'].includes(key))) return invalid();
  if (keys && (actualKeys.length !== keys.length || actualKeys.some((key) => !keys.includes(key)))) return invalid();
  return record;
}

function string(value: unknown, max = 240, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) return invalid();
  return value;
}

function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') return invalid();
  return value;
}

function minutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1440) return invalid();
  return value;
}

function date(value: unknown): string {
  const result = string(value, 10);
  if (!isValidDate(result)) return invalid();
  return result;
}

function month(value: unknown): string {
  const result = string(value, 7);
  // Every accepted chapter must remain accessible through the app's month tabs.
  if (!MONTHS.some((plannedMonth) => plannedMonth.id === result)) return invalid();
  return result;
}

function subject(value: unknown, allowGeneral: true): Subject | 'General';
function subject(value: unknown, allowGeneral?: false): Subject;
function subject(value: unknown, allowGeneral = false): Subject | 'General' {
  if (allowGeneral && value === 'General') return 'General';
  if (!SUBJECTS.includes(value as Subject)) return invalid();
  return value as Subject;
}

function list<T extends { id: string }>(value: unknown, max: number, validate: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) return invalid();
  const items = value.map(validate);
  if (new Set(items.map((item) => item.id)).size !== items.length) return invalid();
  return items;
}

function chapter(value: unknown): Chapter {
  const item = object(value, ['id', 'title', 'subject', 'month', 'status', 'notes']);
  if (!['not-started', 'in-progress', 'complete'].includes(item.status as string)) return invalid();
  return {
    id: string(item.id, 100), title: string(item.title), subject: subject(item.subject),
    month: month(item.month), status: item.status as Chapter['status'], notes: string(item.notes, 10_000, true),
  };
}

function goal(value: unknown): Goal {
  const item = object(value, ['id', 'title', 'subject', 'dueDate', 'completed']);
  return {
    id: string(item.id, 100), title: string(item.title), subject: subject(item.subject, true),
    dueDate: date(item.dueDate), completed: bool(item.completed),
  };
}

function task(value: unknown): StudyTask {
  const item = object(value, ['id', 'title', 'subject', 'minutes', 'done']);
  return {
    id: string(item.id, 100), title: string(item.title), subject: subject(item.subject, true),
    minutes: minutes(item.minutes), done: bool(item.done),
  };
}

function day(value: unknown): StudyDay {
  const item = object(value, ['date', 'tasks', 'note']);
  return { date: date(item.date), tasks: list(item.tasks, 100, task), note: string(item.note, 10_000, true) };
}

function settings(value: unknown): Settings {
  const item = object(value, ['name', 'dailyTargetMinutes']);
  return { name: string(item.name, 80), dailyTargetMinutes: minutes(item.dailyTargetMinutes) };
}

function focusSession(value: unknown): AppData['focusSessions'][number] {
  const item = object(value, ['id', 'date', 'minutes', 'subject']);
  return { id: string(item.id, 100), date: date(item.date), minutes: minutes(item.minutes), subject: subject(item.subject, true) };
}

/** Validate every imported field, then construct fresh data rather than merging it. */
export function parseBackup(text: string): AppData {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_LENGTH) throw new Error('The backup is too large. Choose a file smaller than 5 MB.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Choose an exported study plan backup.'); }
  const root = object(parsed, ['version', 'chapters', 'goals', 'days', 'settings', 'focusSessions']);
  if (root.version !== 1) throw new Error('This backup version is not supported.');
  const sourceDays = object(root.days);
  if (Object.keys(sourceDays).length > 3660) return invalid();
  const days: Record<string, StudyDay> = {};
  for (const [key, value] of Object.entries(sourceDays)) {
    date(key);
    const result = day(value);
    if (result.date !== key) return invalid();
    days[key] = result;
  }
  return {
    version: 1,
    chapters: list(root.chapters, 1000, chapter),
    goals: list(root.goals, 1000, goal),
    days,
    settings: settings(root.settings),
    focusSessions: list(root.focusSessions, 20_000, focusSession),
  };
}

export function loadData(): { data: AppData; error: string | null } {
  try {
    const saved = globalThis.localStorage.getItem(STORAGE_KEY);
    if (saved === null) return { data: createInitialData(), error: null };
    try {
      return { data: parseBackup(saved), error: null };
    } catch {
      // Read only: leave the original value recoverable until the user changes data.
      return { data: createInitialData(), error: 'Your saved plan could not be read. A fresh plan is shown; the saved copy will be replaced only when you make a change. Restore a backup if you have one.' };
    }
  } catch {
    return { data: createInitialData(), error: 'Browser storage is unavailable. Changes may not persist after you close this page. Export a backup to keep your progress.' };
  }
}

export function saveData(data: AppData): boolean {
  try {
    const serialized = JSON.stringify(data);
    parseBackup(serialized);
    globalThis.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
