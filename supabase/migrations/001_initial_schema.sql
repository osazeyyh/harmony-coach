-- Harmony Coach: Initial Database Schema

-- User profiles (extends Supabase Auth users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  role text check (role in ('student', 'teacher')) default 'student',
  created_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Songs uploaded/analyzed by users
create table songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  source_type text check (source_type in ('audio', 'sheet', 'midi', 'musicxml')) not null,
  file_url text,
  key text,
  tempo integer,
  time_signature text,
  analysis_data jsonb,
  musicxml_data text,
  created_at timestamptz default now()
);

-- Practice sessions
create table practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  song_id uuid references songs(id) on delete cascade not null,
  part text check (part in ('melody', 'harmony1', 'harmony2', 'harmony3')),
  pitch_accuracy float,
  rhythm_accuracy float,
  completion float,
  duration_seconds integer,
  feedback_data jsonb,
  recorded_audio_url text,
  created_at timestamptz default now()
);

-- Harmony line suggestions (cached per song)
create table harmony_lines (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references songs(id) on delete cascade not null,
  part_name text not null,
  notes_data jsonb not null,
  voice_type text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table songs enable row level security;
alter table practice_sessions enable row level security;
alter table harmony_lines enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Songs: users can CRUD their own songs
create policy "Users can view own songs" on songs
  for select using (auth.uid() = user_id);
create policy "Users can insert own songs" on songs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own songs" on songs
  for update using (auth.uid() = user_id);
create policy "Users can delete own songs" on songs
  for delete using (auth.uid() = user_id);

-- Practice sessions: users can CRUD their own sessions
create policy "Users can view own sessions" on practice_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on practice_sessions
  for insert with check (auth.uid() = user_id);

-- Harmony lines: readable if user owns the song
create policy "Users can view harmony lines for own songs" on harmony_lines
  for select using (
    exists (select 1 from songs where songs.id = harmony_lines.song_id and songs.user_id = auth.uid())
  );
create policy "Users can insert harmony lines for own songs" on harmony_lines
  for insert with check (
    exists (select 1 from songs where songs.id = harmony_lines.song_id and songs.user_id = auth.uid())
  );

-- Indexes
create index idx_songs_user_id on songs(user_id);
create index idx_practice_sessions_user_id on practice_sessions(user_id);
create index idx_practice_sessions_song_id on practice_sessions(song_id);
create index idx_harmony_lines_song_id on harmony_lines(song_id);
