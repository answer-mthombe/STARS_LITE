import { doc, getDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/app";
import { COLLECTIONS } from "@/firebase/collections";
import { lecturerConverter } from "@/firebase/converters";
import type { LecturerModel } from "@/models/Lecturer";

export async function getLecturerById(id: string): Promise<LecturerModel | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.lecturers, id).withConverter(lecturerConverter);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
