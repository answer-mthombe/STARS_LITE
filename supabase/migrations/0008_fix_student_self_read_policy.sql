-- Fix student self-read policy so authenticated students can read their own record
-- using either linked_student_id or linked_person_id from user_profiles.

create policy "Students can read their own record via linked student or person id"
  on public.students for select to authenticated
  using (
    id IN (
      select linked_student_id
      from public.user_profiles
      where id = auth.uid()
    )
    OR id IN (
      select linked_person_id
      from public.user_profiles
      where id = auth.uid()
    )
  );
