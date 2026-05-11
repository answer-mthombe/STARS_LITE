import { doc, getDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/app";
import { COLLECTIONS } from "@/firebase/collections";
import { facultyConverter } from "@/firebase/converters";
import type { FacultyModel } from "@/models/Faculty";

export async function getFacultyById(id: string): Promise<FacultyModel | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.faculties, id).withConverter(facultyConverter);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
