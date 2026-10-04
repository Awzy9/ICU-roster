-- ICU Roster Planner: extra staff request types for the request pages (public + personal links)
--   * day_request : off / prefer / avoid a unit on one date
--   * leave       : leave from a date to a date
--
-- Run this ONCE in the Supabase SQL editor (project jjoyrvyjwozrxefagjhx). It is additive: it creates one new
-- table and three new functions, and does not touch icu_roster_portals / icu_roster_staff_requests /
-- icu_roster_staff_access or any existing function.
--
-- Security model
--   * The table has Row Level Security enabled and NO policies, so the browser (anon key) cannot read or write
--     it directly. Only the SECURITY DEFINER functions below can.
--   * Staff submissions are authorised by calling the existing icu_roster_staff_portal(portal, staff, token),
--     which already raises when the portal, staff member or token is invalid/expired.
--   * Coordinator list/approve calls are authorised by calling the existing
--     icu_roster_list_requests(portal, admin_token), which already raises on a bad admin token.
--   * Input is validated and each staff member is limited to 20 pending extra requests (spam guard).
--
-- Assumption: icu_roster_staff_portal() returns json/jsonb containing "staff_name" (the request page already
-- reads portal.staff_name from it). If it returns something else, only staff_name below needs adjusting.

create table if not exists public.icu_roster_extra_requests (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid        not null,
  staff_id    text        not null,
  staff_name  text        not null default '',
  kind        text        not null check (kind in ('day_request', 'leave')),
  payload     jsonb       not null default '{}'::jsonb,
  status      text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note  text        not null default '',
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

create index if not exists icu_roster_extra_requests_portal_idx
  on public.icu_roster_extra_requests (portal_id, status, created_at desc);

alter table public.icu_roster_extra_requests enable row level security;
revoke all on table public.icu_roster_extra_requests from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Staff: submit a day-off/preference or leave request
-- ---------------------------------------------------------------------------------------------
create or replace function public.icu_roster_submit_extra_request(
  p_portal_id   uuid,
  p_staff_id    text,
  p_staff_token text,
  p_kind        text,
  p_payload     jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_info    jsonb;
  v_name    text;
  v_pending integer;
  v_id      uuid;
  v_type    text;
  v_date    text := '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
  v_from    date;
  v_to      date;
begin
  -- Raises if the portal/staff/token is invalid or the link has expired.
  v_info := (public.icu_roster_staff_portal(p_portal_id, p_staff_id, p_staff_token))::jsonb;
  v_name := coalesce(v_info ->> 'staff_name', '');

  if coalesce(p_kind, '') not in ('day_request', 'leave') then
    raise exception 'Unsupported request type';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or pg_column_size(p_payload) > 2000 then
    raise exception 'Invalid request';
  end if;

  select count(*) into v_pending
    from public.icu_roster_extra_requests
   where portal_id = p_portal_id and staff_id = p_staff_id and status = 'pending';
  if v_pending >= 20 then
    raise exception 'You already have 20 pending requests. Wait for the coordinator to review them.';
  end if;

  if p_kind = 'day_request' then
    v_type := p_payload ->> 'type';
    if coalesce(v_type, '') not in ('off', 'prefer', 'avoid') then
      raise exception 'Choose day off, prefer a unit, or avoid a unit';
    end if;
    if coalesce(p_payload ->> 'date', '') !~ v_date then
      raise exception 'Choose a valid date';
    end if;
    if v_type in ('prefer', 'avoid') and coalesce(length(p_payload ->> 'shift'), 0) not between 1 and 40 then
      raise exception 'Choose the unit';
    end if;
    p_payload := jsonb_build_object(
      'type', v_type,
      'date', p_payload ->> 'date',
      'shift', case when v_type = 'off' then '' else p_payload ->> 'shift' end,
      'note', left(coalesce(p_payload ->> 'note', ''), 120)
    );
  else
    if coalesce(p_payload ->> 'from', '') !~ v_date or coalesce(p_payload ->> 'to', '') !~ v_date then
      raise exception 'Choose valid leave dates';
    end if;
    v_from := (p_payload ->> 'from')::date;
    v_to   := (p_payload ->> 'to')::date;
    if v_to < v_from then
      raise exception 'The leave end date is before the start date';
    end if;
    if v_to - v_from > 90 then
      raise exception 'Leave requests are limited to 91 days; split longer leave';
    end if;
    p_payload := jsonb_build_object(
      'from', p_payload ->> 'from',
      'to', p_payload ->> 'to',
      'note', left(coalesce(p_payload ->> 'note', ''), 120)
    );
  end if;

  insert into public.icu_roster_extra_requests (portal_id, staff_id, staff_name, kind, payload)
  values (p_portal_id, p_staff_id, v_name, p_kind, p_payload)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Coordinator: list extra requests for a portal
-- ---------------------------------------------------------------------------------------------
create or replace function public.icu_roster_list_extra_requests(
  p_portal_id   uuid,
  p_admin_token text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Raises if the admin token is invalid.
  perform public.icu_roster_list_requests(p_portal_id, p_admin_token);

  return jsonb_build_object('requests', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id,
             'staff_id', r.staff_id,
             'staff_name', r.staff_name,
             'request_type', r.kind,
             'payload', r.payload,
             'status', r.status,
             'admin_note', r.admin_note,
             'created_at', r.created_at
           ) order by r.created_at desc)
      from public.icu_roster_extra_requests r
     where r.portal_id = p_portal_id
  ), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Coordinator: approve / reject an extra request
-- ---------------------------------------------------------------------------------------------
create or replace function public.icu_roster_set_extra_request_status(
  p_portal_id   uuid,
  p_admin_token text,
  p_request_id  uuid,
  p_status      text,
  p_admin_note  text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  perform public.icu_roster_list_requests(p_portal_id, p_admin_token);

  if coalesce(p_status, '') not in ('approved', 'rejected') then
    raise exception 'Invalid status';
  end if;

  update public.icu_roster_extra_requests
     set status = p_status,
         admin_note = left(coalesce(p_admin_note, ''), 300),
         decided_at = now()
   where id = p_request_id and portal_id = p_portal_id;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Request not found';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.icu_roster_submit_extra_request(uuid, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.icu_roster_list_extra_requests(uuid, text) to anon, authenticated;
grant execute on function public.icu_roster_set_extra_request_status(uuid, text, uuid, text, text) to anon, authenticated;
