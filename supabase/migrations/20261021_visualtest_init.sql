-- VISUALTEST-GH (מרחב). Applied to Supabase project cultura-GH as migration "visualtest_init".
-- Tables are closed to direct access (RLS on, no policies). Access only via visual_push / visual_pull,
-- scoped by a secret sync key (>= 24 chars) held in the browser.
create table public.visual_questions (
  owner_key text not null, id text not null, test_type text not null, level smallint not null,
  dim text not null check (dim in ('2D','3D')), motion text not null check (motion in ('static','dynamic')),
  params jsonb not null, correct_answer smallint not null, explanation text not null,
  created_at timestamptz not null default now(), primary key (owner_key, id)
);
create table public.visual_attempts (
  owner_key text not null, id text not null, session_id text not null, question_id text not null,
  answer smallint, time_ms integer not null, correct boolean not null,
  error_type text check (error_type in ('encoding','transformation','wrong_rule','timeout')),
  created_at timestamptz not null, primary key (owner_key, id)
);
create table public.visual_sessions (
  owner_key text not null, id text not null, started_at timestamptz not null,
  mode text not null check (mode in ('explain','practice','exam','simulation')),
  types text[] not null, level smallint, item_count integer not null,
  accuracy numeric not null, throughput numeric not null, data jsonb not null default '{}'::jsonb,
  primary key (owner_key, id)
);
create table public.visual_mastery (
  owner_key text not null, test_type text not null, level smallint not null,
  status text not null check (status in ('locked','open','passed')),
  streak smallint not null default 0, last_date timestamptz, primary key (owner_key, test_type, level)
);
alter table public.visual_questions enable row level security;
alter table public.visual_attempts enable row level security;
alter table public.visual_sessions enable row level security;
alter table public.visual_mastery enable row level security;

create or replace function public.visual_push(p_key text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or length(p_key) < 24 then raise exception 'invalid key'; end if;
  insert into visual_questions (owner_key,id,test_type,level,dim,motion,params,correct_answer,explanation)
  select p_key, q->>'id', q->>'test_type', (q->>'level')::smallint, q->>'dim', q->>'motion', q->'params',
         (q->>'correct_answer')::smallint, q->>'explanation'
  from jsonb_array_elements(coalesce(p_payload->'questions','[]'::jsonb)) q
  on conflict (owner_key,id) do nothing;
  insert into visual_attempts (owner_key,id,session_id,question_id,answer,time_ms,correct,error_type,created_at)
  select p_key, a->>'id', a->>'session_id', a->>'question_id', (a->>'answer')::smallint, (a->>'time_ms')::int,
         (a->>'correct')::boolean, a->>'error_type', (a->>'created_at')::timestamptz
  from jsonb_array_elements(coalesce(p_payload->'attempts','[]'::jsonb)) a
  on conflict (owner_key,id) do nothing;
  insert into visual_sessions (owner_key,id,started_at,mode,types,level,item_count,accuracy,throughput,data)
  select p_key, s->>'id', (s->>'started_at')::timestamptz, s->>'mode',
         array(select jsonb_array_elements_text(s->'types')), (s->>'level')::smallint,
         (s->>'item_count')::int, (s->>'accuracy')::numeric, (s->>'throughput')::numeric, coalesce(s->'data','{}'::jsonb)
  from jsonb_array_elements(coalesce(p_payload->'sessions','[]'::jsonb)) s
  on conflict (owner_key,id) do nothing;
  insert into visual_mastery (owner_key,test_type,level,status,streak,last_date)
  select p_key, m->>'test_type', (m->>'level')::smallint, m->>'status', (m->>'streak')::smallint, (m->>'last_date')::timestamptz
  from jsonb_array_elements(coalesce(p_payload->'mastery','[]'::jsonb)) m
  on conflict (owner_key,test_type,level) do update
    set status = excluded.status, streak = excluded.streak, last_date = excluded.last_date
    where visual_mastery.last_date is null or excluded.last_date >= visual_mastery.last_date;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.visual_pull(p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or length(p_key) < 24 then raise exception 'invalid key'; end if;
  return jsonb_build_object(
    'questions', coalesce((select jsonb_agg(to_jsonb(q) - 'owner_key') from visual_questions q where owner_key = p_key), '[]'::jsonb),
    'attempts',  coalesce((select jsonb_agg(to_jsonb(a) - 'owner_key') from visual_attempts a where owner_key = p_key), '[]'::jsonb),
    'sessions',  coalesce((select jsonb_agg(to_jsonb(s) - 'owner_key') from visual_sessions s where owner_key = p_key), '[]'::jsonb),
    'mastery',   coalesce((select jsonb_agg(to_jsonb(m) - 'owner_key') from visual_mastery m where owner_key = p_key), '[]'::jsonb)
  );
end $$;

revoke all on function public.visual_push(text, jsonb) from public;
revoke all on function public.visual_pull(text) from public;
grant execute on function public.visual_push(text, jsonb) to anon, authenticated;
grant execute on function public.visual_pull(text) to anon, authenticated;
