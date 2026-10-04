# ICU Roster Planner v10.8.2


## v10.8.2 — Safe staff lifecycle and month isolation

- Staff is now managed as a master record plus explicit **active membership for each roster month**.
- Every month stores an explicit `activeStaffIds` list, preventing staff added later from appearing retroactively in older rosters.
- **Remove from Month** clears only the selected month’s assignments/locks/swaps and keeps the master record and historical months intact.
- **Activate This Month** restores a master staff member only to the selected month.
- **Delete Permanently** is now clearly separated as the destructive all-months/master-list action; single and multi-delete use the same cleanup path.
- New manually added staff start with level-appropriate eligibility (R1, R2, Fellow, Rotator) rather than zero eligibility.
- Manual add/edit and Staff Sheet Editor reject duplicate staff names case-insensitively.
- Weekend-capacity checks count only active staff who are actually eligible for at least one required weekend duty.
- Solver payloads exclude inactive staff leave, exact requests, and flexible/free-day constraints, preventing removed staff from making generation infeasible.
- Removing/deleting staff removes cached personal request tokens locally and triggers immediate portal resync; permanent deletion also resyncs known saved-month portals when available so removed staff access is deactivated server-side.
- Current-month staff changes reopen only the affected current roster unless the user explicitly chooses permanent deletion.

## v10.8.1 — Audit repair and exact-solver reliability

- Auto-Generate / Re-optimize now use the deployed Supabase `icu-roster-solve` **v5 exact solver first**, with the browser worker retained as a bounded fallback.
- The hard weekend cap applies to **every active staff member**: max 2 weekends in a 4-weekend month and 3 in a 5-weekend month.
- If that cap makes full automatic weekend coverage impossible, only the **minimum unavoidable weekend on-call gaps** are left open for manual completion; weekday/day-unit gaps are not accepted as planned gaps.
- Added a hard minimum **3 calendar-day spacing between on-calls** (configurable upward in Rules).
- Added hard validation preventing minimum daytime continuity from exceeding the maximum consecutive-work rule.
- Stale/inactive staff assignments and unknown shift references can no longer satisfy coverage and are reported as hard audit violations.
- Backup restore now validates staff, shift, month snapshot, assignment and rule references before replacing local data.
- The existing roster is still replaced only after the browser's independent safety audit accepts the candidate. Publish remains blocked while any mandatory manual gap remains.


## v10.8 — Partial weekend generation for manual completion

The hard weekend limit remains unchanged for Auto-Generate:

- 4-weekend month: maximum 2 weekends per active staff member.
- 5-weekend month: maximum 3 weekends per active staff member.
- One weekend package is either one weekend on-call, or both weekend daytime shifts.

When weekend demand is mathematically higher than that automatic capacity, Auto-Generate no longer refuses the entire month. It generates the roster under the hard weekend cap and intentionally leaves the **minimum number of weekend on-call slots OPEN** for the coordinator to assign manually.

Example: if 64 weekend packages are required but the current staff can automatically provide only 62 under the cap, Auto-Generate completes the rest of the roster and leaves 2 weekend on-call slots open. No staff member is automatically placed on a third weekend.

The generated roster remains Draft and publishing stays blocked until the open slots are completed manually. Optional ER/CCRT coverage is not added while mandatory slots remain open.

## Existing features retained

- Exact server-first Auto-Generate / Re-optimize with bounded browser-worker fallback.
- Strict weekend cap for all staff.
- Day shift = 1 credit; on-call/night = 2 credits.
- Post-call next-day protection.
- Minimum daytime unit continuity.
- PRU two-resident coverage.
- 3–4 day manual daytime unit-block assignment.
- Staff Sheet Editor, Quick Paste, multi-delete, eligibility Select All.
- Shift counter and leave/TRA calculator.
- Clear All Shifts with warning.
- New Month Wizard.
- Flexible-day and swap request portal.
- Coverage/Safety audit, fairness views, Print/Save PDF, backup/restore.

## Staff request workflow
Optional Supabase-backed personal links support:
- Flexible free-day requests.
- Shift swap requests.
- Coordinator review, preview, approve/apply or reject.
- Personal hashed request tokens.
- Link expiry, revoke and regenerate.
- Public staff page does not expose pager/phone data or the whole roster.

## Safety / workflow tools
- New Month Wizard.
- Fix This Day.
- Auto-Balance Unlocked.
- Coverage & Safety audit.
- Fairness view.
- Clear All Shifts (current month only, after warning).
- Download/restore local backup (request-link secrets excluded).
- Print / Save PDF.

## Deployment
See `DEPLOY.md`. Keep `roster-solver-worker.js` beside `index.html` and `app.js`.

## Strict weekend rule
The weekend maximum is a hard automatic-generation rule for every active staff member, not only ICU residents. In a 4-weekend month the maximum is 2 weekends per person; in a 5-weekend month it is 3. One weekend package is either one weekend on-call or both weekend daytime shifts. When automatic weekend capacity is short, v10.8 leaves the minimum weekend on-call gaps open for the coordinator instead of assigning an automatic extra weekend.


## v10.7 staff-entry improvement
The Add/Edit Staff form includes a Select all control for unit/shift eligibility codes.
