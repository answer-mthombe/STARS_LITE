import { useMemo } from "react";
import { useRouter } from "expo-router";

import { useDeanData } from "@/hooks/useDeanData";

import {
  AppButton,
  AppCard,
  AppText,
  DividerListRow,
  HighlightStat,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { RoleQuickNav } from "@/components/navigation/RoleQuickNav";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { deanDepartmentBars, deanWeeklyTrend } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { isSupabaseDataSource } from "@/services/dataSource";
import { colors } from "@/theme/colors";

export default function DeanDashboardScreen() {
  useRoleGuard("dean");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const facultyId = user?.role === "dean" ? user.facultyId : "";
  const faculty = useMemo(() => mockDB.read("faculties", facultyId), [facultyId, v]);
  //const overview = useMemo(() => institutionAnalytics.facultyOverview(user?.facultyId ?? ""), [user]);

   const overview = useMemo(() => {
    mockDB.touch();
    return institutionAnalytics.facultyOverview(facultyId);
  }, [facultyId, v]);

  const { departments, lecturers, loading } = useDeanData(facultyId);
 
  
  const useLive = isSupabaseDataSource();

  const displayDepartments = useLive ? departments : overview.departmentStats;
  const displayLecturers = useLive ? lecturers : overview.lecturerPerformance;
  
  const liveTotalAttendance = displayDepartments.length > 0 
    ? displayDepartments.reduce((acc, d) => {
        // TYPE GUARD: If 'avg_attendance' is in the object, TS knows it's the Live data
        const attendance = 'avg_attendance' in d ? d.avg_attendance : (d.avgAttendance * 100);
        return acc + attendance;
      }, 0) / displayDepartments.length 
    : 0;

  //const previewDeptBars = useMemo(() => deanDepartmentBars(overview).slice(0, 4), [overview]);
 const previewDeptBars = useMemo(() => {
    return displayDepartments.slice(0, 4).map((d: any) => {
      const isLiveType = 'avg_attendance' in d;
      
      // 1. Get the full name
      const fullName = isLiveType ? d.department_name : d.name;
      
      // 2. Mimic the dummy file: Grab just the first word (e.g., "Civil") to prevent the 10-character cutoff
      const shortLabel = fullName.split(" ")[0] ?? fullName;
      
      // 3. Get the correct student count
      const studentCount = isLiveType ? (d.student_count || 0) : (d.studentCount || 0);

      return {
        label: shortLabel, 
        value: isLiveType ? (d.avg_attendance || 0) : (d.avgAttendance * 100),
        // 4. Mimic the dummy file: Pass the subtitle to trigger the built-in chart legend!
        subtitle: `${studentCount} students`
      };
    });
  }, [displayDepartments]);

  const lowPerforming = useLive 
    ? displayDepartments.filter((d: any) => {
        const attendance = 'avg_attendance' in d ? (d.avg_attendance || 0) : (d.avgAttendance * 100);
        return attendance < 50;
      })
    : overview.lowPerformingDepartments;

 // const previewTrend = useMemo(() => deanWeeklyTrend(overview.facultyAttendancePct).slice(-6), [overview]);
 const previewTrend = useMemo(() => {
    if (useLive) {
      // REQUIREMENT: Return only the current live snapshot.
      // Do not return a fake 6-week array if we aren't in mock mode.
      return [liveTotalAttendance];
    }
    return deanWeeklyTrend(overview.facultyAttendancePct).slice(-6);
  }, [useLive, liveTotalAttendance, overview.facultyAttendancePct])

if (loading) {
    return <ScreenShell title="Loading..."><AppText>Loading faculty analytics...</AppText></ScreenShell>;
  }

  return (
    <ScreenShell title="Faculty overview" subtitle={faculty?.facultyName ?? "Faculty"} scroll>
      <AppText variant="body" style={{ marginBottom: 14 }}>
        Analytics scoped to your faculty only — departments, lecturers, and attendance trends under your portfolio.
      </AppText>

      <HighlightStat
        label="Faculty attendance index"
        // value={`${overview.facultyAttendancePct.toFixed(1)}%`}
        // detail={`Active sessions right now: ${overview.activeSessions}`}
        value={useLive ? `${liveTotalAttendance.toFixed(1)}%` : `${overview.facultyAttendancePct.toFixed(1)}%`}
        detail={useLive ? `Departments active: ${displayDepartments.length}` : `Active sessions right now: ${overview.activeSessions}`}
      />

      <AppCard>
        <SectionHeader title="Departments" />
        {/* {overview.departmentStats.map((d) => (
          <DividerListRow
            key={d.departmentId}
            left={d.name}
            right={`${(d.avgAttendance * 100).toFixed(0)}% · ${d.studentCount} students`}
          />
        ))} */}

        {displayDepartments.map((d) => {
          // Check which type of data we are rendering
          const isLiveType = 'avg_attendance' in d;
          
          return (
            <DividerListRow
            key={isLiveType ? d.department_id : d.departmentId}
              left={isLiveType ? d.department_name : d.name}
              right={
                isLiveType 
                  // Safely fallback to 0 if student_count is null/undefined from the DB
                  ? `${(d.avg_attendance || 0).toFixed(0)}% · ${d.student_count || 0} students`
                  : `${(d.avgAttendance * 100).toFixed(0)}% · ${d.studentCount || 0} students`
                          }
            />
          );
        })}
      </AppCard>

      <Spacer size="md" />

      <AppCard>
        <SectionHeader title="Lecturer performance" />
        {/* {overview.lecturerPerformance.map((l) => (
          <Stack key={l.lecturerId} gap="xs" style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(0,98,129,0.25)" }}>
            <AppText variant="bodyStrong">{l.name}</AppText>
            <AppText variant="caption">
              Modules: {l.modulesTaught} · Marks recorded: {l.marksRecorded}
            </AppText>
          </Stack>
        ))} */}

        {displayLecturers.map((l) => {
          // Check which type of data we are rendering
          const isLiveType = 'lecturer_id' in l;

          return (
            <Stack key={isLiveType ? l.lecturer_id : l.lecturerId} gap="xs" style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(0,98,129,0.25)" }}>
              <AppText variant="bodyStrong">{isLiveType ? l.lecturer_name : l.name}</AppText>
              <AppText variant="caption">
                Modules: {isLiveType ? l.modules_taught : l.modulesTaught} · Marks recorded: {isLiveType ? l.marks_recorded : l.marksRecorded}
              </AppText>
            </Stack>
          );
        })}
      </AppCard>

      {/* {overview.lowPerformingDepartments.length > 0 ? (
        <>
          <Spacer size="md" />
          <AppCard>
            <SectionHeader title="Low-performing departments" />
            {overview.lowPerformingDepartments.map((d) => (
              <AppText key={d.departmentId} variant="body" style={{ marginBottom: 4 }}>
                {d.name} — {(d.avgAttendance * 100).toFixed(0)}%
              </AppText>
            ))}
          </AppCard>
        </>
      ) : null} */}
    
      {lowPerforming.length > 0 ? (
        <>
          <Spacer size="md" />
          <AppCard>
            <SectionHeader title="Low-performing departments" />
            {lowPerforming.map((d: any) => {
              const isLiveType = 'avg_attendance' in d;
              return (
                <AppText key={isLiveType ? d.department_id : d.departmentId} variant="body" style={{ marginBottom: 4 }}>
                  {isLiveType ? d.department_name : d.name} — {(isLiveType ? (d.avg_attendance || 0) : (d.avgAttendance * 100)).toFixed(0)}%
                </AppText>
              );
            })}
          </AppCard>
        </>
      ) : null}

      <Spacer size="md" />

      <AppCard>
        <StatsBarChart title="Preview · departments (%)" data={previewDeptBars} />
        <Spacer size="sm" />
        <StatsLineChart title="Preview · faculty trend" points={previewTrend} />
        {useLive && previewTrend.length < 2 && (
      <AppText variant="caption" style={{ color: colors.ink.muted, marginTop: 4 }}>
        Historical trend unavailable (Rollup pending)
      </AppText>
    )}
      </AppCard>

      <Spacer size="md" />

      <AppButton title="Faculty charts (full simulation)" onPress={() => router.push("/dean/analytics")} />

      <Spacer size="lg" />
      <RoleQuickNav role="dean" />
    </ScreenShell>
  );
}
