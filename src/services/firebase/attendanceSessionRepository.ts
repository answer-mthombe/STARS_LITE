import { doc, getDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/app";
import { COLLECTIONS } from "@/firebase/collections";
import { attendanceSessionConverter } from "@/firebase/converters";
import type { AttendanceSessionModel } from "@/models/Attendance";

export async function getAttendanceSessionById(id: string): Promise<AttendanceSessionModel | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.attendanceSessions, id).withConverter(attendanceSessionConverter);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
