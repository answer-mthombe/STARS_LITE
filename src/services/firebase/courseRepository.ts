import { doc, getDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/app";
import { COLLECTIONS } from "@/firebase/collections";
import { courseConverter } from "@/firebase/converters";
import type { CourseModel } from "@/models/Course";

export async function getCourseById(id: string): Promise<CourseModel | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.courses, id).withConverter(courseConverter);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
