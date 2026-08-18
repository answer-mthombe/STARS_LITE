import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";
import { fromRow, toRow } from "@/supabase/mappers/idBasedMapper";
import type { ProxyAssignmentModel, ProxyScope } from "@/models/ProxyAssignment";

/**
 * JOB-026 — Supabase-backed CRUD for `proxy_assignments`.
 * Mirrors the shape of `moduleDelegationRepository.ts` so `delegationService`
 * can branch on `getDataSource()` the same way it does for delegations.
 */

export async function listProxyAssignments(
  scope?: { scope: ProxyScope; scopeId: string }
): Promise<ProxyAssignmentModel[]> {
  const client = requireSupabaseClient();

  let query = client.from(TABLES.proxyAssignments).select("*");
  if (scope) {
    query = query.eq("scope", scope.scope).eq("scope_id", scope.scopeId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => fromRow<ProxyAssignmentModel>(row) as ProxyAssignmentModel);
}

export async function listActiveProxiesForPerson(
  granteePersonId: string
): Promise<ProxyAssignmentModel[]> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.proxyAssignments)
    .select("*")
    .eq("grantee_person_id", granteePersonId)
    .eq("active", true);

  if (error) throw error;

  return (data ?? []).map((row) => fromRow<ProxyAssignmentModel>(row) as ProxyAssignmentModel);
}

export async function getProxyAssignmentById(id: string): Promise<ProxyAssignmentModel | null> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.proxyAssignments)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return fromRow<ProxyAssignmentModel>(data as Record<string, unknown> | null);
}

export async function createProxyAssignment(
  input: Omit<ProxyAssignmentModel, "id" | "createdAt" | "active" | "updatedAt">
): Promise<ProxyAssignmentModel> {
  const client = requireSupabaseClient();

  const id = `proxy_${Date.now()}`;
  const row = toRow<ProxyAssignmentModel>({
    id,
    ...input,
    active: true,
  } as ProxyAssignmentModel);

  const { data, error } = await client
    .from(TABLES.proxyAssignments)
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  return fromRow<ProxyAssignmentModel>(data as Record<string, unknown>) as ProxyAssignmentModel;
}

export async function deactivateProxyAssignment(id: string): Promise<ProxyAssignmentModel> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.proxyAssignments)
    .update({ active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return fromRow<ProxyAssignmentModel>(data as Record<string, unknown>) as ProxyAssignmentModel;
}
