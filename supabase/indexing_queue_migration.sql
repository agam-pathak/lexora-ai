create table if not exists public.lexora_indexing_jobs (
  id text primary key,
  user_id text not null,
  name text not null,
  file_name text not null,
  file_url text not null,
  size_bytes bigint not null check (size_bytes > 0),
  status text not null check (status in ('queued', 'processing', 'ready', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  parsed_pdf jsonb,
  error text,
  document_id text,
  available_at timestamptz not null default timezone('utc', now()),
  lease_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists lexora_indexing_jobs_claim_idx
  on public.lexora_indexing_jobs (status, available_at, created_at);

create index if not exists lexora_indexing_jobs_user_idx
  on public.lexora_indexing_jobs (user_id, created_at desc);

alter table public.lexora_indexing_jobs enable row level security;

create or replace function public.claim_lexora_indexing_job(
  lease_seconds integer default 300,
  max_attempts integer default 3
)
returns setof public.lexora_indexing_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lexora_indexing_jobs
  set status = 'failed',
      error = coalesce(error, 'The indexing worker stopped before this job completed.'),
      updated_at = timezone('utc', now()),
      lease_expires_at = null
  where status = 'processing'
    and attempt_count >= greatest(max_attempts, 1)
    and lease_expires_at < timezone('utc', now());

  return query
  with candidate as (
    select job.id
    from public.lexora_indexing_jobs as job
    where job.attempt_count < greatest(max_attempts, 1)
      and (
        (job.status = 'queued' and job.available_at <= timezone('utc', now()))
        or
        (job.status = 'processing' and job.lease_expires_at < timezone('utc', now()))
      )
    order by job.created_at asc
    for update skip locked
    limit 1
  ),
  claimed as (
    update public.lexora_indexing_jobs as job
    set status = 'processing',
        attempt_count = job.attempt_count + 1,
        updated_at = timezone('utc', now()),
        lease_expires_at = timezone(
          'utc',
          now() + make_interval(secs => greatest(lease_seconds, 30))
        )
    from candidate
    where job.id = candidate.id
    returning job.*
  )
  select * from claimed;
end;
$$;

revoke all on public.lexora_indexing_jobs from anon, authenticated;
grant all on public.lexora_indexing_jobs to service_role;
revoke execute on function public.claim_lexora_indexing_job(integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_lexora_indexing_job(integer, integer)
  to service_role;
