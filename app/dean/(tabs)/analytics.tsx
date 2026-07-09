import { useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useDeanData } from "@/hooks/useDeanData";
import { isSupabaseDataSource } from "@/services/dataSource";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { MockHeatmapGrid } from "@/components/ui/MockHeatmapGrid";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { deanDepartmentBars, deanWeeklyTrend, dummyHeatmapMatrix } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function DeanAnalyticsSimulationScreen() {
  useRoleGuard("dean");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const facultyId = user?.role === "dean" ? user.facultyId : "";
  const v = useMockDbVersionStore((s) => s.version);

  const useLive = isSupabaseDataSource();
  const { departments, loading } = useDeanData(facultyId);

  const overview = useMemo(() => {
    mockDB.touch();
    return institutionAnalytics.facultyOverview(facultyId);
  }, [facultyId, v]);

  const displayDepartments = useLive ? departments : overview.departmentStats;
  const liveTotalAttendance = displayDepartments.length > 0 
        ? displayDepartments.reduce((acc, d: any) => {
        const attendance = 'avg_attendance' in d ? (d.avg_attendance || 0) : (d.avgAttendance * 100);
        return acc + attendance;
      }, 0) / displayDepartments.length 
    : 0;

  //const deptBars = useMemo(() => deanDepartmentBars(overview), [overview]);

   const deptBars = useMemo(() => {
    return displayDepartments.map((d: any) => {
      const isLiveType = 'avg_attendance' in d;
      
      const fullName = isLiveType ? d.department_name : d.name;
      const shortLabel = fullName.split(" ")[0] ?? fullName; // E.g., "Civil"
      const studentCount = isLiveType ? (d.student_count || 0) : (d.studentCount || 0);

      return {
        label: shortLabel,
        value: isLiveType ? (d.avg_attendance || 0) : (d.avgAttendance * 100),
        subtitle: `${studentCount} students` // Triggers the bottom legend safely
      };
    });
  }, [displayDepartments]);

  //const trend = useMemo(() => deanWeeklyTrend(overview.facultyAttendancePct), [overview]);

  const trend = useMemo(() => {
    if (useLive) {
       // REQUIREMENT: Return empty/null or just the current value 
       // rather than projecting a fake 8-week line.
       return [liveTotalAttendance]; 
    }
    return deanWeeklyTrend(overview.facultyAttendancePct);
  }, [useLive, liveTotalAttendance, overview.facultyAttendancePct]);

  
  // const { heatMatrix, heatLabels } = useMemo(() => {
  //   const full = dummyHeatmapMatrix(`dean-${facultyId}`);
  //   const n = Math.min(full.length, Math.max(overview.departmentStats.length, 1));
  //   return {
  //     heatMatrix: full.slice(0, n),
  //     heatLabels: overview.departmentStats.slice(0, n).map((d) => d.name.slice(0, 4)),
  //   };
  // }, [facultyId, overview]);

  const { heatMatrix, heatLabels } = useMemo(() => {
    if (useLive) {
      // REQUIREMENT: Do not show fake data. 
      // Return empty structures so the UI component renders "Empty" or "No Data"
      return { heatMatrix: [], heatLabels: [] };
    }
    
    // Original dummy logic for Mock mode
    const full = dummyHeatmapMatrix(`dean-${facultyId}`);
    const n = Math.min(full.length, Math.max(displayDepartments.length, 1));
    return {
      heatMatrix: full.slice(0, n),
      heatLabels: displayDepartments.slice(0, n).map((d: any) => {
        const isLiveType = 'avg_attendance' in d;
        return (isLiveType ? d.department_name : d.name).slice(0, 4);
      }),
    };
  }, [useLive, facultyId, displayDepartments]);

  if (loading) {
    return <ScreenShell title="Loading..."><Text>Loading analytics...</Text></ScreenShell>;
  }

  return (
    <ScreenShell title="Faculty analytics" subtitle="Charts simulation (scoped to your faculty)" scroll showBack>
      <Text style={{ color: colors.ink.muted, marginBottom: 14, lineHeight: 22 }}>
{useLive 
          ? "Live Supabase data driving department bars and trend anchors. Heatmap remains simulated until rollups exist."
          : "Dummy trends + heatmap; department bars use live averages from the mock DB for your faculty."
        }      </Text>

      <AppCard>
        <StatsBarChart title="Department attendance (%)" data={deptBars} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <StatsLineChart title="8-week faculty attendance trend (index)" points={trend} labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <MockHeatmapGrid title="Department × day heatmap (simulation)" matrix={heatMatrix} rowLabels={heatLabels} />
      </AppCard>

      <View style={{ height: 18 }} />

      <AppButton title="Back to dashboard" onPress={() => router.back()} />
    </ScreenShell>
  );
}
