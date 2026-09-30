# Rachel's study planner

A personal study dashboard for Rachel's October 2026–January 2027 preparation. Track chapter progress, adjust the study plan, record study time, and keep goals in one place.

## Run locally

Install a current Node.js LTS release, open PowerShell in this folder, and run:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite. Keep the terminal running while using the app.

After the first installation, you can also double-click **Start Study Space.cmd**, then open **http://127.0.0.1:5173**. The launcher keeps the same address so Rachel's saved browser data stays in the same place. If it reports that the port is already in use, the app may already be running at that address.

To check a production build:

```powershell
npm.cmd run build
npm.cmd run preview
```

## Start using the planner

1. Review the four-month draft and rename the numbered chapter placeholders using Rachel's actual textbook or course index.
2. Update chapter progress as Rachel works, and edit goals and study targets to reflect her pace.
3. Use the daily timetable as a starting point. Lecture durations are estimates; breaks and meals are additional.
4. Export a JSON backup regularly. Import that backup when moving to another browser or device.

Checklist time is based on the tasks marked complete. Completed focus-timer sessions appear separately under Progress, so the same work is not added twice. Pausing preserves a running timer; closing or reloading ends an unfinished session without recording it.

The draft contains 15 Mathematics chapters, 16 Physics chapters, and 16 Chemistry chapters. October allocates 10 Mathematics and 4 Chemistry chapters; November allocates 10 Physics and 4 Chemistry chapters; December allocates 5 Mathematics, 6 Physics, and 4 Chemistry chapters; January allocates the final 4 Chemistry chapters.

English runs throughout the plan: prose, comprehension, and grammar in October; poetry, appreciation, and writing skills in November; the novel section, unfinished topics, and revision in December; revision and timed papers in January. These are broad planning topics, not a verified syllabus or textbook index.

The starting timetable reserves three 70-minute PW lectures, three hours of question practice, 45 minutes of revision, 30 minutes of English, and 45 minutes of corrections: **8 hours 30 minutes of focused study**. On Sundays, English increases to 90 minutes and question practice reduces to two hours. Breaks are outside this total. Rachel can adapt this demanding draft to her actual workload and available time.

## Where progress is saved

Progress is stored in this browser's **localStorage**, on this device. There is no account, server database, or automatic cloud sync. Clearing browser site data can remove saved progress. Private browsing may remove it when the session closes.

Browser storage is specific to the site's address and port. The development and preview URLs may have separate data. Export a JSON backup before changing browser, device, or site address, then import it at the new location. Keep backups private if goals or notes contain personal information.

## Plan assumptions

The pasted planning conversation is the starting point. Chapter titles, page numbers, question counts, PW lecture lengths, examination dates, and the final 2027 syllabus have not been verified. The original targets aim to finish Mathematics and Physics plus 12 Chemistry chapters by 30 December, and all 16 Chemistry chapters by 31 January. These are editable study goals, not promised completion dates.

No book prices or purchase recommendations are included: the source conversation's prices and editions were historical and have not been checked.

## Browser checks

Install Playwright's Chromium browser once, then run the desktop and mobile checks:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

The test runner starts a local Vite server at `http://127.0.0.1:5173` when needed and reuses an existing server at that address. Each test uses a fresh browser context, so it does not edit Rachel's normal browser data.
