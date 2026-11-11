-- Paper-trading state for the Wick worker. One row each. No user accounts.
-- The worker is the only writer of balances. The website reads the snapshot.

create table if not exists wick_state (
  id smallint primary key default 1,
  body jsonb not null,
  updated_at timestamptz not null default now(),
  constraint wick_state_one check (id = 1)
);

create table if not exists wick_snapshot (
  id smallint primary key default 1,
  body jsonb not null,
  updated_at timestamptz not null default now(),
  constraint wick_snapshot_one check (id = 1)
);

create table if not exists wick_leader (
  id smallint primary key default 1,
  holder text not null,
  started_at timestamptz not null,
  beat_at timestamptz not null,
  expires_at timestamptz not null,
  last_success_at timestamptz,
  status text not null,
  error text,
  feed_age_ms integer,
  price_live boolean not null default false,
  clob_live boolean not null default false,
  reconnects integer not null default 0,
  constraint wick_leader_one check (id = 1)
);

create table if not exists wick_commands (
  id bigserial primary key,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists wick_commands_id_idx on wick_commands (id);
