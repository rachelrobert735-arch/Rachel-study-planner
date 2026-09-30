export type Subject = 'Mathematics' | 'Physics' | 'Chemistry' | 'English';

export type ChapterStatus = 'not-started' | 'in-progress' | 'complete';

export interface Chapter {
  id: string;
  title: string;
  subject: Subject;
  month: string;
  status: ChapterStatus;
  notes: string;
}

export interface Goal {
  id: string;
  title: string;
  subject: Subject | 'General';
  dueDate: string;
  completed: boolean;
}

export interface StudyTask {
  id: string;
  title: string;
  subject: Subject | 'General';
  minutes: number;
  done: boolean;
}

export interface StudyDay {
  date: string;
  tasks: StudyTask[];
  note: string;
}

export interface Settings {
  name: string;
  dailyTargetMinutes: number;
}

export interface AppData {
  version: 1;
  chapters: Chapter[];
  goals: Goal[];
  days: Record<string, StudyDay>;
  settings: Settings;
  focusSessions: {
    id: string;
    date: string;
    minutes: number;
    subject: Subject | 'General';
  }[];
}
