import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Atom, BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, Check, CheckCheck, ChevronLeft, ChevronRight, CircleHelp, Clock3, Coffee, FlaskConical, Flower2, GraduationCap, LayoutDashboard, MoreHorizontal, Pencil, Play, Plus, Search, Settings2, Sparkles, Sprout, Target, Trash2, X } from 'lucide-react';
import type { AppData, Chapter, ChapterStatus, Goal, StudyTask, Subject } from './lib/model';
import { createDay, isValidDate, localDate, makeId, MONTHS, SUBJECTS } from './lib/plan';
import { loadData, parseBackup, saveData } from './lib/storage';
import { FocusTimer } from './components/FocusTimer';

type Page = 'Overview' | 'Study plan' | 'My goals' | 'Progress';
type Editor = { type: 'chapter'; item?: Chapter } | { type: 'goal'; item?: Goal } | { type: 'task'; item?: StudyTask; date: string } | { type: 'settings' } | { type: 'about' } | null;
const subjectClass = (s: string) => s.toLowerCase();
const subjectIcon = { Mathematics: GraduationCap, Physics: Atom, Chemistry: FlaskConical, English: BookOpen, General: Sprout };
const formatMinutes = (n: number) => n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n}m`;
const formatDate = (date: string, options?: Intl.DateTimeFormatOptions) => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', options || { day: 'numeric', month: 'short', year: 'numeric' });
const changeDate = (date: string, offset: number) => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + offset); return localDate(next); };
const percentage = (completed: number, total: number) => total ? Math.round(completed / total * 100) : 0;
const weekDates = (date: string) => { const day = new Date(`${date}T12:00:00`).getDay(); const monday = changeDate(date, -(day === 0 ? 6 : day - 1)); return Array.from({ length: 7 }, (_, i) => changeDate(monday, i)); };

function SubjectIcon({ subject, size = 20 }: { subject: Subject | 'General'; size?: number }) { const Icon = subjectIcon[subject]; return <Icon size={size} strokeWidth={1.7} />; }

function ProgressBar({ value, className = '' }: { value: number; className?: string }) { return <div className={`progress-track ${className}`} role="progressbar" aria-label="Completion" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div>; }

function Modal({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby="modal-heading" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-top"><h2 id="modal-heading">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>{children}</dialog>;
}

function StudyIllustration() {
  return <svg className="study-illustration" viewBox="0 0 340 225" fill="none" aria-hidden="true">
    <ellipse cx="181" cy="201" rx="137" ry="12" fill="#cfc3e4" opacity=".45" />
    <circle cx="192" cy="103" r="87" fill="#e7ddf1" />
    <path d="M286 59v13m-6-6h12M50 97v10m-5-5h10M100 39v9m-4-5h8" stroke="#ab97c5" strokeWidth="2" strokeLinecap="round" />
    <path d="M246 163c-1-24 0-48 12-75m-10 40c-14-8-18-18-14-25 13 1 17 14 14 25Zm6-20c-2-16 4-25 14-26 4 12-3 20-14 26Zm-6 35c4-16 15-23 24-18-1 13-12 18-24 18Z" fill="#879c80" stroke="#718968" strokeWidth="1.5" />
    <path d="M230 155h37l-6 42h-25l-6-42Z" fill="#dba893" /><path d="M228 153h42v8h-42Z" fill="#e6b8a4" />
    <rect x="79" y="172" width="130" height="24" rx="5" fill="#9f91bf" /><path d="M88 179h121v11H88a5.5 5.5 0 0 1 0-11Z" fill="#faf6ed" /><path d="M98 184h100" stroke="#ded7cb" />
    <g transform="rotate(-7 140 160)"><rect x="71" y="144" width="136" height="25" rx="4" fill="#809b87" /><path d="M78 151h128v12H78a6 6 0 0 1 0-12Z" fill="#f9f6ee" /><path d="M85 156h107" stroke="#ddd6ca" /></g>
    <path d="m82 122 65-18 58 15-61 21-62-18Z" fill="#c7b3dd" /><path d="m82 122 62 18v8l-62-18v-8Z" fill="#ab96c5" /><path d="m144 140 61-21v8l-61 21v-8Z" fill="#faf6ed" /><path d="m149 107 26 7-56 18-24-7 54-18Z" fill="#dac9e8" />
    <path d="M43 160h32v23a13 13 0 0 1-13 13h-6a13 13 0 0 1-13-13v-23Z" fill="#fcf8f0" /><path d="M75 165h5c13 0 13 17 0 17h-5" stroke="#fcf8f0" strokeWidth="6" /><ellipse cx="59" cy="160" rx="16" ry="4" fill="#e8ddd0" /><ellipse cx="59" cy="160" rx="12" ry="2.5" fill="#b1947c" /><path d="M54 147c-7-10 8-13 2-22m11 24c-5-8 6-10 2-17" stroke="#bfaecd" strokeWidth="2" strokeLinecap="round" />
    <path d="m212 69 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#fcfaf4" />
    <path d="M119 62c-7-8-15 3 0 13 15-10 7-21 0-13Z" fill="#ba9ebf" />
  </svg>;
}

export default function App() {
  const [initial] = useState(loadData);
  const [data, setData] = useState<AppData>(initial.data);
  const [saveError, setSaveError] = useState(initial.error || '');
  const [page, setPage] = useState<Page>('Overview');
  const [selectedDate, setSelectedDate] = useState(localDate());
  const today = localDate();
  const [month, setMonth] = useState(MONTHS.find(m => m.id === today.slice(0, 7))?.id || MONTHS[0].id);
  const [filter, setFilter] = useState<Subject | 'All subjects'>('All subjects');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<Editor>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [deletion, setDeletion] = useState<{ title: string; action: () => void } | null>(null);
  const [importData, setImportData] = useState<AppData | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const lastSaved = useRef(JSON.stringify(initial.data));
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const json = JSON.stringify(data);
    if (json !== lastSaved.current) {
      const success = saveData(data);
      setSaveError(success ? '' : 'Your changes could not be saved in this browser. Download a backup to keep them.');
      if (success) lastSaved.current = json;
    }
  }, [data]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t); }, [toast]);

  const chaptersDone = data.chapters.filter(c => c.status === 'complete').length;
  const overall = percentage(chaptersDone, data.chapters.length);
  const activeDay = data.days[selectedDate] || createDay(selectedDate);
  const minutesDone = activeDay.tasks.filter(t => t.done).reduce((n, t) => n + t.minutes, 0);
  const plannedMinutes = activeDay.tasks.reduce((n, t) => n + t.minutes, 0);
  const doneTasks = activeDay.tasks.filter(t => t.done).length;
  const nextGoals = data.goals.filter(g => !g.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const days = weekDates(selectedDate);
  const weeklyMinutes = days.map(date => (data.days[date]?.tasks || []).filter(t => t.done).reduce((n, t) => n + t.minutes, 0));
  const loggedDays = Object.values(data.days).filter(d => d.tasks.some(t => t.done)).length;
  const allMinutes = Object.values(data.days).flatMap(d => d.tasks).filter(t => t.done).reduce((n, t) => n + t.minutes, 0);
  const focusMinutes = data.focusSessions.reduce((n, s) => n + s.minutes, 0);
  const currentMonth = MONTHS.find(m => m.id === month)!;

  function updateDay(date: string, update: (day: ReturnType<typeof createDay>) => ReturnType<typeof createDay>) {
    setData(prev => ({ ...prev, days: { ...prev.days, [date]: update(prev.days[date] || createDay(date)) } }));
  }
  function toggleTask(task: StudyTask) {
    updateDay(selectedDate, day => ({ ...day, tasks: day.tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t) }));
  }
  function toggleGoal(goal: Goal) { setData(prev => ({ ...prev, goals: prev.goals.map(g => g.id === goal.id ? { ...g, completed: !g.completed } : g) })); }
  function setStatus(id: string, status: ChapterStatus) { setData(prev => ({ ...prev, chapters: prev.chapters.map(c => c.id === id ? { ...c, status } : c) })); }
  function navigate(next: Page) { setPage(next); setSearch(''); mainRef.current?.scrollTo(0, 0); }
  function exportBackup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `rachel-study-backup-${today}.json`; link.click(); URL.revokeObjectURL(url); setToast('Backup downloaded. Keep it somewhere safe.');
  }
  async function readBackup(file?: File) {
    if (!file) return;
    try { if (file.size > 5_000_000) throw new Error('Please choose a backup smaller than 5 MB.'); setImportData(parseBackup(await file.text())); setEditor(null); }
    catch (error) { setToast(error instanceof Error ? error.message : 'This backup could not be opened.'); }
    if (importRef.current) importRef.current.value = '';
  }
  function restoreBackup(backup: AppData) {
    const success = saveData(backup);
    if (success) lastSaved.current = JSON.stringify(backup);
    setSaveError(success ? '' : 'This browser could not save the restored backup. Keep the backup file safe.');
    setData(backup); setImportData(null);
    setToast(success ? 'Your study space has been restored.' : 'Backup opened. Browser storage is unavailable.');
  }
  function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor) return;
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get('title') || '').trim();
    if (['chapter', 'goal', 'task'].includes(editor.type) && !title) { setToast('Add a title with at least one letter or number.'); return; }
    if (editor.type === 'chapter') {
      const chapter: Chapter = { id: editor.item?.id || makeId(), title, subject: fields.get('subject') as Subject, month: String(fields.get('month')), status: fields.get('status') as ChapterStatus, notes: String(fields.get('notes') || '').trim() };
      setData(prev => ({ ...prev, chapters: editor.item ? prev.chapters.map(c => c.id === chapter.id ? chapter : c) : [...prev.chapters, chapter] }));
    } else if (editor.type === 'goal') {
      const goal: Goal = { id: editor.item?.id || makeId(), title, subject: fields.get('subject') as Subject | 'General', dueDate: String(fields.get('dueDate')), completed: editor.item?.completed || false };
      setData(prev => ({ ...prev, goals: editor.item ? prev.goals.map(g => g.id === goal.id ? goal : g) : [...prev.goals, goal] }));
    } else if (editor.type === 'task') {
      const task: StudyTask = { id: editor.item?.id || makeId(), title, subject: fields.get('subject') as Subject | 'General', minutes: Number(fields.get('minutes')), done: editor.item?.done || false };
      updateDay(editor.date, day => ({ ...day, tasks: editor.item ? day.tasks.map(t => t.id === task.id ? task : t) : [...day.tasks, task] }));
    } else if (editor.type === 'settings') {
      const name = String(fields.get('name') || '').trim();
      if (!name) { setToast('Please enter a name.'); return; }
      setData(prev => ({ ...prev, settings: { name, dailyTargetMinutes: Math.round(Number(fields.get('hours')) * 60) } }));
    }
    setEditor(null); setToast('Saved. A little more clarity for your day.');
  }

  const datePicker = <div className="date-picker"><button className="icon-button" aria-label="Previous day" onClick={() => setSelectedDate(changeDate(selectedDate, -1))}><ChevronLeft size={17} /></button><label><CalendarDays size={16} /><span>{formatDate(selectedDate, { day: 'numeric', month: 'short' })}</span><input aria-label="Study date" type="date" value={selectedDate} onChange={e => e.target.validity.valid && isValidDate(e.target.value) && setSelectedDate(e.target.value)} min="2020-01-01" max="2100-12-31" /></label><button className="icon-button" aria-label="Next day" onClick={() => setSelectedDate(changeDate(selectedDate, 1))}><ChevronRight size={17} /></button>{selectedDate !== today && <button className="text-button today-reset" onClick={() => setSelectedDate(today)}>Today</button>}</div>;

  const rhythm = (large = false) => <section className={`panel rhythm-panel ${large ? 'large-rhythm' : ''}`}><div className="panel-title"><h2>This week’s rhythm</h2><span className="subtle-icon"><ChartNoAxesColumnIncreasing size={18} /></span></div><p className="muted small">Completed study time · {formatDate(days[0], { day: 'numeric', month: 'short' })}–{formatDate(days[6], { day: 'numeric', month: 'short' })}</p><div className="week-chart" role="img" aria-label={days.map((date, i) => `${formatDate(date, { weekday: 'long' })}: ${weeklyMinutes[i]} minutes`).join(', ')}>{days.map((date, i) => <div className={`chart-column ${date === selectedDate ? 'selected' : ''}`} key={date}><span className="bar-label">{weeklyMinutes[i] ? formatMinutes(weeklyMinutes[i]) : '–'}</span><div className="chart-track"><div style={{ height: `${Math.min(100, weeklyMinutes[i] / Math.max(data.settings.dailyTargetMinutes, ...weeklyMinutes, 1) * 100)}%` }} /></div><span>{formatDate(date, { weekday: 'short' }).slice(0, 1)}</span></div>)}</div><div className="chart-foot"><span><span className="legend-dot" /> {formatMinutes(weeklyMinutes.reduce((a, b) => a + b, 0))} this week</span><span>Every session counts</span></div></section>;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <a href="#" className="brand" onClick={e => { e.preventDefault(); navigate('Overview'); }}><span className="brand-icon"><BookOpen size={24} strokeWidth={1.7} /></span><span>{data.settings.name.toLowerCase()}’s<span className="brand-second">study space<span className="brand-dot">.</span></span></span></a>
      <div className="workspace-label">YOUR LITTLE CORNER</div>
      <nav aria-label="Main navigation">{([{ name: 'Overview', icon: LayoutDashboard }, { name: 'Study plan', icon: CalendarDays }, { name: 'My goals', icon: Target }, { name: 'Progress', icon: ChartNoAxesColumnIncreasing }] as const).map(({ name, icon: Icon }) => <button key={name} aria-label={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => navigate(name)} aria-current={page === name ? 'page' : undefined}><Icon size={19} strokeWidth={1.7} /><span>{name}</span>{name === 'My goals' && <span className="nav-count">{nextGoals.length}</span>}</button>)}</nav>
      <div className="sidebar-note"><span className="note-flower"><Flower2 size={29} strokeWidth={1.3} /></span><p>Small steps.<br />Brighter tomorrows.</p><span>You’ve got this, {data.settings.name}.</span></div>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setEditor({ type: 'settings' })}><Settings2 size={18} strokeWidth={1.7} /><span>Settings & backup</span></button><button className="profile" onClick={() => setEditor({ type: 'settings' })}><span className="avatar">{data.settings.name.charAt(0).toUpperCase()}</span><span><strong>{data.settings.name}</strong><small>HSC · Class 12 · 2026–27</small></span><MoreHorizontal size={18} /></button></div>
    </aside>
    <main id="main-content" className="main" ref={mainRef}>
      <header className="topbar"><div className="breadcrumb"><span>My workspace</span><ChevronRight size={14} /><strong>{page}</strong></div><div className="topbar-right"><span className={`save-indicator ${saveError ? 'error' : ''}`}><span />{saveError ? 'Backup needed' : 'Saved on this device'}</span><button className="icon-button help-button" onClick={() => setEditor({ type: 'about' })} aria-label="About your study plan"><CircleHelp size={19} /></button><button className="avatar small-avatar" aria-label="Open settings and backup" onClick={() => setEditor({ type: 'settings' })}>{data.settings.name.charAt(0).toUpperCase()}</button></div></header>
      <div className="page-content">
        {saveError && <div className="notice warning" role="alert">{saveError}<button className="text-button" onClick={exportBackup}>Download backup</button></div>}
        <div className="page-heading"><div><div className="eyebrow">{page === 'Overview' ? formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : 'ONE STEP CLOSER, EVERY DAY'}</div><h1>{page === 'Overview' ? `Hello, ${data.settings.name}` : page === 'Study plan' ? 'Your study plan' : page === 'My goals' ? 'Big dreams. Small steps.' : 'Look how you’re growing.'}{page === 'Overview' && <span className="greeting-flower">✳</span>}</h1><p>{page === 'Overview' ? 'A fresh page. A little focus. A step closer to your goals.' : page === 'Study plan' ? 'Your October–January roadmap, with room to make it your own.' : page === 'My goals' ? 'Give your ambitions a little structure, and keep moving forward.' : 'An honest view of your effort. Every bit of progress belongs here.'}</p></div><button className="button primary focus-button" onClick={() => setTimerOpen(true)}><Play size={15} fill="currentColor" /> Start a focus session</button></div>

        {page === 'Overview' && <>
          <section className="hero"><div className="hero-copy"><span className="hero-tag"><Sparkles size={13} /> YOUR NEXT CHAPTER STARTS HERE</span><h2>A little progress,<br /><em>every single day.</em></h2><p>You don’t have to do it all today.<br />Just take the next small step.</p><button className="hero-link" onClick={() => navigate('Study plan')}>Explore your study plan <ArrowRight size={16} /></button></div><StudyIllustration /><div className="hero-progress"><div className="progress-ring" style={{ '--progress': `${overall}%` } as CSSProperties}><div><strong>{overall}<small>%</small></strong><span>complete</span></div></div><span>Your syllabus journey</span><small>{chaptersDone} of {data.chapters.length} study units finished</small></div></section>
          <div className="section-heading"><h2>The bigger picture <span className="heading-count">4 subjects, one goal</span></h2><button className="text-button" onClick={() => navigate('Study plan')}>View study plan <ArrowRight size={14} /></button></div>
          <div className="subject-grid">{SUBJECTS.map(subject => { const chapters = data.chapters.filter(c => c.subject === subject); const complete = chapters.filter(c => c.status === 'complete').length; const pct = percentage(complete, chapters.length); return <button className={`subject-card ${subjectClass(subject)}`} key={subject} onClick={() => { setFilter(subject); const next = chapters.find(c => c.status !== 'complete') || chapters[0]; if (next) setMonth(next.month); navigate('Study plan'); }}><div className="subject-card-top"><span className="subject-icon"><SubjectIcon subject={subject} /></span><ArrowRight size={16} /></div><h3>{subject}</h3><p>{complete} <span>/ {chapters.length} {subject === 'English' ? 'milestones' : 'chapters'} complete</span></p><div className="subject-progress"><ProgressBar value={pct} /><span>{pct}%</span></div></button>; })}</div>
          <div className="dashboard-grid"><section className="panel schedule-panel"><div className="panel-title"><h2>{selectedDate === today ? 'Today’s' : 'Your'} study checklist <span className="pill">{doneTasks}/{activeDay.tasks.length}</span></h2>{datePicker}</div><div className="schedule-summary"><span><Clock3 size={14} /> {formatMinutes(minutesDone)} of {formatMinutes(plannedMinutes)} complete</span><span>{formatMinutes(data.settings.dailyTargetMinutes)} daily goal</span></div><ProgressBar value={percentage(minutesDone, plannedMinutes)} />
            {selectedDate < '2026-10-01' && <div className="preparation-note"><Sprout size={15} /><span>Your four-month plan begins 1 October. Use today to get ready.</span></div>}
            {selectedDate > '2027-01-31' && <div className="preparation-note"><Sprout size={15} /><span>Your roadmap is complete. Adapt this daily template for your next steps.</span></div>}
            <div className="task-list">{activeDay.tasks.map((task, i) => <div className={`task-row ${task.done ? 'is-done' : ''}`} key={task.id}><button className="check-box" aria-label={`${task.done ? 'Mark incomplete' : 'Complete'}: ${task.title}`} aria-pressed={task.done} onClick={() => toggleTask(task)}>{task.done && <Check size={14} />}</button><span className={`task-type ${subjectClass(task.subject)}`}>{i < 3 && task.title.toLowerCase().includes('lecture') ? <Play size={15} /> : <SubjectIcon subject={task.subject} size={16} />}</span><div className="task-info"><strong>{task.title}</strong><span>{task.subject}</span></div><span className="task-duration">{formatMinutes(task.minutes)}</span><button className="icon-button row-edit" onClick={() => setEditor({ type: 'task', item: task, date: selectedDate })} aria-label={`Edit ${task.title}`}><Pencil size={14} /></button></div>)}</div><button className="add-task" onClick={() => setEditor({ type: 'task', date: selectedDate })}><Plus size={16} /> Add a study task</button><div className="schedule-tip"><Coffee size={15} /><span>Make room for breaks. Your study time doesn’t include them.</span></div></section><div className="dashboard-side">{rhythm()}<section className="panel next-goal"><div className="panel-title"><h2>A goal to grow towards</h2><Target size={18} /></div>{nextGoals[0] ? <><span className={`subject-tag ${subjectClass(nextGoals[0].subject)}`}>{nextGoals[0].subject}</span><h3>{nextGoals[0].title}</h3><div className="goal-bottom"><span><CalendarDays size={14} /> {formatDate(nextGoals[0].dueDate, { day: 'numeric', month: 'short' })}</span><button className="text-button" onClick={() => navigate('My goals')}>All goals <ArrowRight size={14} /></button></div></> : <div className="mini-empty"><Sprout size={25} /><p>A little space for your next ambition.</p><button className="text-button" onClick={() => setEditor({ type: 'goal' })}>Add a goal <Plus size={14} /></button></div>}</section><section className="daily-note"><div><Pencil size={16} /><h2>A thought for today</h2><span>just for you</span></div><textarea aria-label="Daily reflection" maxLength={4000} placeholder="What went well? What’s on your mind?" value={activeDay.note} onChange={e => updateDay(selectedDate, day => ({ ...day, note: e.target.value }))} /></section></div></div>
        </>}

        {page === 'Study plan' && <>
          <div className="month-tabs" role="tablist" aria-label="Study month">{MONTHS.map(m => { const units = data.chapters.filter(c => c.month === m.id); const complete = units.filter(c => c.status === 'complete').length; return <button role="tab" aria-selected={month === m.id} key={m.id} className={month === m.id ? 'active' : ''} onClick={() => setMonth(m.id)}><span>{m.label}<small>{m.year}</small></span><span>{complete} / {units.length} complete</span><ProgressBar value={percentage(complete, units.length)} /></button>; })}</div>
          <div className="plan-month-heading"><div><h2>{currentMonth.label}, one chapter at a time.</h2><p>{currentMonth.description}</p></div><button className="button primary" onClick={() => setEditor({ type: 'chapter' })}><Plus size={16} /> Add a chapter</button></div>
          <div className="filter-bar"><div className="filter-tabs">{(['All subjects', ...SUBJECTS] as const).map(s => <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>{s}</button>)}</div><label className="search-box"><Search size={16} /><input type="search" placeholder="Find a chapter…" aria-label="Find a chapter" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
          <div className="chapter-groups">{SUBJECTS.filter(s => filter === 'All subjects' || s === filter).map(subject => { const chapters = data.chapters.filter(c => c.month === month && c.subject === subject && `${c.title} ${c.notes}`.toLowerCase().includes(search.toLowerCase())); if (!chapters.length) return null; return <section className="panel chapter-group" key={subject}><div className="chapter-group-heading"><span className={`subject-icon ${subjectClass(subject)}`}><SubjectIcon subject={subject} /></span><h3>{subject}</h3><span>{chapters.filter(c => c.status === 'complete').length} of {chapters.length} complete</span></div>{chapters.map(chapter => <div className={`chapter-row ${chapter.status === 'complete' ? 'is-done' : ''}`} key={chapter.id}><button className="check-box" aria-label={`${chapter.status === 'complete' ? 'Mark incomplete' : 'Complete'}: ${subject} ${chapter.title}`} aria-pressed={chapter.status === 'complete'} onClick={() => setStatus(chapter.id, chapter.status === 'complete' ? 'not-started' : 'complete')}>{chapter.status === 'complete' && <Check size={14} />}</button><button className="chapter-title" aria-label={`Edit ${chapter.subject} ${chapter.title} details`} onClick={() => setEditor({ type: 'chapter', item: chapter })}><strong>{chapter.title}</strong>{chapter.notes && <small>{chapter.notes}</small>}</button><select className={`status-select ${chapter.status}`} aria-label={`Status of ${subject} ${chapter.title}`} value={chapter.status} onChange={e => setStatus(chapter.id, e.target.value as ChapterStatus)}><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="complete">Complete</option></select><button className="icon-button" aria-label={`Edit ${subject} ${chapter.title}`} onClick={() => setEditor({ type: 'chapter', item: chapter })}><Pencil size={15} /></button></div>)}</section>; })}</div>
          {!data.chapters.some(c => c.month === month && (filter === 'All subjects' || c.subject === filter) && `${c.title} ${c.notes}`.toLowerCase().includes(search.toLowerCase())) && <div className="empty-state"><BookOpen size={32} /><h3>{search ? 'No chapters found' : 'A little breathing room'}</h3><p>{search ? 'Try a different name or subject.' : 'There are no chapters planned for this subject this month.'}</p><button className="button secondary" onClick={() => setEditor({ type: 'chapter' })}>Add a chapter</button></div>}
          <div className="notice"><CircleHelp size={17} /><span>Chapter names are placeholders. Rename them to match your PW batch or book’s contents. English uses four broad monthly milestones.</span></div>
        </>}

        {page === 'My goals' && <>
          <div className="goals-banner"><span className="goals-banner-icon"><Target size={28} strokeWidth={1.5} /></span><div><h2>A direction, not a deadline to worry about.</h2><p>Your plan can change as you learn. Edit a goal whenever you need to.</p></div><button className="button primary" onClick={() => setEditor({ type: 'goal' })}><Plus size={16} /> New goal</button></div>
          <div className="section-heading"><h2>In the works <span className="pill">{nextGoals.length}</span></h2><span className="muted small">One thoughtful step at a time</span></div>
          <div className="goals-grid">{nextGoals.map(goal => <GoalCard key={goal.id} goal={goal} today={today} onToggle={() => toggleGoal(goal)} onEdit={() => setEditor({ type: 'goal', item: goal })} />)}</div>
          {!nextGoals.length && <div className="empty-state"><Flower2 size={35} /><h3>Room for something new</h3><p>Add a goal to give your next study session a direction.</p><button className="button secondary" onClick={() => setEditor({ type: 'goal' })}><Plus size={16} /> New goal</button></div>}
          {data.goals.some(g => g.completed) && <><div className="section-heading completed-heading"><h2><CheckCheck size={20} /> Look what you’ve done <span className="pill">{data.goals.filter(g => g.completed).length}</span></h2></div><div className="goals-grid">{data.goals.filter(g => g.completed).map(goal => <GoalCard key={goal.id} goal={goal} today={today} onToggle={() => toggleGoal(goal)} onEdit={() => setEditor({ type: 'goal', item: goal })} />)}</div></>}
        </>}

        {page === 'Progress' && <>
          <div className="stats-grid"><Stat icon={<BookOpen size={20} />} value={`${chaptersDone}/${data.chapters.length}`} label="Study units complete" note="Chapters + English milestones" /><Stat icon={<Clock3 size={20} />} value={formatMinutes(allMinutes)} label="Completed study tasks" note="Based on your checked tasks" /><Stat icon={<CalendarDays size={20} />} value={String(loggedDays)} label="Days you showed up" note="Days with a completed task" /><Stat icon={<Target size={20} />} value={String(data.goals.filter(g => g.completed).length)} label="Goals achieved" note={`${data.goals.length} goals on your journey`} /></div>
          <div className="section-heading"><h2>Your effort, over time</h2>{datePicker}</div><div className="progress-grid">{rhythm(true)}<section className="panel subject-breakdown"><div className="panel-title"><h2>Subject progress</h2><BookOpen size={18} /></div>{SUBJECTS.map(subject => { const units = data.chapters.filter(c => c.subject === subject); const complete = units.filter(c => c.status === 'complete').length; return <div key={subject} className={`breakdown-row ${subjectClass(subject)}`}><div><span><SubjectIcon subject={subject} size={17} />{subject}</span><strong>{complete}/{units.length}</strong></div><ProgressBar value={percentage(complete, units.length)} /></div>; })}</section></div>
          <div className="section-heading"><h2>Your monthly milestones</h2><span className="muted small">A four-month journey</span></div><div className="milestone-grid">{MONTHS.map(m => { const units = data.chapters.filter(c => c.month === m.id); const completed = units.filter(c => c.status === 'complete').length; return <button className="panel milestone-card" key={m.id} onClick={() => { setMonth(m.id); setFilter('All subjects'); navigate('Study plan'); }}><span className="milestone-month">{m.shortLabel}<small>{m.year}</small></span><div><strong>{m.label}</strong><span>{completed} of {units.length} units finished</span><ProgressBar value={percentage(completed, units.length)} /></div><ArrowRight size={17} /></button>; })}</div>
          <section className="panel focus-history"><div className="panel-title"><h2><Clock3 size={18} /> Focus sessions</h2><span className="pill">{formatMinutes(focusMinutes)} focused</span></div><p className="muted small">Timer sessions are tracked separately from checklist hours, so time is never added twice.</p>{data.focusSessions.length ? <div className="session-list">{data.focusSessions.slice().reverse().slice(0, 10).map(session => <div key={session.id}><span className={`subject-tag ${subjectClass(session.subject)}`}>{session.subject}</span><span>{formatDate(session.date)}</span><strong>{formatMinutes(session.minutes)}</strong></div>)}</div> : <div className="focus-empty"><Coffee size={23} /><span>Your first focus session is a lovely place to start.</span><button className="text-button" onClick={() => setTimerOpen(true)}>Let’s focus <ArrowRight size={15} /></button></div>}</section>
        </>}
        <footer className="page-footer"><span><Sprout size={14} /> Made for your pace, {data.settings.name}.</span><span>October 2026 — January 2027</span></footer>
      </div>
    </main>
    {editor && <Modal title={editor.type === 'settings' ? 'Make this space yours' : editor.type === 'about' ? 'A plan with room to grow' : `${editor.item ? 'Edit' : 'Add'} ${editor.type === 'task' ? 'study task' : editor.type === 'chapter' ? 'chapter or milestone' : 'goal'}`} onClose={() => setEditor(null)}>
      {editor.type === 'about' ? <div className="about-content"><span className="about-icon"><Sprout size={32} /></span><p>This space starts with Rachel’s October 2026–January 2027 plan: 15 Mathematics chapters, 16 Physics chapters, 16 Chemistry chapters, and English every week.</p><p>The editable daily template has three 70-minute PW lectures, question practice, revision, English, and corrections. That’s <strong>8 hours 30 minutes</strong>, with breaks and meals added separately. On Sunday, English gets 90 minutes and question practice gets 2 hours.</p><p>Chemistry is the default principal subject on Wednesdays and Saturdays. Other days use Maths in October, Physics in November, alternate Maths/Physics in December, and Chemistry in January. This is an editable starting point; actual lecture lengths and chapter names still need your input.</p><p>English’s weekly rhythm: Monday grammar, Tuesday reading, Wednesday writing, Thursday lesson questions/appreciation, Friday recall, Saturday revision, Sunday timed practice.</p><div className="notice"><span>Progress saves only in this browser. Use Settings & backup to move it to another device or keep a safe copy.</span></div><button className="button primary full-width" onClick={() => setEditor(null)}>Let’s make progress</button></div> : <form onSubmit={saveEditor}>
        {editor.type === 'settings' ? <><label className="field">Your name<input name="name" required maxLength={40} defaultValue={data.settings.name} autoComplete="given-name" /></label><label className="field">Daily study goal (hours)<input name="hours" type="number" min="0.5" max="16" step="0.25" required defaultValue={data.settings.dailyTargetMinutes / 60} /></label><p className="field-help">This changes the goal shown on your dashboard and chart. Edit individual tasks to adjust your timetable.</p><div className="backup-section"><h3>A little backup, a lot of peace of mind.</h3><p>Your progress lives in this browser. A backup lets you keep a copy or move to another device. Devices don’t sync automatically.</p><div className="backup-buttons"><button className="button secondary" type="button" onClick={exportBackup}><ArrowDownToLine size={16} /> Export backup</button><button className="button secondary" type="button" onClick={() => importRef.current?.click()}><ArrowUpFromLine size={16} /> Restore backup</button></div></div></> : <>
          <label className="field">{editor.type === 'chapter' ? 'Chapter or milestone name' : editor.type === 'task' ? 'What will you work on?' : 'What would you like to achieve?'}<input name="title" required maxLength={180} autoFocus defaultValue={editor.item?.title || ''} placeholder={editor.type === 'chapter' ? 'e.g. Mathematical Logic' : editor.type === 'goal' ? 'e.g. Complete my first timed paper' : 'e.g. Revise today’s Chemistry notes'} /></label>
          <div className="form-grid"><label className="field">Subject<select name="subject" defaultValue={editor.item?.subject || (filter === 'All subjects' ? editor.type === 'chapter' ? 'Mathematics' : 'General' : filter)}>{editor.type !== 'chapter' && <option>General</option>}{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select></label>
            {editor.type === 'chapter' ? <label className="field">Planned month<select name="month" defaultValue={editor.item?.month || month}>{MONTHS.map(m => <option key={m.id} value={m.id}>{m.label} {m.year}</option>)}</select></label> : editor.type === 'goal' ? <label className="field">Target date<input type="date" name="dueDate" min="2020-01-01" max="2100-12-31" required defaultValue={editor.item?.dueDate || `${month}-28`} /></label> : <label className="field">Duration (minutes)<input name="minutes" type="number" required min="1" max="720" step="1" defaultValue={editor.item?.minutes || 30} /></label>}
          </div>
          {editor.type === 'chapter' && <><label className="field">Progress<select name="status" defaultValue={editor.item?.status || 'not-started'}><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="complete">Complete</option></select></label><label className="field">Notes <span className="optional">(optional)</span><textarea name="notes" rows={3} maxLength={4000} placeholder="Pages to practise, tricky topics, a reminder…" defaultValue={editor.item?.notes || ''} /></label></>}
          {editor.type === 'task' && <p className="field-help">For {formatDate(editor.date)} only. Other days keep their own checklists.</p>}
        </>}
        <div className="modal-actions">{editor.type !== 'settings' && editor.item && <button type="button" className="button danger delete-button" onClick={() => { const current = editor; setEditor(null); setDeletion({ title: current.item!.title, action: () => { if (current.type === 'chapter') setData(prev => ({ ...prev, chapters: prev.chapters.filter(c => c.id !== current.item!.id) })); else if (current.type === 'goal') setData(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== current.item!.id) })); else updateDay(current.date, day => ({ ...day, tasks: day.tasks.filter(t => t.id !== current.item!.id) })); } }); }}><Trash2 size={15} /> Delete</button>}<button className="button secondary" type="button" onClick={() => setEditor(null)}>Cancel</button><button className="button primary" type="submit"><Check size={16} /> Save {editor.type === 'settings' ? 'changes' : editor.type}</button></div>
      </form>}
    </Modal>}
    {deletion && <Modal title="Remove this from your plan?" onClose={() => setDeletion(null)}><p className="confirm-text">“{deletion.title}” and its recorded progress will be removed. You can cancel to keep it.</p><div className="modal-actions"><button className="button secondary" onClick={() => setDeletion(null)}>Keep it</button><button className="button danger filled" onClick={() => { deletion.action(); setDeletion(null); setToast('Removed from your plan.'); }}>Remove item</button></div></Modal>}
    {importData && <Modal title="Restore your study space?" onClose={() => setImportData(null)}><p className="confirm-text">This backup contains <strong>{importData.chapters.length} study units</strong>, <strong>{importData.goals.length} goals</strong>, and <strong>{Object.keys(importData.days).length} saved days</strong> for {importData.settings.name}.</p><div className="notice warning">Restoring replaces the progress currently on this device. Download your current backup first if you want to keep it.</div><button className="text-button backup-current" onClick={exportBackup}><ArrowDownToLine size={16} /> Download current backup</button><div className="modal-actions"><button className="button secondary" onClick={() => setImportData(null)}>Cancel</button><button className="button primary" onClick={() => restoreBackup(importData)}>Restore backup</button></div></Modal>}
    {timerOpen && <FocusTimer onClose={() => setTimerOpen(false)} onComplete={(minutes, subject) => { setData(prev => ({ ...prev, focusSessions: [...prev.focusSessions, { id: makeId(), date: localDate(), minutes, subject }] })); setToast('A little focus, a real step forward. Session saved.'); }} />}
    <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Restore a backup file" onChange={e => void readBackup(e.target.files?.[0])} />
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>;
}

function GoalCard({ goal, today, onToggle, onEdit }: { goal: Goal; today: string; onToggle: () => void; onEdit: () => void }) {
  return <article className={`panel goal-card ${goal.completed ? 'is-complete' : ''}`}><div className="goal-card-top"><span className={`subject-tag ${subjectClass(goal.subject)}`}><SubjectIcon subject={goal.subject} size={14} />{goal.subject}</span><button className="icon-button" onClick={onEdit} aria-label={`Edit goal: ${goal.title}`}><Pencil size={16} /></button></div><h3>{goal.title}</h3><div className="goal-card-date"><CalendarDays size={14} />{formatDate(goal.dueDate)}{!goal.completed && goal.dueDate < today && <span className="review-label">Time to revisit</span>}</div><button className={`goal-complete ${goal.completed ? 'done' : ''}`} onClick={onToggle}><span className="check-box">{goal.completed && <Check size={13} />}</span>{goal.completed ? 'Achieved · click to reopen' : 'Mark as achieved'}</button></article>;
}

function Stat({ icon, value, label, note }: { icon: ReactNode; value: string; label: string; note: string }) { return <section className="panel stat-card"><span className="stat-icon">{icon}</span><strong>{value}</strong><h3>{label}</h3><p>{note}</p></section>; }
