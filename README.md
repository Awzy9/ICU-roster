# ICU Roster Planner v10.8.2


## v10.8.2 â€” Safe staff lifecycle and month isolation

- Staff is now managed as a master record plus explicit **active membership for each roster month**.
- Every month stores an explicit `activeStaffIds` list, preventing staff added later from appearing retroactively in older rosters.
- **Remove from Month** clears only the selected monthâ€™s assignments/locks/swaps and keeps the master record and historical months intact.
- **Activate This Month** restores a master staff member only to the selected month.
- **Delete Permanently** is now clearly separated as the destructive all-months/master-list action; single and multi-delete use the same cleanup path.
- New manually added staff start with level-appropriate eligibility (R1, R2, Fellow, Rotator) rather than zero eligibility.
- Manual add/edit and Staff Sheet Editor reject duplicate staff names case-insensitively.
- Weekend-capacity checks count only active staff who are actually eligible for at least one required weekend duty.
- Solver payloads exclude inactive staff leave, exact requests, and flexible/free-day constraints, preventing removed staff from making generation infeasible.
- Removing/deleting staff removes cached personal request tokens locally and triggers immediate portal resync; permanent deletion also resyncs known saved-month portals when available so removed staff access is deactivated server-side.
- Current-month staff changes reopen only the affected current roster unless ¶»§q«^