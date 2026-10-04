# Unreleased

- **Day-off / preference and leave requests** on the request page (public and personal links). They are stored by new Supabase functions: run `supabase/migrations/20261004_icu_roster_extra_requests.sql` once in the Supabase SQL editor. Until then those two tabs show "not enabled yet". Approving a request re-optimizes the roster (with a preview) before applying it.
- Added **R3** as a staff level (senior resident: eligible for all units, grouped with ICU Residents).
- Units now have an optional **maximum** per weekday/weekend next to the minimum (required) count. Required coverage is solved first; extra staff are then added up to the maximum using spare capacity, in full continuity blocks. Over-maximum coverage is flagged by the audit.
- **Month-boundary continuity:** staff who finish the previous month on a unit keep it into the first days of the new month until their block reaches the minimum unit block (rule can be turned off). If the locks make the roster infeasible, generation retries without them and says so.
- **Export Excel**: roster grid, coverage, units (min/max) and workload as a .xlsx workbook, generated in the browser with no external library.
- **Public request links** (requests/leave and swaps): one link for the whole team where each person picks their own name. Requests stay pending until approved. Note that a public link embeds every active staff member's token, so anyone holding it can submit as any staff member; use *Regenerate Personal Links* to cancel all links.
- Security: CSP and other headers, credentials in the URL fragment (scrubbed after load), optional `ALLOWED_ORIGINS` for the solver function.

# v10.8.2 — Safe Staff Lifecycle / Month Isolation

- Added explicit per-month staff membership; legacy `null` membership is migrated once to a concrete staff-ID list.
- Added **Remove from Month** and **Activate This Month** without deleting historical roster records.
- Kept **Delete Permanently** as a separate destructive action with stronger warnings and one unified purge path for single/multi-delete.
- Manual Add Staff now preselects level-appropriate eligibility and warns before saving zero-eligibility staff.
- Added case-insensitive duplicate-name protection to manual add/edit and Staff Sheet Editor.
- Made weekend capacity eligibility-aware so unschedulable active records do not falsely increase capacity.
- Filtered solver leave/request/free-day inputs to active staff only.
- Removed current/saved portal-token cache entries during permanent deletion and immediately resync the current portal after add/activate/remove.
- Permanent deletion attempts to resync every known saved-month portal so removed staff links are deactivated remotely.
- Added staff lifecycle regressions; suite now covers 17 staff/solver safety behaviors.

# v10.8.1 — Audit Repair / Exact Solver Primary

- Rebased fixes onto the true v10.8 Manual Weekend Gaps package.
- Promoted the deployed Supabase `icu-roster-solve` v5 exact optimizer to the primary Auto-Generate / Re-optimize engine.
- Kept the v10.8 browser worker as a bounded fallback for transient server/network failure.
- Normalized server `intentionalOpen` weekend gaps into the existing v10.8 `plannedOpen` workflow.
- Added hard ≥3-calendar-day on-call spacing in the browser audit, browser fallback and exact server solver.
- Added hard rule validation for `minimum unit continuity <= maximum consecutive work`.
- Prevented inactive/stale staff assignments from counting toward mandatory coverage; unknown staff/shift assignment references are hard violations.
- Hardened backup restore validation against malformed/stale assignment and snapshot references.
- Corrected weekend-limit UI wording to make clear that the cap applies to all active staff, not only R1/R2 residents.
- The exact solver may leave only the minimum unavoidable **weekend on-call** gaps for manual assignment; all other mandatory gaps remain fatal.

# v10.8 — Generate With Manual Weekend Gaps

- Auto-Generate no longer aborts when the strict all-staff weekend cap is mathematically short.
- The scheduler keeps the hard 2-weekend / 3-weekend automatic cap intact.
- It leaves the minimum number of weekend **on-call** slots open for manual assignment instead of automatically giving anyone an extra weekend.
- Open manual slots are concentrated into the latest weekend(s) when possible and spread across the weekend dates.
- Locked weekend on-call cells are never selected as intentional gaps.
- The generated partial roster is accepted only when every other open slot is absent and there are zero hard-rule violations.
- Partial rosters stay Draft, ER/CCRT overflow is skipped, and publishing remains blocked until manual completion.
- Coverage & Safety now describes weekend-cap shortage as a manual-completion warning rather than a pre-generation fatal error.

# v10.7 — Staff Eligibility Select All

- Added a **Select all** checkbox beside **Eligible Unit / Shift Codes** in the Add/Edit Staff form.
- Selecting it checks every unit/shift code at once; clearing it unchecks all.
- The master checkbox shows an indeterminate state when only some eligibility codes are selected.

# v10.6 — Fast Auto-Generate reliability fix

## Main fix
- Replaced the generic browser mixed-integer solver used by Auto-Generate with a purpose-built ICU roster constraint scheduler.
- The new scheduler has no CDN solver dependency and does not send whole-month generation to the Supabase Edge solver.
- It is bounded to about 8.5 seconds internally, with a 12-second UI ceiling, so Auto-Generate cannot sit for several minutes cycling through fallbacks.
- The current roster is still never changed until a complete candidate passes the local coverage + hard-rule audit.

## How the fast scheduler works
- Builds weekend-safe 3–6 day daytime blocks.
- Balances monthly shift credits and on-call counts under staff-specific caps.
- Honors approved leave, staff eligibility, locked mandatory cells, post-call protection, maximum consecutive workdays, all-staff weekend-package limits, and approved hard flexible-day requests.
- Fills the exact mandatory daytime headcount for every date.
- Builds the full night/on-call distribution and matches staff to MT / GR / KA by eligibility.
- Assigns actual daytime units by interval with PRU duplicate coverage preserved.
- The browser runs the final existing safety audit before accepting any result.

## Performance regression test
Using the bundled September 2026 sample configuration:
- 390 / 390 mandatory slots covered.
- 0 hard-rule violations in the independent validation script.
- Typical local validation time on this build environment: about 0.2–0.4 seconds for the bundled September 2026 sample.
- A locked 4-day daytime block and an approved hard flexible-day request were also regression-tested successfully.
- No multi-minute exact-solver → heuristic → server fallback chain remains.

## Previous v10.2/v10.3 features retained
- 3–4 day manual unit block assignment (day units only; never on-call).
- Weekend-safe auto-adjustment for manual blocks.
- Personal staff request links, flexible-day requests, swap requests, approval preview, secure request tokens, portal expiration/revocation.
- Clear All Shifts with confirmation.
- Staff sheet editor, multi-delete, quick paste, shift counter, TRA/leave calculator, new-month wizard, Fix This Day, workload traffic lights, Auto-Balance, backups and print/PDF.
