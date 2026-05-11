import { doc, getDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/app";
import { COLLECTIONS } from "@/firebase/collections";
import { moduleConverter } from "@/firebase/converters";
import type { ModuleModel } from "@/models/Module";

export async function getModuleById(id: string): Promise<ModuleModel | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.modules, id).withConverter(moduleConverter);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
