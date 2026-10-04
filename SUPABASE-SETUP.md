# Supabase setup notes â€” ICU Roster Planner v10.8.2

This frontend is wired to the existing Supabase project. Two backend areas are used:

1. **Exact roster solver** â€” Edge Function `icu-roster-solve`, deployed as **v5**, JWT verification enabled. v5 enforces all-staff weekend caps, post-call protection, minimum 3-calendar-day on-call spacing, leave/eligibility/credit limits, locked cells, and permits only unavoidable weekend on-call gaps as intentional manual gaps.
2. **Optional staff request portal** â€” `icu_roster_portals`, `icu_roster_staff_requests`, `icu_roster_staff_access`, plus token-validating RPCs for staff links, swaps, flexible-day requests and coordinator review.

The direct request-portal tables use Row Level Security. Public browser operations go through token-validating RPCs rather than direct table writes.

A source copy of the deployed solver is packaged at `supabase/functions/icu-roster-solve/index.ts`. If deploying against a different Supabase project, deploy that function with JWT verification enabled and migrate the request-portal tables/RPCs before enabling staff links.


## Staff lifecycle portal behavior

No new table or RPC is required for v10.8.2 staff lifecycle changes. The existing `icu_roster_sync_portal` RPC treats the submitted active staff list as authoritative and marks staff-access rows absent from that list as inactive. The frontend removes cached tokens for staff removed from a month and syncs the portal immediately; permanent deleti¶»§q«^