/*import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";
import { fromRow } from "@/supabase/mappers/idBasedMapper";
import type { ModuleModel } from "@/models/Module";

export async function listModulesForTutor(
  studentId: string
): Promise<ModuleModel[]> {
  const client = requireSupabaseClient();

  // Get active delegations
  const { data: delegations, error: delegationError } = await client
    .from(TABLES.moduleDelegations)
    .select("module_id")
    .eq("delegate_student_id", studentId)
    .eq("active", true);

  if (delegationError) {
    throw delegationError;
  }

  if (!delegations || delegations.length === 0) {
    return [];
  }

  const moduleIds = delegations.map((d) => d.module_id);

  // Fetch those modules
  const { data: modules, error: moduleError } = await client
    .from(TABLES.modules)
    .select("*")
    .in("id", moduleIds);

  if (moduleError) {
    throw moduleError;
  }

  return (modules ?? []).map((row) => fromRow(row) as ModuleModel);
}*/











import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";
import { fromRow, toRow } from "@/supabase/mappers/idBasedMapper";
import type { ModuleModel } from "@/models/Module";
import type { ModuleDelegationModel } from "@/models/ModuleDelegation";

// ---------------------------------------------------------------------------
// JOB-026 — Delegation & proxy writes: module_delegations CRUD
// ---------------------------------------------------------------------------

export async function getModuleDelegationById(
  id: string
): Promise<ModuleDelegationModel | null> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.moduleDelegations)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return fromRow<ModuleDelegationModel>(data as Record<string, unknown> | null);
}

/** Create (or re-activate) a delegation row. Caller owns id generation/upsert semantics. */
export async function upsertModuleDelegation(
  input: Partial<ModuleDelegationModel> & { id: string; moduleId: string; delegateStudentId: string }
): Promise<ModuleDelegationModel> {
  const client = requireSupabaseClient();

  const row = toRow<ModuleDelegationModel>({ active: true, ...input } as ModuleDelegationModel);

  const { data, error } = await client
    .from(TABLES.moduleDelegations)
    .upsert(row)
    .select()
    .single();

  if (error) throw error;

  return fromRow<ModuleDelegationModel>(data as Record<string, unknown>) as ModuleDelegationModel;
}

export async function revokeModuleDelegationRow(id: string): Promise<ModuleDelegationModel> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.moduleDelegations)
    .update({ active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return fromRow<ModuleDelegationModel>(data as Record<string, unknown>) as ModuleDelegationModel;
}

/** All active delegations for one delegate, across every module — used for profile sync. */
export async function listActiveDelegationsForStudent(
  studentId: string
): Promise<ModuleDelegationModel[]> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.moduleDelegations)
    .select("*")
    .eq("delegate_student_id", studentId)
    .eq("active", true);

  if (error) throw error;

  return (data ?? []).map((row) => fromRow<ModuleDelegationModel>(row) as ModuleDelegationModel);
}

// added for STORY-401 / JOB-019 tutor start-session fix
export async function listActiveDelegationsForModule(
  moduleId: string
): Promise<ModuleDelegationModel[]> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.moduleDelegations)
    .select("*")
    .eq("module_id", moduleId)
    .eq("active", true);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => fromRow(row) as ModuleDelegationModel);
}

export async function listModulesForTutor(
  studentId: string
): Promise<ModuleModel[]> {
  const client = requireSupabaseClient();

  // Get active delegations
  const { data: delegations, error: delegationError } = await client
    .from(TABLES.moduleDelegations)
    .select("module_id")
    .eq("delegate_student_id", studentId)
    .eq("active", true);

  if (delegationError) {
    throw delegationError;
  }

  if (!delegations || delegations.length === 0) {
    return [];
  }

  const moduleIds = delegations.map((d) => d.module_id);

  // Fetch those modules
  const { data: modules, error: moduleError } = await client
    .from(TABLES.modules)
    .select("*")
    .in("id", moduleIds);

  if (moduleError) {
    throw moduleError;
  }

  return (modules ?? []).map((row) => fromRow(row) as ModuleModel);
}

