/**
 * Chart-ready series for leadership dashboards. Combines live `institutionAnalytics`
 * outputs with **dummy** trend / heatmap padding until Firestore rollups exist (JOB-019+).
 */

import { institutionAnalytics } from "@/services/institutionAnalytics";

type Univ = ReturnType<typeof institutionAnalytics.universityOverview>;
type Fac = ReturnType<typeof institutionAnalytics.facultyOverview>;
type Dept = ReturnType<typeof institutionAnalytics.departmentOverview>;

export type BarDatum = { label: string; value: number; subtitle?: string };

/** Faculty attendance bars — uses real averages from overview when present */
export function adminFacultyBars(overview: Univ): BarDatum[] {
  return overview.facultyPerformance.map((f) => ({
    label: f.facultyName,
    value: Math.round(f.avgAttendance * 1000) / 10,
    subtitle: `${f.studentCount} students`,
  }));
}

/** Dummy 14-day trend (% attendance index) — tail anchored to real overall rate */
export function adminAttendanceTrend(overallRate: number): number[] {
  const tail = Math.round(overallRate * 1000) / 10;
  const base = [68, 70, 69, 71, 73, 72, 74, 73, 75, 76, 74, 77, 78, tail];
  return base;
}

/** Synthetic enrolment split by faculty for donut-style bar comparison */
export function adminEnrolmentSplit(overview: Univ): BarDatum[] {
  return overview.facultyPerformance.map((f) => ({
    label: f.facultyName,
    value: Math.max(1, f.studentCount),
    subtitle: `${f.moduleCount} modules`,
  }));
}

export function deanDepartmentBars(f: Fac): BarDatum[] {
  return f.departmentStats.map((d) => ({
    label: d.name.split(" ")[0] ?? d.name,
    value: Math.round(d.avgAttendance * 1000) / 10,
    subtitle: `${d.studentCount} students`,
  }));
}

/** Dummy weekly attendance trend for dean (faculty scope) */
export function deanWeeklyTrend(facultyPct: number): number[] {
  const t = Math.round(facultyPct * 10) / 10;
  return [t - 6, t - 5, t - 4, t - 5, t - 3, t - 2, t - 1, t];
}

/** 7×5 grid intensities 0–1 for heatmap mock */
export function dummyHeatmapMatrix(seed: string): number[][] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  const rows: number[][] = [];
  for (let r = 0; r < 5; r++) {
    const row: number[] = [];
    for (let c = 0; c < 7; c++) {
      h = (h * 31 + r * 7 + c) % 100;
      row.push(0.35 + (h % 65) / 100);
    }
    rows.push(row);
  }
  return rows;
}

export function hodModuleBars(d: Dept): BarDatum[] {
  return d.moduleStats.map((m, i) => ({
    label: m.code,
    value: Math.min(96, 58 + ((m.enrolled + i) * 13) % 38),
    subtitle: `${m.enrolled} enrolled`,
  }));
}

export function hodRiskTrend(deptRate: number): number[] {
  const t = Math.round(deptRate * 100) / 100;
  return [t + 0.08, t + 0.05, t + 0.03, t + 0.02, t, t - 0.02, t - 0.03, t - 0.04];
}
