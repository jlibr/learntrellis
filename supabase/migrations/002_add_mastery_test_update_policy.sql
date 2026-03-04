-- Fix: Add missing UPDATE policy on mastery_tests table.
-- Without this, evaluateMasteryTest() cannot update score/passed/area_scores
-- because RLS blocks the UPDATE operation.

create policy "Users can update own mastery tests"
  on public.mastery_tests for update
  using (
    exists (
      select 1 from public.modules
      join public.topics on topics.id = modules.topic_id
      where modules.id = mastery_tests.module_id
        and topics.user_id = auth.uid()
    )
  );
