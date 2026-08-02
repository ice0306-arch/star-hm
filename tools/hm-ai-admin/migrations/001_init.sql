pragma foreign_keys = on;

create table if not exists schema_migrations (
  version text primary key,
  applied_at text not null default (datetime('now'))
);

insert or ignore into schema_migrations(version) values ('001_init');

create table if not exists replay_sources (
  id text primary key,
  source_type text not null,
  source_grade text not null default 'unknown',
  source_url text,
  page_url text,
  collected_at text not null default (datetime('now')),
  status text not null default 'candidate',
  notes text
);

create table if not exists replays (
  id text primary key,
  sha256 text not null unique,
  fuzzy_fingerprint text,
  file_name text not null,
  file_path text not null,
  file_size integer not null,
  map_name text,
  map_hash text,
  duration_seconds integer,
  game_type text,
  game_version text,
  status text not null default 'candidate',
  source_id text references replay_sources(id),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists replay_players (
  id text primary key,
  replay_id text not null references replays(id) on delete cascade,
  player_slot text,
  player_name text not null,
  normalized_id text not null,
  race text,
  team integer,
  result text,
  verified_pro_player_id text,
  learning_scope text not null default 'analysis_only',
  status text not null default 'candidate'
);

create table if not exists replay_facts (
  id text primary key,
  replay_id text not null references replays(id) on delete cascade,
  player_id text,
  frame integer,
  time_ms integer,
  category text not null,
  description text not null,
  source text not null,
  visibility text not null,
  confidence real not null,
  x integer,
  y integer,
  data_json text
);

create table if not exists replay_events (
  id text primary key,
  replay_id text not null references replays(id) on delete cascade,
  player_id text,
  event_type text not null,
  start_time_ms integer,
  end_time_ms integer,
  x integer,
  y integer,
  evidence_json text,
  confidence real not null default 0
);

create table if not exists replay_analysis (
  id text primary key,
  replay_id text not null references replays(id) on delete cascade,
  analyzer_version text not null,
  status text not null default 'needs_review',
  analysis_json text not null,
  created_at text not null default (datetime('now'))
);

create table if not exists download_jobs (
  id text primary key,
  source_url text not null,
  source_id text references replay_sources(id),
  status text not null default 'candidate',
  attempts integer not null default 0,
  error text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists pro_players (
  id text primary key,
  real_name text not null,
  race text not null,
  active_periods_json text not null default '[]',
  teams_json text not null default '[]',
  status text not null default 'candidate',
  verified_by text,
  verified_at text,
  notes text
);

create table if not exists pro_player_aliases (
  id text primary key,
  player_id text not null references pro_players(id) on delete cascade,
  battle_net_id text not null,
  normalized_id text not null,
  valid_from text,
  valid_to text,
  source_url text,
  status text not null default 'candidate',
  unique(player_id, normalized_id)
);

create table if not exists events (
  id text primary key,
  name text not null,
  source_url text,
  source_grade text not null default 'unknown',
  status text not null default 'candidate'
);

create table if not exists seasons (
  id text primary key,
  event_id text references events(id) on delete cascade,
  name text not null,
  year integer,
  status text not null default 'candidate'
);

create table if not exists maps (
  id text primary key,
  name text not null,
  map_hash text,
  version text,
  width integer,
  height integer,
  status text not null default 'candidate'
);

create table if not exists builds (
  id text primary key,
  matchup text not null,
  race text not null,
  name text not null,
  tags_json text not null default '[]',
  status text not null default 'candidate'
);

create table if not exists knowledge_sources (
  id text primary key,
  title text not null,
  source_type text not null,
  source_url text,
  author text,
  status text not null default 'draft',
  created_at text not null default (datetime('now'))
);

create table if not exists knowledge_items (
  id text primary key,
  source_id text references knowledge_sources(id),
  title text not null,
  matchup_json text not null default '[]',
  maps_json text not null default '[]',
  builds_json text not null default '[]',
  phases_json text not null default '[]',
  categories_json text not null default '[]',
  trigger_conditions_json text not null default '[]',
  recommendation text not null,
  exceptions_json text not null default '[]',
  status text not null default 'draft',
  confidence real not null default 0,
  version integer not null default 1
);

create table if not exists knowledge_reviews (
  id text primary key,
  knowledge_id text not null references knowledge_items(id) on delete cascade,
  reviewer text,
  status text not null,
  comment text,
  reviewed_at text not null default (datetime('now'))
);

create table if not exists coach_findings (
  id text primary key,
  replay_id text not null references replays(id) on delete cascade,
  player_id text,
  category text not null,
  severity text not null,
  start_time_ms integer,
  end_time_ms integer,
  evidence_ids_json text not null default '[]',
  knowledge_ids_json text not null default '[]',
  finding_json text not null,
  review_status text not null default 'unreviewed'
);

create table if not exists coach_corrections (
  id text primary key,
  finding_id text not null references coach_findings(id) on delete cascade,
  corrected_json text not null,
  reviewer text,
  status text not null default 'corrected',
  created_at text not null default (datetime('now'))
);

create table if not exists corpus_statistics (
  id text primary key,
  version text not null,
  matchup text,
  map_id text,
  build_id text,
  sample_count integer not null default 0,
  stats_json text not null,
  confidence text not null default 'low',
  status text not null default 'candidate'
);

create table if not exists training_versions (
  id text primary key,
  version text not null unique,
  previous_version text,
  status text not null default 'candidate',
  summary_json text not null default '{}',
  approved_by text,
  approved_at text,
  created_at text not null default (datetime('now'))
);

create table if not exists training_samples (
  id text primary key,
  training_version_id text references training_versions(id),
  replay_id text not null references replays(id),
  player_id text not null,
  sample_json text not null,
  status text not null default 'candidate'
);

create table if not exists export_versions (
  id text primary key,
  version text not null unique,
  manifest_json text not null,
  checksum text not null,
  status text not null default 'candidate',
  created_at text not null default (datetime('now'))
);

create table if not exists backups (
  id text primary key,
  file_path text not null,
  pinned integer not null default 0,
  created_at text not null default (datetime('now'))
);

create table if not exists error_logs (
  id text primary key,
  scope text not null,
  message text not null,
  detail_json text,
  created_at text not null default (datetime('now'))
);
