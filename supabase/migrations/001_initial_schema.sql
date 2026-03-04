-- LearnTrellis v1 — Initial Schema
-- All tables, indexes, and RLS policies
-- Run against a Supabase project with auth.users already available

-- =============================================================================
-- PROFILES (extends auth.users)
-- =============================================================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  api_provider text check (api_provider in ('openrouter', 'venice')),
  encrypted_api_key text,                       -- AES-256 encrypted, null for hosted
  subscription_status text not null default 'free'
    check (subscription_status in ('free', 'active', 'canceled')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'User profiles extending Supabase auth. Stores preferences, API keys, and subscription info.';
comment on column public.profiles.encrypted_api_key is 'AES-256-GCM encrypted API key. NEVER expose to client or log.';

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- =============================================================================
-- TOPICS
-- =============================================================================
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null,
  goal text,                                     -- Terminal learning goal
  background text,                               -- What user already knows
  status text not null default 'onboarding'
    check (status in ('onboarding', 'assessing', 'active', 'completed')),
  created_at timestamptz not null default now()
);

comment on table public.topics is 'Learning topics. Each user can have multiple topics.';

create index idx_topics_user_id on public.topics (user_id);

alter table public.topics enable row level security;

create policy "Users can view own topics"
  on public.topics for select
  using (auth.uid() = user_id);

create policy "Users can insert own topics"
  on public.topics for insert
  with check (auth.uid() = user_id);

create policy "Users can update own topics"
  on public.topics for update
  using (auth.uid() = user_id);

create policy "Users can delete own topics"
  on public.topics for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- LEARNER PROFILES (per topic, from onboarding + baseline assessment)
-- =============================================================================
create table public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics on delete cascade,
  dimensions jsonb,                              -- [{name, signal: strong|adequate|weak, evidence}]
  depth text not null default 'standard'
    check (depth in ('quick', 'standard', 'thorough')),
  baseline_scores jsonb,                         -- Per-dimension scores
  created_at timestamptz not null default now()
);

comment on table public.learner_profiles is 'Learner profiles generated from onboarding and baseline assessment per topic.';

create index idx_learner_profiles_topic_id on public.learner_profiles (topic_id);

alter table public.learner_profiles enable row level security;

