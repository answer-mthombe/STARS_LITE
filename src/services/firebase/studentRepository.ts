import { doc, getDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/app";
import { COLLECTIONS } from "@/firebase/collections";
import { studentConverter } from "@/firebase/converters";
import type { StudentModel } from "@/models/Student";

export async function getStudentById(id: string): Promise<StudentModel | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.students, id).withConverter(studentConverter);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
