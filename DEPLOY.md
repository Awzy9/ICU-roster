# Deploying ICU Roster Planner v10.8.2

This package is a static frontend with **no build step**.

## Vercel
1. Extract the ZIP.
2. Deploy the folder containing `index.html` as the project root.
3. Framework preset: **Other**.
4. Leave Build Command and Output Directory empty.

Deploy these files together: `index.html`, `app.js`, `styles.css`, `roster-solver-worker.js`, `request.html`, `kamc-acrm-logo.jpg`, `vercel.json`.

## Solver dependency
Auto-Generate / Re-optimize use the connected Supabase Edge Function `icu-roster-solve` **v5** as the primary exact solver. The local `roster-solver-worker.js` remains a bounded fallback if the exact endpoint cannot be reached. The browser always performs an independent final safety audit before accepting a generated roster.

The connected Supabase project already has v5 deployed. A copy of the deployed source is included under `supabase/functions/icu-roster-solve/index.ts` for source control / disaster recovery.

## After deployment
Hard-refresh the browser so older cached JavaScript/worker code is not reused. Existing browser-stored rosters remain intact. Run **Audit Roster** before publishing any carried-forward month.

Expected v10.8.2 behavior: all active staff obey the weekend cap; on-calls are at least 3 calendar days apart; weekday coverage remains mandatory; if the weekend cap is mathematically short, only the minimum weekend on-call slots are intentionally left open for manual completion and Publish remains blocked until filled.


## Staff lifecycle

Staff added later must not appear in old months. Use **Remove from Month** for normal rotation changes; it preserves historical rosters. **Delete Permanently** is intentionally destructive across all saved months. After staff membership changes, an existing personal-request portal is resynced immediately so absent staff are deactivated by `icu_roster_sync_portal`.
