-- Allow the pipeline to delete the orphaned student record during a rollback
create policy "Allow students to delete own record during rollback"
  on public.students for delete to authenticated
  using ( email = (select auth.jwt()->>'email') );