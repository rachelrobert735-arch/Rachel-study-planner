# Study planner acceptance checks

## Draft data requirements

- Seed October 2026 through January 2027 with Mathematics 15, Physics 16, and Chemistry 16 chapter records; do not imply generic titles are an official syllabus.
- Monthly PCM allocations: October M10/C4; November P10/C4; December M5/P6/C4; January C4. Counts must agree with subject and overall progress.
- English should be present in every month. Follow the final repeated monthly summary: October prose/comprehension/grammar; November poetry/appreciation/writing; December novel/remaining work/revision; January revision/timed papers.
- Clearly treat the plan as a draft. Exact chapter titles, chapter-wise questions, lecture lengths, and examination dates were not supplied.
- Default daily focus total is 510 minutes. Three 70-minute PW lectures total 210 minutes; practice 180, revision 45, English 30, corrections 45. Sundays use practice 120 and English 90, preserving 510 minutes. English totals 270 minutes in a full week.
- The source's December milestone is 30 December; January's is 31 January. Avoid claiming a verified board examination date.

## Essential manual checks

1. **First visit:** Open a fresh browser storage context. The draft appears once, with zero completed chapters and no invented study history.
2. **Persistence:** Change a chapter's title and progress; create or edit a goal; reload. The saved values remain. Navigation and filtering do not reset them.
3. **Progress arithmetic:** Complete one Mathematics chapter. Subject, month, and overall totals update consistently. Undo it and confirm the numbers return to their prior state. English topic progress must not silently change the advertised PCM chapter count.
4. **Editing:** Make a valid title change; cancel another change; attempt a blank required title. Verify save, cancel, and validation behave distinctly. Dates and progress values cannot silently become invalid or exceed their bounds.
5. **Goals:** Add a goal with a target, edit it, complete it, and reopen it where supported. Verify the goal stays associated with the intended subject and target date.
6. **Timetable:** Inspect a weekday and a Sunday. Confirm the expected lecture slots and English/practice difference. Edited durations update the displayed total; break time is not silently counted as focused time.
7. **Timer:** Start, pause, resume, and reset a session. Ensure timer control does not create duplicate study entries. A completed session is dated correctly and recorded once in the separate Focus sessions history; it does not increase checklist time. Closing or reloading ends an unfinished session without saving it.
8. **Backup:** Export data, make a visible change, and restore the JSON backup. Verify chapters, goals, timetable changes, and study records return correctly. Reject malformed or unsupported files with a readable error without damaging existing data.
9. **Storage failure:** If storage is unavailable or invalid, the app should remain usable and explain any inability to persist. It must not claim data has been saved when storage failed.
10. **Responsive use:** Inspect desktop and a narrow mobile width. Primary navigation, edit forms, timer controls, and dialogs fit without clipped controls or horizontal page overflow.
11. **Accessibility:** Navigate major actions by keyboard. Check visible focus, useful form labels, dialog dismissal, and readable text contrast. Completion must be understandable without color alone.
12. **Build:** Run `npm.cmd run build`. Resolve TypeScript/build errors and inspect the production preview for runtime errors.

## Source inconsistencies and implementation boundaries

One earlier passage puts remaining writing skills in November, while another puts writing skills in December. The final repeated monthly summary places writing skills in November; broad editable English topics resolve this without inventing exact lessons or page numbers.

No chapter index was attached. The 47 PCM chapter target is the user's proposed plan, not an independently verified count of the current syllabus. English's exact chapter list and exam pattern are also unverified. Do not reproduce historical prices or claim a book edition is current.

This is a browser-local personal planner. Test and describe JSON backup/restore, not automatic sync or multi-user access. LocalStorage belongs to the current origin; moving between development and preview ports may require an export/import.

## Automated browser coverage

`npm.cmd run test:e2e` runs desktop Chromium and mobile Chromium checks in isolated browser contexts. Install the browser first with `npx.cmd playwright install chromium`. The suite covers initial draft totals and Sunday adjustments; chapter and goal creation, editing, completion, deletion; daily task isolation and reload persistence; JSON export, rejected invalid imports, and confirmed restoration; timer pause/resume and single recording; unfinished-session confirmation; and horizontal overflow on every main page.
