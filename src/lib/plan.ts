import type { AppData, Chapter, StudyDay, Subject } from './model.ts';

export const SUBJECTS: Subject[] = ['Mathematics', 'Physics', 'Chemistry', 'English'];

export const MONTHS = [
  { id: '2026-10', label: 'October', shortLabel: 'Oct', year: 2026, description: '10 Mathematics + 4 Chemistry · English prose, comprehension & grammar' },
  { id: '2026-11', label: 'November', shortLabel: 'Nov', year: 2026, description: '10 Physics + 4 Chemistry · English poetry, appreciation & writing' },
  { id: '2026-12', label: 'December', shortLabel: 'Dec', year: 2026, description: '5 Mathematics + 6 Physics + 4 Chemistry · English novel section & remaining lessons' },
  { id: '2027-01', label: 'January', shortLabel: 'Jan', year: 2027, description: 'Final 4 Chemistry chapters · Revision & timed English papers' },
];

export function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Keep calendar dates local: UTC conversion moves dates near midnight in India. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function principalSubject(date: string, weekday: number): Subject {
  // Wednesday and Saturday are suggested Chemistry days, not prescribed PW batch dates.
  if (weekday === 3 || weekday === 6) return 'Chemistry';
  const month = date.slice(0, 7);
  if (month === '2027-01') return 'Chemistry';
  if (month === '2026-11') return 'Physics';
  if (month === '2026-12') return Number(date.slice(8)) % 2 === 0 ? 'Physics' : 'Mathematics';
  return 'Mathematics';
}

export function createDay(date: string): StudyDay {
  if (!isValidDate(date)) throw new Error('Choose a valid calendar date.');
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  const subject = principalSubject(date, weekday);
  const sunday = weekday === 0;
  // Stable IDs let an untouched template be rendered and then edited without
  // persisting it on load. Including the date keeps different days independent.
  const templateId = (slot: number) => `template-${date}-${slot}`;
  const englishActivities = [
    'English · timed practice & corrections',
    'English · grammar & language study',
    'English · read the assigned lesson',
    'English · writing skills practice',
    'English · lesson questions & appreciation',
    'English · written answers from memory',
    'English · revise earlier lessons',
  ];
  // The supplied plan assumes three 70-minute lectures; all slots remain editable.
  // Sunday moves 60 minutes from question practice to English, retaining 510 minutes.
  return {
    date,
    note: '',
    tasks: [
      ...[1, 2, 3].map((number) => ({ id: templateId(number), title: `PW lecture ${number}`, subject, minutes: 70, done: false })),
      { id: templateId(4), title: 'Question practice', subject, minutes: sunday ? 120 : 180, done: false },
      { id: templateId(5), title: 'Previous chapter revision', subject, minutes: 45, done: false },
      { id: templateId(6), title: englishActivities[weekday], subject: 'English', minutes: sunday ? 90 : 30, done: false },
      { id: templateId(7), title: 'Check answers & correct mistakes', subject, minutes: 45, done: false },
    ],
  };
}

export function createInitialData(): AppData {
  const chapters: Chapter[] = [];
  function addChapters(subject: Subject, month: string, start: number, count: number) {
    for (let number = start; number < start + count; number++) {
      chapters.push({
        id: makeId(), title: `Chapter ${String(number).padStart(2, '0')}`,
        subject, month, status: 'not-started', notes: '',
      });
    }
  }
  // Chapter counts come from Rachel's supplied plan. Exact syllabus titles are
  // intentionally left as editable placeholders until her book contents are known.
  addChapters('Mathematics', '2026-10', 1, 10);
  addChapters('Mathematics', '2026-12', 11, 5);
  addChapters('Physics', '2026-11', 1, 10);
  addChapters('Physics', '2026-12', 11, 6);
  MONTHS.forEach((month, index) => addChapters('Chemistry', month.id, index * 4 + 1, 4));
  [
    'Prose, comprehension & grammar',
    'Poetry, appreciation & writing',
    'Novel section & remaining lessons',
    'Revision & timed papers',
  ].forEach((title, index) => chapters.push({
    id: makeId(), title, subject: 'English', month: MONTHS[index].id, status: 'not-started', notes: '',
  }));

  return {
    version: 1,
    chapters,
    goals: [
      { id: makeId(), title: 'Complete all 15 Mathematics chapters', subject: 'Mathematics', dueDate: '2026-12-30', completed: false },
      { id: makeId(), title: 'Complete all 16 Physics chapters', subject: 'Physics', dueDate: '2026-12-30', completed: false },
      { id: makeId(), title: 'Complete the first 12 Chemistry chapters', subject: 'Chemistry', dueDate: '2026-12-30', completed: false },
      { id: makeId(), title: 'Finish the first pass through English', subject: 'English', dueDate: '2026-12-30', completed: false },
      { id: makeId(), title: 'Finish the final 4 Chemistry chapters', subject: 'Chemistry', dueDate: '2027-01-31', completed: false },
      { id: makeId(), title: 'Complete English revision & timed papers', subject: 'English', dueDate: '2027-01-31', completed: false },
    ],
    days: {},
    settings: { name: 'Rachel', dailyTargetMinutes: 510 },
    focusSessions: [],
  };
}
