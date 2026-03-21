create extension if not exists vector
with
  schema extensions;

create table if not exists public.lexora_users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz,
  reset_token_hash text,
  reset_token_expires_at timestamptz
);

create index if not exists lexora_users_email_idx
  on public.lexora_users (email);

create table if not exists public.lexora_documents (
  id text primary key,
  user_id text not null,
  name text not null,
  file_name text not null,
  file_url text not null,
  size_bytes bigint not null,
  page_count integer not null,
  chunk_count integer not null,
  indexed_at timestamptz not null,
  embedding_model text not null,
  extraction_mode text,
  notes text,
  bookmarked_pages jsonb not null default '[]'::jsonb,
  last_opened_at timestamptz
);

create index if not exists lexora_documents_user_idx
  on public.lexora_documents (user_id, indexed_at desc);

create table if not exists public.lexora_conversations (
  id text primary key,
  user_id text not null,
  document_id text not null,
  title text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  pinned boolean not null default false
);

create index if not exists lexora_conversations_user_scope_idx
  on public.lexora_conversations (user_id, document_id, pinned desc, updated_at desc);

create table if not exists public.lexora_messages (
  id text primary key,
  conversation_id text not null references public.lexora_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  created_at timestamptz not null,
  sources jsonb
);

create index if not exists lexora_messages_conversation_idx
  on public.lexora_messages (conversation_id, created_at asc);

create table if not exists public.lexora_document_chunks (
  id text primary key,
  user_id text not null,
  document_id text not null,
  embedding_model text not null,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(768) not null,
  start_offset integer not null,
  end_offset integer not null,
  page_start integer not null,
  page_end integer not null,
  source text not null,
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists lexora_document_chunks_document_idx
  on public.lexora_document_chunks (user_id, document_id, chunk_index);

create index if not exists lexora_document_chunks_model_idx
  on public.lexora_document_chunks (user_id, embedding_model);

create or replace function public.match_lexora_document_chunks(
  query_embedding text,
  filter_user_id text,
  match_count integer default 4,
  filter_document_id text default null,
  filter_document_ids text[] default null,
  filter_embedding_model text default null
)
returns table (
  id text,
  document_id text,
  embedding_model text,
  chunk_index integer,
  content text,
  start_offset integer,
  end_offset integer,
  page_start integer,
  page_end integer,
  source text,
  file_url text,
  score double precision
)
language sql
stable
as $$
  select
    chunk.id,
    chunk.document_id,
    chunk.embedding_model,
    chunk.chunk_index,
    chunk.content,
    chunk.start_offset,
    chunk.end_offset,
    chunk.page_start,
    chunk.page_end,
    chunk.source,
    chunk.file_url,
    1 - (chunk.embedding <=> query_embedding::extensions.vector) as score
  from public.lexora_document_chunks as chunk
  where chunk.user_id = filter_user_id
    and (filter_document_id is null or chunk.document_id = filter_document_id)
    and (filter_document_ids is null or chunk.document_id = any(filter_document_ids))
    and (filter_embedding_model is null or chunk.embedding_model = filter_embedding_model)
  order by chunk.embedding <=> query_embedding::extensions.vector
  limit greatest(match_count, 1);
$$;