create policy "Users can view own learner profiles"
  on public.learner_profiles for select
  using (
    exists (
      select 1 from public.topics
      where topics.id = learner_profiles.topic_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can insert own learner profiles"
  on public.learner_profiles for insert
  with check (
    exists (
      select 1 from public.topics
      where topics.id = learner_profiles.topic_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can update own learner profiles"
  on public.learner_profiles for update
  using (
    exists (
      select 1 from public.topics
      where topics.id = learner_profiles.topic_id
        and topics.user_id = auth.uid()
    )
  );

-- =============================================================================
-- MODULES (curriculum structure)
-- =============================================================================
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics on delete cascade,
  title text,
  description text,
  sequence_order int not null default 0,
  bloom_level text
    check (bloom_level in ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')),
  status text not null default 'locked'
    check (status in ('locked', 'active', 'mastery_pending', 'mastered', 'reteach')),
  mastery_score float,
  mastery_confirmed_at timestamptz,              -- For two-pass confirmation
  created_at timestamptz not null default now()
);

comment on table public.modules is 'Curriculum modules within a topic. Ordered by sequence_order, progress through Bloom levels.';

create index idx_modules_topic_id on public.modules (topic_id);
create index idx_modules_topic_sequence on public.modules (topic_id, sequence_order);

alter table public.modules enable row level security;

create policy "Users can view own modules"
  on public.modules for select
  using (
    exists (
      select 1 from public.topics
      where topics.id = modules.topic_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can insert own modules"
  on public.modules for insert
  with check (
    exists (
      select 1 from public.topics
      where topics.id = modules.topic_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can update own modules"
  on public.modules for update
  using (
    exists (
      select 1 from public.topics
      where topics.id = modules.topic_id
        and topics.user_id = auth.uid()
    )
  );

-- =============================================================================
-- LESSONS
-- =============================================================================
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules on delete cascade,
  title text,
  sequence_order int not null default 0,
  content jsonb,                                 -- Full lesson: {objective, material, takeaways, example, practice}
  topic_type text
    check (topic_type in ('language', 'math', 'science', 'humanities', 'creative', 'technical', 'physical')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  difficulty_pulse text
    check (difficulty_pulse in ('easy', 'right', 'hard')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.lessons is 'Individual lessons within modules. Content stored as JSONB following enforced template.';

create index idx_lessons_module_id on public.lessons (module_id);
create index idx_lessons_module_sequence on public.lessons (module_id, sequence_order);

alter table public.lessons enable row level security;

-- Lessons join through modules -> topics to reach user_id
create policy "Users can view own lessons"
  on public.lessons for select
  using (
    exists (
      select 1 from public.modules
      join public.topics on topics.id = modules.topic_id
      where modules.id = lessons.module_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can insert own lessons"
  on public.lessons for insert
  with check (
    exists (
      select 1 from public.modules
      join public.topics on topics.id = modules.topic_id
      where modules.id = lessons.module_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can update own lessons"
  on public.lessons for update
  using (
    exists (
      select 1 from public.modules
      join public.topics on topics.id = modules.topic_id
      where modules.id = lessons.module_id
        and topics.user_id = auth.uid()
    )
  );

-- =============================================================================
-- PRACTICE RESPONSES
-- =============================================================================
create table public.practice_responses (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons on delete cascade,
  question_index int not null,
  question_type text not null
    check (question_type in ('mc', 'open_ended', 'worked_problem')),
  user_answer text not null,
  grade text
    check (grade in ('excellent', 'adequate', 'needs_work', 'correct', 'incorrect')),
  feedback text,
  created_at timestamptz not null default now()
);

comment on table public.practice_responses is 'User responses to practice questions. Graded by AI with feedback.';

create index idx_practice_responses_lesson_id on public.practice_responses (lesson_id);

alter table public.practice_responses enable row level security;

-- Practice responses join through lessons -> modules -> topics
create policy "Users can view own practice responses"
  on public.practice_responses for select
  using (
    exists (
      select 1 from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.topics on topics.id = modules.topic_id
      where lessons.id = practice_responses.lesson_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can insert own practice responses"
  on public.practice_responses for insert
  with check (
    exists (
      select 1 from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.topics on topics.id = modules.topic_id
      where lessons.id = practice_responses.lesson_id
        and topics.user_id = auth.uid()
    )
  );

-- =============================================================================
-- SRS CARDS (spaced repetition per concept)
-- =============================================================================
create table public.srs_cards (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics on delete cascade,
  concept text not null,
  source_lesson_id uuid references public.lessons on delete set null,
  ease_factor float not null default 2.5,
  interval_days int not null default 1,
  repetitions int not null default 0,
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.srs_cards is 'SM-2 spaced repetition cards. One per concept, tracked per topic.';

create index idx_srs_cards_topic_id on public.srs_cards (topic_id);
create index idx_srs_cards_next_review on public.srs_cards (topic_id, next_review_at);

alter table public.srs_cards enable row level security;

create policy "Users can view own SRS cards"
  on public.srs_cards for select
  using (
    exists (
      select 1 from public.topics
      where topics.id = srs_cards.topic_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can insert own SRS cards"
  on public.srs_cards for insert
  with check (
    exists (
      select 1 from public.topics
      where topics.id = srs_cards.topic_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can update own SRS cards"
  on public.srs_cards for update
  using (
    exists (
      select 1 from public.topics
      where topics.id = srs_cards.topic_id
        and topics.user_id = auth.uid()
    )
  );

-- =============================================================================
-- MASTERY TESTS
-- =============================================================================
create table public.mastery_tests (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules on delete cascade,
  pass_number int not null default 1,            -- 1 = first pass, 2 = confirmation
  score float,
  passed boolean,
  area_scores jsonb,                             -- Per-concept breakdown
  is_reteach boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.mastery_tests is 'Mastery test results. Two-pass confirmation with reteach pathway.';

create index idx_mastery_tests_module_id on public.mastery_tests (module_id);

alter table public.mastery_tests enable row level security;

create policy "Users can view own mastery tests"
  on public.mastery_tests for select
  using (
    exists (
      select 1 from public.modules
      join public.topics on topics.id = modules.topic_id
      where modules.id = mastery_tests.module_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can insert own mastery tests"
  on public.mastery_tests for insert
  with check (
    exists (
      select 1 from public.modules
      join public.topics on topics.id = modules.topic_id
      where modules.id = mastery_tests.module_id
        and topics.user_id = auth.uid()
    )
  );

-- =============================================================================
-- FEEDBACK LOG (stored for v2 adaptation, not acted on in v1)
-- =============================================================================
create table public.feedback_log (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics on delete cascade,
  lesson_id uuid references public.lessons on delete set null,
  module_id uuid references public.modules on delete set null,
  type text not null
    check (type in ('difficulty_pulse', 'mastery_feedback', 'general')),
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.feedback_log is 'Feedback entries stored for v2 adaptive engine. Not actively used in v1.';

create index idx_feedback_log_topic_id on public.feedback_log (topic_id);
create index idx_feedback_log_lesson_id on public.feedback_log (lesson_id);

alter table public.feedback_log enable row level security;

create policy "Users can view own feedback"
  on public.feedback_log for select
  using (
    exists (
      select 1 from public.topics
      where topics.id = feedback_log.topic_id
        and topics.user_id = auth.uid()
    )
  );

create policy "Users can insert own feedback"
  on public.feedback_log for insert
  with check (
    exists (
      select 1 from public.topics
      where topics.id = feedback_log.topic_id
        and topics.user_id = auth.uid()
    )
  );

-- =============================================================================
-- PROFILE CREATION TRIGGER
-- Auto-create a profile row when a new user signs up via Supabase Auth
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

comment on function public.handle_new_user is 'Trigger: creates a profiles row automatically when a new auth user is created.';
