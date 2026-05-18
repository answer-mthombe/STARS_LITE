import type { StudentModel } from "@/models/Student";

const PREFIX = "MUT:";

/** Barcode payload printed on MUT student cards (Code128 / QR compatible) */
export function studentCardBarcodeValue(student: Pick<StudentModel, "studentNumber" | "cardBarcode">): string {
  return student.cardBarcode?.trim() || `${PREFIX}${student.studentNumber.trim()}`;
}

export function parseStudentCardBarcode(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  if (t.startsWith(PREFIX)) return t.slice(PREFIX.length);
  if (/^\d{6,10}$/.test(t)) return t;
  return null;
}

export function findStudentByBarcode(
  students: StudentModel[],
  scanned: string
): StudentModel | null {
  const num = parseStudentCardBarcode(scanned);
  if (!num) return null;
  return (
    students.find((s) => s.studentNumber === num) ??
    students.find((s) => studentCardBarcodeValue(s).toUpperCase() === scanned.trim().toUpperCase()) ??
    null
  );
}
