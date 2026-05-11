import { doc, getDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/app";
import { COLLECTIONS } from "@/firebase/collections";
import { attendanceRecordConverter } from "@/firebase/converters";
import type { AttendanceRecordModel } from "@/models/Attendance";

export async function getAttendanceRecordById(id: string): Promise<AttendanceRecordModel | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.attendanceRecords, id).withConverter(attendanceRecordConverter);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
