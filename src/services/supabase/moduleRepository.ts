import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { ModuleModel } from "@/models/Module";

export async function getModuleById(id: string): Promise<ModuleModel | null> {
  return getRowById<ModuleModel>(TABLES.modules, id);
}
