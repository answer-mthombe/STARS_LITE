import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { TutorTimesheetModel } from "@/models/TutorTimesheet";

function bump() {
  useMockDbVersionStore.getState().bump();
}

export const tutorPayrollService = {
  listPending(tutorStudentId: string): TutorTimesheetModel[] {
    return mockDB
      .list("tutorTimesheets")
      .filter((t) => t.tutorStudentId === tutorStudentId && !t.submitted);
  },

  listSubmitted(tutorStudentId: string): TutorTimesheetModel[] {
    return mockDB
      .list("tutorTimesheets")
      .filter((t) => t.tutorStudentId === tutorStudentId && t.submitted);
  },

  submitTimesheet(timesheetId: string, tutorStudentId: string): void {
    const row = mockDB.read("tutorTimesheets", timesheetId);
    if (!row || row.tutorStudentId !== tutorStudentId) throw new Error("Timesheet not found.");
    mockDB.update("tutorTimesheets", timesheetId, {
      submitted: true,
      submittedAt: new Date().toISOString(),
    });
    bump();
  },

  totalHours(tutorStudentId: string): number {
    return mockDB
      .list("tutorTimesheets")
      .filter((t) => t.tutorStudentId === tutorStudentId)
      .reduce((sum, t) => sum + t.hoursWorked, 0);
  },
};
