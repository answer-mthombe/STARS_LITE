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
import { fromRow } from "@/supabase/mappers/idBasedMapper";
import type { ModuleModel } from "@/models/Module";
import type { ModuleDelegationModel } from "@/models/ModuleDelegation";

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