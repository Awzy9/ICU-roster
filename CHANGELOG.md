# v10.8.2 â€” Safe Staff Lifecycle / Month Isolation

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

# v10.8.1 â€” Audit Repair / Exact Solver Primary

- Rebased fixes onto the true v10.8 Manual Weekend Gaps package.
- Promoted the deployed Supabase `icu-roster-solve` v5 exact optimizer to the primary Auto-Generate / Re-optimize engine.
- Kept the v10.8 browser worker as a bounded fallback for transient server/network failure.
- Normalized server `¶»§q«^