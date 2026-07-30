-- ==========================================
-- MIGRATION: 0025_rls_person_read_policies
-- PURPOSE: Allow authenticated users to read their own person records to fetch full names.
-- ==========================================

-- 1. Enable RLS on the remaining identity tables

alter table public.deans enable row level security;
alter table public.hods enable row level security;



-- DEANS
create policy "Deans can read their own record" 
  on public.deans for select to authenticated 
  using ( id IN (select linked_person_id from public.user_profiles where id = auth.uid()) );

-- HODS
create policy "HODs can read their own record" 
  on public.hods for select to authenticated 
  using ( id IN (select linked_person_id from public.user_profiles where id = auth.uid()) );